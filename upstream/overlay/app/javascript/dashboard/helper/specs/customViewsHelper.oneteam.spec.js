import {
  generateValuesForEditCustomViews,
  getInputType,
  getValuesForFilter,
} from '../customViewsHelper';

describe('customViewsHelper (OneTeam)', () => {
  const filterTypes = [
    { attributeKey: 'created_at', inputType: 'date' },
    { attributeKey: 'contact_id', inputType: 'search_select' },
  ];

  it('uses the filter type for date filters other than days_before', () => {
    expect(getInputType('created_at', 'is_greater_than', filterTypes)).toBe(
      'date'
    );
  });

  it('names priorities and contacts', () => {
    const params = {
      priority: [
        { id: 'high', name: 'High' },
        { id: 'low', name: 'Low' },
      ],
      contacts: [{ id: 4, name: 'Jo' }],
    };
    expect(
      getValuesForFilter(
        { attribute_key: 'priority', values: ['high'] },
        params
      )
    ).toEqual([{ id: 'high', name: 'High' }]);
    expect(
      getValuesForFilter({ attribute_key: 'contact_id', values: [4] }, params)
    ).toEqual({ id: 4, name: 'Jo' });
    expect(
      getValuesForFilter({ attribute_key: 'contact_id', values: [5] }, {})
    ).toEqual({ id: 5, name: 'Contact #5' });
  });

  it('looks up search-select values when editing a view', () => {
    expect(
      generateValuesForEditCustomViews(
        {
          attribute_key: 'contact_id',
          filter_operator: 'equal_to',
          values: [4],
        },
        { filterTypes, contacts: [{ id: 4, name: 'Jo' }] }
      )
    ).toEqual({ id: 4, name: 'Jo' });
  });

  it('returns plain values as text when editing a view', () => {
    expect(
      generateValuesForEditCustomViews(
        {
          attribute_key: 'created_at',
          filter_operator: 'days_before',
          values: [3],
        },
        { filterTypes }
      )
    ).toBe('3');
  });
});
