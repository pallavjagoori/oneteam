// Browser media fakes need several small classes that mirror the real APIs.
/* eslint-disable max-classes-per-file, class-methods-use-this */
import Cookies from 'js-cookie';
import WhatsappCallsAPI from 'dashboard/api/channel/whatsapp/whatsappCallsAPI';
import { remuxWebmToOgg } from 'dashboard/components/widgets/WootWriter/utils/webmOpusToOgg';
import {
  applyOutboundAnswer,
  armOutboundRecorder,
  cleanupWhatsappSession,
  handleWhatsappRemoteEnd,
  hasActiveWhatsappCall,
  isLocalWhatsappCall,
  sendWhatsappTerminateBeacon,
  setWhatsappCallMuted,
  useWhatsappCallSession,
} from '../useWhatsappCallSession';

/*
 * OneTeam coverage for the WhatsApp call session. jsdom has no WebRTC or
 * Web Audio, so small fakes stand in for RTCPeerConnection, MediaStream,
 * AudioContext and MediaRecorder; each records what the session asked of
 * it. The session keeps module-level state, so every test ends with
 * cleanupWhatsappSession().
 */
vi.mock('dashboard/api/channel/whatsapp/whatsappCallsAPI', () => ({
  default: {
    show: vi.fn(),
    accept: vi.fn(),
    reject: vi.fn(),
    initiate: vi.fn(),
    terminate: vi.fn(),
    uploadRecording: vi.fn(),
  },
}));
vi.mock('dashboard/components/widgets/WootWriter/utils/webmOpusToOgg', () => ({
  remuxWebmToOgg: vi.fn(),
}));
vi.mock('js-cookie', () => ({ default: { get: vi.fn() } }));

const fakes = vi.hoisted(() => ({ peers: [], recorders: [], contexts: [] }));

class FakeTrack {
  constructor(kind = 'audio') {
    this.kind = kind;
    this.enabled = true;
    this.stop = vi.fn();
  }
}

class FakeMediaStream {
  constructor(tracks = []) {
    this.tracks = [...tracks];
  }

  addTrack(track) {
    this.tracks.push(track);
  }

  getTracks() {
    return this.tracks;
  }

  getAudioTracks() {
    return this.tracks.filter(track => track.kind === 'audio');
  }
}

class FakePeerConnection {
  constructor(config) {
    this.config = config;
    this.iceGatheringState = 'complete';
    this.listeners = {};
    this.localDescription = null;
    this.addTrack = vi.fn();
    this.close = vi.fn();
    this.setRemoteDescription = vi.fn(async () => {});
    fakes.peers.push(this);
  }

  async createAnswer() {
    return { type: 'answer', sdp: 'answer-sdp' };
  }

  async createOffer() {
    return { type: 'offer', sdp: 'offer-sdp' };
  }

  async setLocalDescription(description) {
    this.localDescription = description;
  }

  addEventListener(name, handler) {
    this.listeners[name] = handler;
  }
}

class FakeAudioContext {
  constructor() {
    this.state = 'running';
    this.resume = vi.fn(() => Promise.reject(new Error('autoplay')));
    this.close = vi.fn(() => Promise.reject(new Error('closed')));
    fakes.contexts.push(this);
  }

  createMediaStreamDestination() {
    return { stream: new FakeMediaStream() };
  }

  createMediaStreamSource() {
    return { connect: vi.fn() };
  }
}

class FakeMediaRecorder {
  static supported = ['audio/webm;codecs=opus'];

  static isTypeSupported(type) {
    return FakeMediaRecorder.supported.includes(type);
  }

  constructor(stream, options) {
    this.options = options;
    this.state = 'inactive';
    this.listeners = {};
    fakes.recorders.push(this);
  }

  start() {
    this.state = 'recording';
  }

  stop() {
    if (this.throwOnStop) throw new Error('already stopped');
    this.state = 'inactive';
    if (this.chunk) this.ondataavailable({ data: this.chunk });
    this.listeners.stop?.();
  }

  addEventListener(name, handler) {
    this.listeners[name] = handler;
  }
}

const micStream = () => new FakeMediaStream([new FakeTrack()]);

