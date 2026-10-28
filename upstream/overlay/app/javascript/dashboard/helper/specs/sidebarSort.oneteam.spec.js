import {
  SIDEBAR_SORT_KEYS,
  getSidebarSortOptions,
  normalizeSidebarSortPreferences,
  resolveSidebarSort,
  sortSidebarItems,
} from '../sidebarSort';

const names = items => items.map(item => item.name);
const labelKey = item => item.name;

describe('sidebarSort (OneTeam)', () => {
  it('uses defaults for missing options and unknown sections', () => {
    expect(getSidebarSortOptions('folders')).toHaveLength(6);
    expect(getSidebarSortOptions('unknown')).toEqual([]);
    expect(resolveSidebarSort('folders', 'alphabetical_desc')).toBe(
      'alphabetical_desc'
    );
    expect(resolveSidebarSort('unknown', 'nope')).toBe('alphabetical_asc');
    expect(normalizeSidebarSortPreferences(null).folders).toBe(
      'created_at_desc'
    );
    expect(normalizeSidebarSortPreferences().labels).toBe('unread_count_desc');
  });

  describe('by creation time', () => {
    const items = [
      { name: 'Num', created_at: 300 },
      { name: 'Iso', createdAt: '1970-01-01T00:00:00.200Z' },
      { name: 'Bad date, id', created_at: 'not a date', id: 100 },
      { name: 'No id' },
      { name: 'Also no id', id: 'x' },
      { name: 'Twin', created_at: 300 },
    ];

    it('sorts newest first, by name on ties', () => {
      expect(
        names(
          sortSidebarItems(items, {
            sortBy: SIDEBAR_SORT_KEYS.CREATED_DESC,
            labelKey,
          })
        )
      ).toEqual(['Num', 'Twin', 'Iso', 'Bad date, id', 'Also no id', 'No id']);
    });

    it('sorts oldest first, by name on ties', () => {
      expect(
        names(
          sortSidebarItems(items, {
            sortBy: SIDEBAR_SORT_KEYS.CREATED_ASC,
            labelKey,
          })
        )
      ).toEqual(['Also no id', 'No id', 'Bad date, id', 'Iso', 'Num', 'Twin']);
    });
  });

  it('sorts by name when labels are missing, and copes with no items', () => {
    expect(
      names(
        sortSidebarItems([{ name: 'b' }, {}, { name: 'A' }], {
          sortBy: SIDEBAR_SORT_KEYS.ALPHABETICAL_ASC,
          labelKey,
        })
      )
    ).toEqual([undefined, 'A', 'b']);
    expect(sortSidebarItems(null, { sortBy: 'x', labelKey })).toEqual([]);
  });

  it('defaults the unread count to zero', () => {
    expect(
      names(
        sortSidebarItems([{ name: 'b' }, { name: 'a' }], {
          sortBy: SIDEBAR_SORT_KEYS.UNREAD_COUNT_DESC,
          labelKey,
        })
      )
    ).toEqual(['a', 'b']);
  });
});
