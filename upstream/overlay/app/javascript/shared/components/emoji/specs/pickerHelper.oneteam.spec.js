/**
 * OneTeam spec for the emoji picker helpers: search, recently used emojis
 * and the hover tint sampled from each emoji.
 */
import emojiGroups from 'shared/components/emoji/emojisGroup.json';
import {
  buildEmojiSections,
  getEmojiTint,
  getRecentEmojis,
  addRecentEmoji,
} from '../pickerHelper';

const RECENT_KEY = 'emoji-icon-picker.recent-emojis';
const rocket = { emoji: '🚀', name: 'rocket', slug: 'rocket' };
const smile = { emoji: '😀', name: 'grinning face', slug: 'grinning_face' };

describe('buildEmojiSections', () => {
  it('lists every group, with recent emojis first when there are some', () => {
    expect(buildEmojiSections('', [], 'Frequent')).toEqual(emojiGroups);
    const sections = buildEmojiSections('  ', [rocket], 'Frequent');
    expect(sections[0]).toEqual({ name: 'Frequent', emojis: [rocket] });
    expect(sections).toHaveLength(emojiGroups.length + 1);
  });

  it('searches names and slugs, case-insensitively, dropping empty groups', () => {
    const sections = buildEmojiSections(' ROCKET ', [rocket], 'Frequent');
    expect(sections).toEqual([{ name: 'Travel & Places', emojis: [rocket] }]);
    const bySlug = buildEmojiSections('grinning face', [], 'Frequent');
    expect(bySlug[0].emojis).toContainEqual(smile);
    expect(buildEmojiSections('no-such-emoji', [], 'Frequent')).toEqual([]);
  });
});

describe('recent emojis', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => vi.restoreAllMocks());

  it('reads an empty list, a stored list, or recovers from bad data', () => {
    expect(getRecentEmojis()).toEqual([]);
    localStorage.setItem(RECENT_KEY, JSON.stringify([rocket]));
    expect(getRecentEmojis()).toEqual([rocket]);
    localStorage.setItem(RECENT_KEY, JSON.stringify({ not: 'a list' }));
    expect(getRecentEmojis()).toEqual([]);
    localStorage.setItem(RECENT_KEY, '{broken');
    expect(getRecentEmojis()).toEqual([]);
  });

  it('puts the newest first, without duplicates, keeping sixteen', () => {
    addRecentEmoji(rocket);
    expect(addRecentEmoji(smile)).toEqual([smile, rocket]);
    expect(addRecentEmoji(rocket)).toEqual([rocket, smile]);
    for (let i = 0; i < 20; i += 1) {
      addRecentEmoji({ emoji: 'x', name: `e${i}`, slug: `e${i}` });
    }
    const recents = getRecentEmojis();
    expect(recents).toHaveLength(16);
    expect(recents[0].slug).toBe('e19');
  });

  it('still returns the list when storage refuses to save it', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });
    expect(addRecentEmoji(rocket)).toEqual([rocket]);
  });
});

describe('getEmojiTint', () => {
  const NEUTRAL = 'rgb(var(--slate-9) / 0.12)';
  // A 16x16 canvas whose pixels the test controls.
  const fakeCanvas = pixel => {
    const data = new Uint8ClampedArray(16 * 16 * 4);
    if (pixel) {
      data.set(pixel, 0);
      data.set([0, 0, 0, 10], 4); // nearly transparent: ignored
    }
    const ctx = {
      fillText: vi.fn(),
      getImageData: () => ({ data }),
    };
    return { getContext: () => ctx };
  };

  afterEach(() => vi.restoreAllMocks());

  const withCanvas = canvas => {
    const create = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation(tag =>
      tag === 'canvas' ? canvas : create(tag)
    );
  };

  it('averages the visible pixels into a translucent tint, once per emoji', () => {
    withCanvas(fakeCanvas([200, 100, 50, 255]));
    expect(getEmojiTint('🍊')).toBe('rgba(200, 100, 50, 0.16)');
    withCanvas(fakeCanvas([0, 0, 0, 255]));
    expect(getEmojiTint('🍊')).toBe('rgba(200, 100, 50, 0.16)');
  });

  it('uses a neutral tint for a blank emoji or when canvas fails', () => {
    withCanvas(fakeCanvas(null));
    expect(getEmojiTint('⬜')).toBe(NEUTRAL);
    withCanvas({
      getContext: () => {
        throw new Error('no canvas');
      },
    });
    expect(getEmojiTint('🫥')).toBe(NEUTRAL);
  });
});
