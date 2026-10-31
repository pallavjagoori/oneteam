/**
 * OneTeam behaviour spec for the contact sidebar's custom attributes.
 *
 * Covers the empty state (no attributes or no getter), splitting used and
 * unused attributes, ordering both by the saved panel order, searching
 * unused attributes with a no-match message, and contacts without custom
 * attributes.
 */
import { computed, ref } from 'vue';
import { mount } from '@vue/test-utils';
import ContactCustomAttributes from '../ContactCustomAttributes.vue';

const env = vi.hoisted(() => ({ state: {}, noGetter: false, order: null }));

vi.mock('dashboard/composables/store', () => ({
  useMapGetter: name =>
    env.noGetter ? undefined : computed(() => env.state[name]),
}));
vi.mock('dashboard/composables/useUISettings', () => ({
  useUISettings: () => ({
    uiSettings: ref({
      conversation_elements_order_conversation_contact_panel: env.order,
    }),
  }),
}));

const Item = {
  name: 'ContactCustomAttributeItem',
  props: { attribute: Object, isEditingView: Boolean },
  template:
    '<div class="item">{{ attribute.attributeKey }}={{ attribute.value }}</div>',
};

const attributes = [
  { id: 1, attributeKey: 'plan', attributeDisplayName: 'Plan' },
  { id: 2, attributeKey: 'city', attributeDisplayName: 'City' },
  { id: 3, attributeKey: 'tier', attributeDisplayName: 'Tier' },
  { id: 4, attributeKey: 'zone', attributeDisplayName: 'Time zone' },
];

const mountAttributes = selectedContact =>
  mount(ContactCustomAttributes, {
    props: { selectedContact },
    global: { stubs: { ContactCustomAttributeItem: Item } },
  });
const items = wrapper => wrapper.findAllComponents(Item);

describe('ContactCustomAttributes behaviour', () => {
  beforeEach(() => {
    env.noGetter = false;
    env.order = null;
    env.state = { 'attributes/getContactAttributes': attributes };
  });

  it('shows the empty state without attributes', () => {
    env.state['attributes/getContactAttributes'] = [];
    expect(mountAttributes().text()).toBe(
      'CONTACTS_LAYOUT.SIDEBAR.ATTRIBUTES.EMPTY_STATE'
    );
    env.noGetter = true;
    expect(mountAttributes().text()).toBe(
      'CONTACTS_LAYOUT.SIDEBAR.ATTRIBUTES.EMPTY_STATE'
    );
  });

  it('splits used and unused attributes', () => {
    const wrapper = mountAttributes({
      customAttributes: { tier: 'Gold', plan: null },
    });
    const used = items(wrapper).filter(i => i.props('isEditingView'));
    expect(used.map(i => i.text())).toEqual(['plan=', 'tier=Gold']);
    expect(
      items(wrapper)
        .filter(i => !i.props('isEditingView'))
        .map(i => i.text())
    ).toEqual(['city=', 'zone=']);
    expect(wrapper.text()).toContain(
      'CONTACTS_LAYOUT.SIDEBAR.ATTRIBUTES.UNUSED_ATTRIBUTES'
    );
  });

  it('orders attributes by the saved panel order', () => {
    env.order = ['tier', 'zone', 'plan'];
    const wrapper = mountAttributes({
      customAttributes: { plan: 'Pro', tier: 'Gold' },
    });
    expect(items(wrapper).map(i => i.text())).toEqual([
      'tier=Gold',
      'plan=Pro',
      'zone=',
      'city=',
    ]);
  });

  it('searches unused attributes', async () => {
    const wrapper = mountAttributes({ customAttributes: {} });
    await wrapper.find('input').setValue('ZONE');
    expect(items(wrapper).map(i => i.text())).toEqual(['zone=']);
    await wrapper.find('input').setValue('nothing');
    expect(items(wrapper)).toHaveLength(0);
    expect(wrapper.text()).toContain(
      'CONTACTS_LAYOUT.SIDEBAR.ATTRIBUTES.NO_ATTRIBUTES'
    );
  });

  it('hides the unused section when every attribute is set', () => {
    const wrapper = mountAttributes({
      customAttributes: { plan: 1, city: 2, tier: 3, zone: 4 },
    });
    expect(wrapper.find('input').exists()).toBe(false);
    expect(items(wrapper)).toHaveLength(4);
  });

  it('lists nothing for contacts without custom attributes', () => {
    const wrapper = mountAttributes(null);
    expect(items(wrapper)).toHaveLength(0);
    expect(wrapper.find('input').exists()).toBe(false);
  });
});
