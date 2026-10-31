/**
 * OneTeam specs for the filter builder: how each custom attribute type maps
 * to an input and its operators, contact filters, and the "Mine" tab.
 */
import { useFilter } from '../useFilter';
import { useStore } from 'dashboard/composables/store';
import { useI18n } from 'vue-i18n';
import * as OPERATORS from 'dashboard/components/widgets/FilterInput/FilterOperatorTypes.js';

vi.mock('dashboard/composables/store');
vi.mock('vue-i18n');

describe('useFilter attribute types', () => {
  const types = [
    'date',
    'text',
    'list',
    'checkbox',
    'number',
    'link',
    'currency',
  ];

  beforeEach(() => {
    vi.mocked(useI18n).mockReturnValue({ t: key => key });
    vi.mocked(useStore).mockReturnValue({
      getters: {
        'attributes/getAttributesByModel': () =>
          types.map(type => ({
            attribute_key: `${type}_key`,
            attribute_display_name: type,
            attribute_display_type: type,
          })),
      },
    });
  });

  it('gives each custom attribute type its input and operators', () => {
    const { setFilterAttributes } = useFilter({
      filteri18nKey: 'CONTACTS_FILTER',
      attributeModel: 'contact_attribute',
    });

    const { filterTypes, filterGroups } = setFilterAttributes();
    const byKey = Object.fromEntries(
      filterTypes.map(type => [type.attributeKey, type])
    );

    expect(byKey.date_key).toMatchObject({
      inputType: 'date',
      filterOperators: OPERATORS.OPERATOR_TYPES_4,
      attributeI18nKey: 'CUSTOM_ATTRIBUTE_DATE',
    });
    expect(byKey.text_key).toMatchObject({
      inputType: 'plain_text',
      filterOperators: OPERATORS.OPERATOR_TYPES_3,
    });
    expect(byKey.list_key.inputType).toBe('search_select');
    expect(byKey.checkbox_key.inputType).toBe('search_select');
    ['number', 'link', 'currency'].forEach(type =>
      expect(byKey[`${type}_key`].inputType).toBe('plain_text')
    );
    ['list', 'checkbox', 'number', 'link', 'currency'].forEach(type =>
      expect(byKey[`${type}_key`].filterOperators).toBe(
        OPERATORS.OPERATOR_TYPES_1
      )
    );
    expect(filterGroups.at(-1).name).toBe(
      'CONTACTS_FILTER.GROUPS.CUSTOM_ATTRIBUTES'
    );
  });

  it('filters by the current user on the "Mine" tab', () => {
    const { initializeStatusAndAssigneeFilterToModal } = useFilter({
      filteri18nKey: 'FILTER',
      attributeModel: 'conversation_attribute',
    });
    const me = [{ id: 1, name: 'Jane' }];

    expect(initializeStatusAndAssigneeFilterToModal('', me, 'me')).toEqual({
      attribute_key: 'assignee_id',
      filter_operator: 'equal_to',
      values: me,
      query_operator: 'and',
      custom_attribute_type: '',
    });
  });
});