const answerTrack = () => {
  const peer = fakes.peers.at(-1);
  const track = new FakeTrack();
  peer.ontrack({ streams: [new FakeMediaStream([track])] });
  return track;
};

describe('useWhatsappCallSession (OneTeam)', () => {
  let session;

  beforeEach(() => {
    fakes.peers.length = 0;
    fakes.recorders.length = 0;
    fakes.contexts.length = 0;
    FakeMediaRecorder.supported = ['audio/webm;codecs=opus'];
    vi.stubGlobal('RTCPeerConnection', FakePeerConnection);
    vi.stubGlobal('MediaStream', FakeMediaStream);
    vi.stubGlobal('AudioContext', FakeAudioContext);
    vi.stubGlobal('MediaRecorder', FakeMediaRecorder);
    vi.stubGlobal('navigator', {
      mediaDevices: { getUserMedia: vi.fn(async () => micStream()) },
    });
    window.HTMLMediaElement.prototype.play = vi.fn(() => Promise.resolve());
    WhatsappCallsAPI.terminate.mockResolvedValue({});
    session = useWhatsappCallSession();
  });

  afterEach(() => {
    cleanupWhatsappSession();
    vi.unstubAllGlobals();
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  describe('accepting an incoming call', () => {
    it('answers with the local SDP, plays the contact and records the call', async () => {
      await session.acceptIncomingCall({
        callId: 7,
        sdpOffer: 'offer',
        iceServers: [{ urls: 'stun:x' }],
      });
      const [peer] = fakes.peers;
      expect(peer.config).toEqual({ iceServers: [{ urls: 'stun:x' }] });
      expect(peer.setRemoteDescription).toHaveBeenCalledWith({
        type: 'offer',
        sdp: 'offer',
      });
      expect(WhatsappCallsAPI.accept).toHaveBeenCalledWith(7, 'answer-sdp');
      expect(hasActiveWhatsappCall()).toBe(true);
      expect(isLocalWhatsappCall(7)).toBe(true);
      expect(isLocalWhatsappCall(8)).toBe(false);

      answerTrack();
      const repeated = new FakeTrack();
      const stream = new FakeMediaStream([repeated]);
      peer.ontrack({ streams: [stream] });
      peer.ontrack({ streams: [stream] });
      const audio = document.getElementById('whatsapp-call-remote-audio');
      expect(audio.srcObject.getTracks()).toHaveLength(2);
      expect(fakes.recorders).toHaveLength(1);
      expect(fakes.recorders[0].options).toEqual({
        mimeType: 'audio/webm;codecs=opus',
        audioBitsPerSecond: 48000,
      });
    });

    it('fetches the offer when the store does not have it yet', async () => {
      WhatsappCallsAPI.show.mockResolvedValue({
        sdp_offer: 'fresh',
        ice_servers: [],
        recording_enabled: false,
      });
      await session.acceptIncomingCall({ callId: 7 });
      expect(fakes.peers[0].config).toEqual({});
      answerTrack();
      expect(fakes.recorders).toHaveLength(0);
    });

    it('reads camel-cased call data too', async () => {
      WhatsappCallsAPI.show.mockResolvedValue({
        sdpOffer: 'fresh',
        iceServers: [{ urls: 'turn:x' }],
      });
      await session.acceptIncomingCall({ callId: 7 });
      expect(fakes.peers[0].config.iceServers).toEqual([{ urls: 'turn:x' }]);
    });

    it('fails clearly when no offer can be found', async () => {
      // eslint-disable-next-line no-console
      const log = vi.spyOn(console, 'error').mockImplementation(() => {});
      WhatsappCallsAPI.show.mockRejectedValue(new Error('gone'));
      await expect(session.acceptIncomingCall({ callId: 7 })).rejects.toThrow(
        'Missing sdp_offer'
      );
      await expect(session.acceptIncomingCall({})).rejects.toThrow(
        'Missing sdp_offer'
      );
      expect(log).toHaveBeenCalled();
      log.mockRestore();
    });

    it('releases the microphone when the accept request fails', async () => {
      WhatsappCallsAPI.accept.mockRejectedValue(new Error('expired'));
      await expect(
        session.acceptIncomingCall({ callId: 7, sdpOffer: 'offer' })
      ).rejects.toThrow('expired');
      expect(fakes.peers[0].close).toHaveBeenCalled();
      expect(hasActiveWhatsappCall()).toBe(false);
    });

    it('waits for ICE gathering, giving up after the timeout', async () => {
      vi.useFakeTimers();
      const original = FakePeerConnection.prototype.setLocalDescription;
      FakePeerConnection.prototype.setLocalDescription = async function gather(
        description
      ) {
        this.localDescription = description;
        this.iceGatheringState = 'gathering';
      };
      const answer = session.prepareInboundAnswer('offer');
      await vi.advanceTimersByTimeAsync(0);
      const peer = fakes.peers[0];
      peer.listeners.icegatheringstatechange();
      peer.iceGatheringState = 'complete';
      peer.listeners.icegatheringstatechange();
      await expect(answer).resolves.toBe('answer-sdp');

      const offer = session.prepareOutboundOffer();
      await vi.advanceTimersByTimeAsync(10000);
      await expect(offer).resolves.toBe('offer-sdp');
      FakePeerConnection.prototype.setLocalDescription = original;
    });
  });

  it('rejects a call and cleans up even if the request fails', async () => {
    WhatsappCallsAPI.reject.mockRejectedValue(new Error('x'));
    await expect(session.rejectIncomingCall(7)).rejects.toThrow('x');
    expect(hasActiveWhatsappCall()).toBe(false);
  });

  describe('outbound calls', () => {
    it('places a call with STUN and applies an answer that arrived early', async () => {
      WhatsappCallsAPI.initiate.mockImplementation(async () => {
        await applyOutboundAnswer(9, 'early-answer');
        await applyOutboundAnswer(10, 'other-agent');
        return { id: 9 };
      });
      await expect(
        session.initiateOutboundCall({ conversationId: 1 })
      ).resolves.toEqual({
        id: 9,
      });
      const [peer] = fakes.peers;
      expect(peer.config.iceServers[0].urls).toContain('stun:');
      expect(WhatsappCallsAPI.initiate).toHaveBeenCalledWith(
        { conversationId: 1 },
        'offer-sdp'
      );
      expect(peer.setRemoteDescription).toHaveBeenCalledWith({
        type: 'answer',
        sdp: 'early-answer',
      });
      expect(session.isInitiating.value).toBe(false);
    });

    it('applies a later answer only for its own call', async () => {
      WhatsappCallsAPI.initiate.mockResolvedValue({ id: 9 });
      await session.initiateOutboundCall({ conversationId: 1 });
      const [peer] = fakes.peers;
      await applyOutboundAnswer(10, 'not-ours');
      await applyOutboundAnswer(9, 'ours');
      expect(peer.setRemoteDescription.mock.calls).toEqual([
        [{ type: 'answer', sdp: 'ours' }],
      ]);
    });

    it('ignores answers when no call is being set up', async () => {
      await expect(applyOutboundAnswer(1, 'x')).resolves.toBeUndefined();
    });

    it('refuses a second call while one is starting or live', async () => {
      let finish;
      WhatsappCallsAPI.initiate.mockReturnValue(
        new Promise(resolve => {
          finish = resolve;
        })
      );
      const first = session.initiateOutboundCall({ conversationId: 1 });
      await expect(
        session.initiateOutboundCall({ conversationId: 1 })
      ).resolves.toEqual({ status: 'locked' });
      finish({ id: 3 });
      await first;
      await expect(
        session.initiateOutboundCall({ conversationId: 1 })
      ).resolves.toEqual({ status: 'locked' });
    });

    it('releases the microphone when the contact must opt in first', async () => {
      WhatsappCallsAPI.initiate.mockResolvedValueOnce({
        status: 'permission_requested',
      });
      await session.initiateOutboundCall({ contactId: 1, inboxId: 2 });
      expect(hasActiveWhatsappCall()).toBe(false);
    });

    it.each(['permission_requested', 'permission_pending'])(
      'turns a 422 %s into a normal answer',
      async status => {
        WhatsappCallsAPI.initiate.mockRejectedValue({
          response: { data: { status, conversation_id: 4 } },
        });
        await expect(
          session.initiateOutboundCall({ contactId: 1, inboxId: 2 })
        ).resolves.toEqual({ status, conversation_id: 4 });
      }
    );

    it('rethrows other failures', async () => {
      WhatsappCallsAPI.initiate.mockRejectedValue(new Error('down'));
      await expect(
        session.initiateOutboundCall({ conversationId: 1 })
      ).rejects.toThrow('down');
    });

    it('starts recording only once the contact picks up', async () => {
      WhatsappCallsAPI.initiate.mockResolvedValue({
        id: 9,
        recording_enabled: true,
      });
      await session.initiateOutboundCall({ conversationId: 1 });
      answerTrack();
      expect(fakes.recorders).toHaveLength(0);
      armOutboundRecorder();
      expect(fakes.recorders).toHaveLength(1);
      armOutboundRecorder();
      expect(fakes.recorders).toHaveLength(1);
    });

    it('waits for the contact audio before recording', async () => {
      WhatsappCallsAPI.initiate.mockResolvedValue({ id: 9 });
      await session.initiateOutboundCall({ conversationId: 1 });
      armOutboundRecorder();
      fakes.peers[0].ontrack({ track: new FakeTrack('video') });
      expect(fakes.recorders).toHaveLength(0);
    });

    it('skips recording when the browser supports no audio format', async () => {
      FakeMediaRecorder.supported = [];
      WhatsappCallsAPI.initiate.mockResolvedValue({ id: 9 });
      await session.initiateOutboundCall({ conversationId: 1 });
      armOutboundRecorder();
      answerTrack();
      expect(fakes.recorders).toHaveLength(0);
    });
  });

  describe('ending a call', () => {
    const recordCall = async () => {
      WhatsappCallsAPI.initiate.mockResolvedValue({ id: 9 });
      await session.initiateOutboundCall({ conversationId: 1 });
      armOutboundRecorder();
      answerTrack();
      return fakes.recorders[0];
    };

    it('terminates, then uploads the recording as OGG', async () => {
      const recorder = await recordCall();
      recorder.chunk = new Blob(['a'], { type: 'audio/webm' });
      recorder.ondataavailable({ data: new Blob([]) });
      remuxWebmToOgg.mockResolvedValue(new Blob(['o'], { type: 'audio/ogg' }));
      WhatsappCallsAPI.terminate.mockRejectedValue(new Error('already ended'));
      WhatsappCallsAPI.uploadRecording.mockRejectedValue(new Error('x'));
      await session.endActiveCall();
      expect(WhatsappCallsAPI.terminate).toHaveBeenCalledWith(9);
      expect(WhatsappCallsAPI.uploadRecording).toHaveBeenCalledWith(
        9,
        expect.any(Blob),
        'call-recording.ogg'
      );
      expect(fakes.contexts[0].close).toHaveBeenCalled();
      expect(hasActiveWhatsappCall()).toBe(false);
    });

    it('uploads the raw WebM when remuxing fails', async () => {
      const recorder = await recordCall();
      recorder.chunk = new Blob(['a'], { type: 'audio/webm' });
      remuxWebmToOgg.mockRejectedValue(new Error('bad file'));
      await session.endActiveCall();
      expect(WhatsappCallsAPI.uploadRecording).toHaveBeenCalledWith(
        9,
        expect.any(Blob),
        'call-recording.webm'
      );
    });

    it('uploads an OGG recording as is', async () => {
      const recorder = await recordCall();
      recorder.chunk = new Blob(['a'], { type: 'audio/ogg' });
      await session.endActiveCall();
      expect(remuxWebmToOgg).not.toHaveBeenCalled();
      expect(WhatsappCallsAPI.uploadRecording.mock.calls[0][2]).toBe(
        'call-recording.ogg'
      );
    });

    it('does not upload when nothing was recorded', async () => {
      const recorder = await recordCall();
      recorder.throwOnStop = true;
      await session.endActiveCall();
      expect(WhatsappCallsAPI.uploadRecording).not.toHaveBeenCalled();
    });

    it('terminates by the store call id after a local reset', async () => {
      await session.endActiveCall(12);
      expect(WhatsappCallsAPI.terminate).toHaveBeenCalledWith(12);
      await session.endActiveCall();
      expect(WhatsappCallsAPI.terminate).toHaveBeenCalledTimes(1);
    });

    it('saves the recording when the contact hangs up', async () => {
      const recorder = await recordCall();
      recorder.chunk = new Blob(['a'], { type: 'audio/ogg' });
      await handleWhatsappRemoteEnd();
      expect(WhatsappCallsAPI.uploadRecording).toHaveBeenCalled();
      await handleWhatsappRemoteEnd();
      await handleWhatsappRemoteEnd(5);
      expect(WhatsappCallsAPI.uploadRecording).toHaveBeenCalledTimes(1);
    });

    it('cleans up a recorder that refuses to stop', async () => {
      const recorder = await recordCall();
      recorder.throwOnStop = true;
      expect(() => cleanupWhatsappSession()).not.toThrow();
    });
  });

  it('mutes and unmutes the microphone of a live call', async () => {
    expect(setWhatsappCallMuted(true)).toBe(false);
    await session.acceptIncomingCall({ callId: 7, sdpOffer: 'offer' });
    expect(setWhatsappCallMuted(true)).toBe(true);
    expect(setWhatsappCallMuted(false)).toBe(false);
  });

  it('logs when the browser blocks remote audio', async () => {
    // eslint-disable-next-line no-console
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    window.HTMLMediaElement.prototype.play = vi.fn(() =>
      Promise.reject(new Error('blocked'))
    );
    await session.acceptIncomingCall({ callId: 7, sdpOffer: 'offer' });
    answerTrack();
    await Promise.resolve();
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  describe('terminate beacon on page close', () => {
    let location;

    const live = async () => {
      await session.acceptIncomingCall({ callId: 7, sdpOffer: 'offer' });
    };

    beforeEach(() => {
      location = window.location;
      delete window.location;
      window.location = { pathname: '/app/accounts/3/conversations/1' };
      vi.stubGlobal(
        'fetch',
        vi.fn(() => Promise.reject(new Error('aborted')))
      );
    });

    afterEach(() => {
      window.location = location;
    });

    it('sends an authenticated terminate for the live call', async () => {
      Cookies.get.mockReturnValue(
        JSON.stringify({ 'access-token': 't', client: 'c', uid: 'u' })
      );
      sendWhatsappTerminateBeacon();
      expect(fetch).not.toHaveBeenCalled();
      await live();
      sendWhatsappTerminateBeacon();
      expect(fetch).toHaveBeenCalledWith(
        '/api/v1/accounts/3/whatsapp_calls/7/terminate',
        expect.objectContaining({
          method: 'POST',
          keepalive: true,
          headers: expect.objectContaining({
            'access-token': 't',
            'token-type': 'Bearer',
            expiry: '',
          }),
        })
      );
    });

    it('fills in auth headers from a full session cookie', async () => {
      Cookies.get.mockReturnValue(
        JSON.stringify({
          'access-token': 't',
          client: 'c',
          uid: 'u',
          expiry: '1',
          'token-type': 'Custom',
        })
      );
      await live();
      sendWhatsappTerminateBeacon();
      expect(fetch.mock.calls[0][1].headers['token-type']).toBe('Custom');
    });

    it('skips the beacon without a session, a bad cookie or an account', async () => {
      await live();
      Cookies.get.mockReturnValueOnce(undefined);
      sendWhatsappTerminateBeacon();
      Cookies.get.mockReturnValueOnce('{bad json');
      sendWhatsappTerminateBeacon();
      Cookies.get.mockReturnValue(JSON.stringify({}));
      window.location = { pathname: '/app' };
      sendWhatsappTerminateBeacon();
      expect(fetch).not.toHaveBeenCalled();
    });

    it('survives fetch throwing synchronously', async () => {
      Cookies.get.mockReturnValue(JSON.stringify({}));
      fetch.mockImplementation(() => {
        throw new Error('no fetch');
      });
      await live();
      expect(() => sendWhatsappTerminateBeacon()).not.toThrow();
    });
  });
});
