/**
 * OneTeam spec for the conversation and contact filter contexts: the
 * attribute list each filter builder offers, with options taken from the
 * store (agents, inboxes, teams, campaigns, labels), custom attributes with
 * the operators for their type, and contact search for the contact filter.
 */
import { ref, isVNode } from 'vue';
import { useConversationFilterContext } from '../provider';
import { useContactFilterContext } from '../contactProvider';
import { createContactSearcher } from 'dashboard/components-next/NewConversation/helpers/composeConversationHelper';

const getters = {};
vi.mock('dashboard/composables/store.js', () => ({
  useMapGetter: key => getters[key],
}));
vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key, params) => (params ? `${key} ${JSON.stringify(params)}` : key),
  }),
}));
const search = vi.fn();
vi.mock(
  'dashboard/components-next/NewConversation/helpers/composeConversationHelper',
  () => ({ createContactSearcher: vi.fn(() => search) })
);

const customAttributes = [
  {
    attributeKey: 'plan',
    attributeDisplayName: 'Plan',
    attributeDisplayType: 'list',
    attributeValues: ['free', 'pro'],
  },
  {
    attributeKey: 'notes',
    attributeDisplayName: 'Notes',
    attributeDisplayType: 'text',
  },
  {
    attributeKey: 'seats',
    attributeDisplayName: 'Seats',
    attributeDisplayType: 'number',
  },
  {
    attributeKey: 'site',
    attributeDisplayName: 'Site',
    attributeDisplayType: 'link',
  },
  {
    attributeKey: 'renewal',
    attributeDisplayName: 'Renewal',
    attributeDisplayType: 'date',
  },
  {
    attributeKey: 'vip',
    attributeDisplayName: 'VIP',
    attributeDisplayType: 'checkbox',
  },
  {
    attributeKey: 'odd',
    attributeDisplayName: 'Odd',
    attributeDisplayType: 'unknown',
  },
];

beforeEach(() => {
  Object.assign(getters, {
    'attributes/getConversationAttributes': ref(customAttributes),
    'attributes/getContactAttributes': ref(customAttributes),
    'labels/getLabels': ref([{ id: 1, title: 'vip', color: '#f00' }]),
    'agents/getAgents': ref([{ id: 2, name: 'Ada' }]),
    'inboxes/getInboxes': ref([
      { id: 3, name: 'Support', channel_type: 'Channel::Email' },
    ]),
    'teams/getTeams': ref([
      { id: 4, name: 'Sales', icon: '🚀', icon_color: '#00f' },
      { id: 5, name: 'Ops' },
    ]),
    'campaigns/getAllCampaigns': ref([{ id: 6, title: 'Spring' }]),
  });
});

const byKey = (types, key) => types.find(type => type.attributeKey === key);
const operatorValues = type => type.filterOperators.map(op => op.value);

describe('useConversationFilterContext', () => {
  it('fills the options from the store', () => {
    const { filterTypes } = useConversationFilterContext();
    const types = filterTypes.value;
    expect(byKey(types, 'assignee_id').options).toEqual([
      { id: 2, name: 'Ada' },
    ]);
    expect(byKey(types, 'inbox_id').options[0]).toMatchObject({
      id: 3,
      name: 'Support',
    });
    expect(byKey(types, 'inbox_id').options[0].icon).toBeTruthy();
    const [sales, ops] = byKey(types, 'team_id').options;
    expect(isVNode(sales.icon)).toBe(true);
    expect(ops.icon).toBeUndefined();
    expect(byKey(types, 'campaign_id').options).toEqual([
      { id: 6, name: 'Spring' },
    ]);
    expect(byKey(types, 'labels').options[0]).toMatchObject({
      id: 'vip',
      name: 'vip',
    });
  });

  it('adds custom attributes with operators for their type', () => {
    const types = useConversationFilterContext().filterTypes.value;
    expect(byKey(types, 'plan').options).toEqual([
      { id: 'free', name: 'free' },
      { id: 'pro', name: 'pro' },
    ]);
    expect(operatorValues(byKey(types, 'notes'))).toContain('contains');
    expect(operatorValues(byKey(types, 'renewal'))).toContain(
      'is_greater_than'
    );
    ['seats', 'site', 'vip', 'odd', 'plan'].forEach(key => {
      expect(operatorValues(byKey(types, key))).toContain('equal_to');
    });
  });

  it('groups the attributes for the picker', () => {
    const { attributeFilterTypes } = useConversationFilterContext();
    expect(attributeFilterTypes.value[0]).toMatchObject({
      value: '__group_standard',
      disabled: true,
    });
  });

  it('searches contacts and names them by the best field available', async () => {
    const { filterTypes } = useConversationFilterContext();
    const contactFilter = byKey(filterTypes.value, 'contact_id');
    search.mockResolvedValue([
      { id: 1, name: 'Ada' },
      { id: 2, email: 'b@x.test' },
      { id: 3, phoneNumber: '+1555' },
      { id: 4, identifier: 'ext-4' },
      { id: 5 },
    ]);
    expect(await contactFilter.searchOptions('a')).toEqual([
      { id: 1, name: 'Ada' },
      { id: 2, name: 'b@x.test' },
      { id: 3, name: '+1555' },
      { id: 4, name: 'ext-4' },
      { id: 5, name: 'FILTER.CONTACT_FALLBACK {"id":5}' },
    ]);
    expect(search).toHaveBeenCalledWith('a', {
      skipMinLength: true,
      reachableOnly: false,
    });
    expect(createContactSearcher).toHaveBeenCalled();
    search.mockResolvedValue(null);
    expect(await contactFilter.searchOptions('ad')).toBeNull();
  });
});

describe('useContactFilterContext', () => {
  it('offers labels and custom attributes, grouped for the picker', () => {
    const { filterTypes, attributeFilterTypes } = useContactFilterContext();
    expect(byKey(filterTypes.value, 'labels').options).toEqual([
      { id: 'vip', name: 'vip' },
    ]);
    expect(byKey(filterTypes.value, 'plan')).toBeDefined();
    expect(attributeFilterTypes.value[0].label).toBe(
      'CONTACTS_FILTER.GROUPS.STANDARD_FILTERS'
    );
  });

  it('copes with labels that have not loaded', () => {
    getters['labels/getLabels'] = ref(undefined);
    const { filterTypes } = useContactFilterContext();
    expect(byKey(filterTypes.value, 'labels').options).toBeUndefined();
  });
});
