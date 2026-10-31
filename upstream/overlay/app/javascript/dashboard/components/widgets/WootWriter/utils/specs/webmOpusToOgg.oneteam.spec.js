/* eslint-disable no-bitwise */
/**
 * OneTeam specs for the WebM to OGG remuxer used for WhatsApp voice notes.
 * The tests build small WebM files byte by byte (EBML elements), remux them
 * and read the OGG pages back.
 */
import { remuxWebmToOgg } from '../webmOpusToOgg';

// Browsers give Blob an arrayBuffer() method; jsdom's Blob lacks it.
if (!Blob.prototype.arrayBuffer) {
  // eslint-disable-next-line func-names
  Blob.prototype.arrayBuffer = function () {
    return new Promise(resolve => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.readAsArrayBuffer(this);
    });
  };
}

// ---- WebM (EBML) builders ----
const idBytes = id => {
  const bytes = [];
  let value = id;
  while (value > 0) {
    bytes.unshift(value & 0xff);
    value = Math.floor(value / 256);
  }
  return bytes;
};
const sizeBytes = size =>
  size < 127 ? [0x80 | size] : [0x40 | (size >> 8), size & 0xff];
const element = (id, payload) => [
  ...idBytes(id),
  ...sizeBytes(payload.length),
  ...payload,
];
const unknownSizeElement = (id, payload) => [...idBytes(id), 0xff, ...payload];
const float32 = value => {
  const view = new DataView(new ArrayBuffer(4));
  view.setFloat32(0, value);
  return [...new Uint8Array(view.buffer)];
};
const float64 = value => {
  const view = new DataView(new ArrayBuffer(8));
  view.setFloat64(0, value);
  return [...new Uint8Array(view.buffer)];
};
const opusHead = preSkip => {
  const bytes = [
    ...new TextEncoder().encode('OpusHead'),
    1,
    2,
    preSkip & 0xff,
    preSkip >> 8,
  ];
  return [...bytes, 0x80, 0xbb, 0, 0, 0, 0, 0];
};
// SimpleBlock: track 1, timecode 0, flags, then the Opus packet.
const simpleBlock = (packet, flags = 0x80) =>
  element(0xa3, [0x81, 0, 0, flags, ...packet]);

const ID = {
  EBML: 0x1a45dfa3,
  Segment: 0x18538067,
  Tracks: 0x1654ae6b,
  TrackEntry: 0xae,
  CodecPrivate: 0x63a2,
  Audio: 0xe1,
  SamplingFrequency: 0xb5,
  Channels: 0x9f,
  Cluster: 0x1f43b675,
  Timecode: 0xe7,
  BlockGroup: 0xa0,
  Block: 0xa1,
  Void: 0xec,
};

const webm = ({
  samplingFrequency = float32(48000),
  codecPrivate = opusHead(3840),
  blocks,
}) =>
  new Blob([
    new Uint8Array([
      ...element(ID.EBML, []),
      ...unknownSizeElement(ID.Segment, [
        ...element(ID.Tracks, [
          ...element(ID.TrackEntry, [
            ...element(ID.CodecPrivate, codecPrivate),
            ...element(ID.Audio, [
              ...element(ID.SamplingFrequency, samplingFrequency),
              ...element(ID.Channels, [2]),
            ]),
          ]),
        ]),
        ...element(ID.Void, [0, 0]),
        ...unknownSizeElement(ID.Cluster, [
          ...element(ID.Timecode, [0]),
          ...blocks.flat(),
        ]),
      ]),
    ]),
  ]);

// ---- OGG reader ----
const readPages = async blob => {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  const view = new DataView(bytes.buffer);
  const pages = [];
  let pos = 0;
  while (pos < bytes.length) {
    const segments = bytes[pos + 26];
    const table = [...bytes.slice(pos + 27, pos + 27 + segments)];
    const bodyLength = table.reduce((sum, n) => sum + n, 0);
    const start = pos + 27 + segments;
    pages.push({
      capture: new TextDecoder().decode(bytes.slice(pos, pos + 4)),
      headerType: bytes[pos + 5],
      granule: view.getUint32(pos + 6, true),
      sequence: view.getUint32(pos + 18, true),
      segments: table,
      body: bytes.slice(start, start + bodyLength),
    });
    pos = start + bodyLength;
  }
  return pages;
};

