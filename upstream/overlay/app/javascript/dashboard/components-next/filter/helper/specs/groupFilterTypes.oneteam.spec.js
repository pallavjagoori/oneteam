/**
 * OneTeam spec for groupFilterTypes: filter attributes are split into
 * labelled sections by model, each entry gets an icon, and attributes with
 * an unknown model are kept at the end.
 */
import { groupFilterTypes } from '../filterAttributeIcons';

const t = key => `t:${key}`;

describe('groupFilterTypes', () => {
  it('adds a disabled header per model and keeps given icons', () => {
    const grouped = groupFilterTypes(
      [
        { attributeKey: 'status', label: 'Status' },
        {
          attributeKey: 'plan',
          attributeModel: 'customAttributes',
          icon: 'i-x',
        },
        { attributeKey: 'browser', attributeModel: 'additional' },
      ],
      t,
      'CONTACTS_FILTER'
    );
    expect(grouped.map(entry => entry.value || entry.attributeKey)).toEqual([
      '__group_standard',
      'status',
      '__group_additional',
      'browser',
      '__group_customAttributes',
      'plan',
    ]);
    expect(grouped[0]).toEqual({
      value: '__group_standard',
      label: 't:CONTACTS_FILTER.GROUPS.STANDARD_FILTERS',
      disabled: true,
    });
    expect(grouped[5].icon).toBe('i-x');
    expect(typeof grouped[1].icon).toBe('string');
  });

  it('keeps attributes with an unknown model at the end, with the default key', () => {
    const grouped = groupFilterTypes(
      [{ attributeKey: 'odd', attributeModel: 'legacy' }],
      t
    );
    expect(grouped).toHaveLength(1);
    expect(grouped[0]).toMatchObject({ attributeKey: 'odd' });
    expect(grouped[0].icon).toBeTruthy();
    expect(groupFilterTypes([{ attributeKey: 'status' }], t)[0].label).toBe(
      't:FILTER.GROUPS.STANDARD_FILTERS'
    );
  });
});