describe('remuxWebmToOgg', () => {
  it('turns a WebM recording into OGG pages with the Opus header and tags', async () => {
    const blob = webm({
      blocks: [simpleBlock([0x08, 1, 2]), simpleBlock([0x09, 3])],
    });

    const ogg = await remuxWebmToOgg(blob);
    const pages = await readPages(ogg);

    expect(ogg.type).toBe('audio/ogg');
    expect(pages.map(page => page.capture)).toEqual(['OggS', 'OggS', 'OggS']);
    expect(pages.map(page => page.sequence)).toEqual([0, 1, 2]);
    expect(pages.map(page => page.headerType)).toEqual([0x02, 0x00, 0x04]);

    const head = pages[0].body;
    const headView = new DataView(head.buffer, head.byteOffset);
    expect(new TextDecoder().decode(head.slice(0, 8))).toBe('OpusHead');
    expect(head[9]).toBe(2);
    expect(headView.getUint16(10, true)).toBe(3840);
    expect(headView.getUint32(12, true)).toBe(48000);
    expect(new TextDecoder().decode(pages[1].body.slice(0, 8))).toBe(
      'OpusTags'
    );

    // Config 1 (SILK NB 20 ms) is 960 samples; code 1 means two frames.
    expect(pages[2].granule).toBe(960 + 1920);
    expect([...pages[2].body]).toEqual([0x08, 1, 2, 0x09, 3]);
  });

  it('counts samples for every Opus frame-count code', async () => {
    const blob = webm({
      samplingFrequency: float64(48000),
      blocks: [
        simpleBlock([0x82]), // config 16 (2.5 ms CELT), code 2: two frames
        simpleBlock([0x83, 0x03]), // code 3: frame count in the second byte
        simpleBlock([0x83]), // code 3 without a count byte: one frame
        simpleBlock([0xf8]), // config 31 (20 ms CELT FB), code 0
      ],
    });

    const pages = await readPages(await remuxWebmToOgg(blob));

    expect(pages[2].granule).toBe(240 + 360 + 120 + 960);
  });

  it('keeps the default pre-skip without an OpusHead, and writes rate 0 for an unreadable rate', async () => {
    const blob = webm({
      samplingFrequency: [0xbb, 0x80],
      codecPrivate: [...new TextEncoder().encode('NotOpusX'), 0, 0, 0, 0],
      blocks: [simpleBlock([0x08])],
    });

    const pages = await readPages(await remuxWebmToOgg(blob));
    const head = new DataView(pages[0].body.buffer, pages[0].body.byteOffset);

    expect(head.getUint16(10, true)).toBe(312);
    // A 2-byte float is not valid EBML, so the rate becomes NaN, stored as 0.
    // Players ignore this field (Opus always decodes at 48 kHz).
    expect(head.getUint32(12, true)).toBe(0);
  });

  it('reads frames from Block groups and warns about laced blocks', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const blob = webm({
      blocks: [
        ...element(ID.BlockGroup, [
          ...element(ID.Block, [0x81, 0, 0, 0x02, 0x08, 7]),
        ]),
        ...element(0xa3, [0x81, 0, 0, 0x80]), // a block with no frame data
      ],
    });

    const pages = await readPages(await remuxWebmToOgg(blob));

    expect([...pages[2].body]).toEqual([0x08, 7]);
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('laced SimpleBlock')
    );
  });

  it('splits long recordings into pages of at most 50 packets or 255 segments', async () => {
    const small = Array.from({ length: 60 }, () => simpleBlock([0x08]));
    const smallPages = await readPages(
      await remuxWebmToOgg(webm({ blocks: small.flat() }))
    );
    expect(smallPages.slice(2).map(page => page.segments.length)).toEqual([
      50, 10,
    ]);

    // 300-byte packets take two lacing values each, so 127 fit on a page.
    const large = Array.from({ length: 130 }, () =>
      simpleBlock(new Array(300).fill(0x08))
    );
    const largePages = await readPages(
      await remuxWebmToOgg(webm({ blocks: large.flat() }))
    );
    largePages
      .slice(2)
      .forEach(page => expect(page.segments.length).toBeLessThanOrEqual(255));
    expect(largePages.at(-1).headerType).toBe(0x04);
  });

  it('writes a terminating zero lacing value for 255-byte packets', async () => {
    const pages = await readPages(
      await remuxWebmToOgg(
        webm({ blocks: simpleBlock(new Array(255).fill(0x08)) })
      )
    );

    expect(pages[2].segments).toEqual([255, 0]);
  });

  it('returns OGG input unchanged', async () => {
    const ogg = new Blob([new Uint8Array([0x4f, 0x67, 0x67, 0x53, 0, 1])], {
      type: 'audio/ogg',
    });

    expect(await remuxWebmToOgg(ogg)).toBe(ogg);
  });

  it('rejects input with no Opus frames, including truncated or invalid data', async () => {
    const cases = [
      [],
      [0x00], // an element ID cannot start with a zero byte
      [0x1a, 0x45], // ID cut short
      [0xec, 0x00], // size cannot start with a zero byte
      [0xec, 0x40], // size cut short
      [0x0f, 0x80], // five-byte ID is not valid
      [0xa3, 0x82, 0x00, 0x00], // block whose track number is invalid
    ];
    await Promise.all(
      cases.map(bytes =>
        expect(
          remuxWebmToOgg(new Blob([new Uint8Array(bytes)]))
        ).rejects.toThrow('No Opus frames found in WebM input')
      )
    );
  });
});
