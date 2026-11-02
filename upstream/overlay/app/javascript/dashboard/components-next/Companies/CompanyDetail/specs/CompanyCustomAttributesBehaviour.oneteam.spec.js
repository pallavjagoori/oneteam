/**
 * OneTeam behaviour spec for the custom attributes list on a company.
 *
 * Covers loading attribute definitions on mount, the empty state when the
 * account has none, splitting attributes into ones the company has a
 * value for (editable) and unused ones (with a count divider), searching
 * the unused ones (and the "no match" message), and hiding the unused
 * section when every attribute is set.
 */
import { reactive } from 'vue';
import { mount } from '@vue/test-utils';
import CompanyCustomAttributes from '../CompanyCustomAttributes.vue';

const env = vi.hoisted(() => ({}));

vi.mock('dashboard/composables/store', async () => {
  const { computed } = await import('vue');
  return {
    useStore: () => ({ dispatch: env.dispatch }),
    useMapGetter: () => computed(() => env.state.attributes),
  };
});

const Item = {
  name: 'CompanyCustomAttributeItem',
  props: { attribute: Object, companyId: Number, isEditingView: Boolean },
  template: '<div class="item">{{ attribute.attributeDisplayName }}</div>',
};

const attribute = (id, key, name) => ({
  id,
  attributeKey: key,
  attributeDisplayName: name,
});
const attributes = [
  attribute(1, 'tier', 'Tier'),
  attribute(2, 'region', 'Region'),
  attribute(3, 'plan', 'Plan'),
];

const mountList = company =>
  mount(CompanyCustomAttributes, {
    props: company === undefined ? {} : { company },
    global: { stubs: { CompanyCustomAttributeItem: Item } },
  });

const items = wrapper => wrapper.findAllComponents(Item);

describe('CompanyCustomAttributes behaviour', () => {
  beforeEach(() => {
    env.dispatch = vi.fn();
    env.state = reactive({ attributes });
  });

  it('splits used and unused attributes and searches unused ones', async () => {
    const wrapper = mountList({
      id: 7,
      customAttributes: { tier: 'Gold', plan: null },
    });
    expect(env.dispatch).toHaveBeenCalledWith('attributes/get');
    const [tier, plan, region] = items(wrapper);
    expect(tier.props()).toMatchObject({
      companyId: 7,
      isEditingView: true,
      attribute: { attributeKey: 'tier', value: 'Gold' },
    });
    expect(plan.props('attribute').value).toBe('');
    expect(region.props('isEditingView')).toBe(false);
    expect(wrapper.text()).toContain(
      'COMPANIES.DETAIL.ATTRIBUTES.UNUSED_ATTRIBUTES'
    );

    await wrapper.find('input').setValue('REG');
    expect(items(wrapper).map(i => i.text())).toEqual([
      'Tier',
      'Plan',
      'Region',
    ]);
    await wrapper.find('input').setValue('zzz');
    expect(items(wrapper)).toHaveLength(2);
    expect(wrapper.text()).toContain(
      'COMPANIES.DETAIL.ATTRIBUTES.NO_ATTRIBUTES'
    );
  });

  it('hides the unused section when every attribute is set', () => {
    const wrapper = mountList({
      id: 7,
      customAttributes: { tier: 1, region: 2, plan: 3 },
    });
    expect(items(wrapper)).toHaveLength(3);
    expect(wrapper.find('input').exists()).toBe(false);
    expect(wrapper.text()).not.toContain('UNUSED_ATTRIBUTES');
  });

  it('lists everything as unused for a company without values', () => {
    const wrapper = mountList();
    expect(items(wrapper)).toHaveLength(3);
    expect(items(wrapper).every(i => !i.props('isEditingView'))).toBe(true);
  });

  it('shows the empty state without attribute definitions', () => {
    env.state.attributes = [];
    const wrapper = mountList({ id: 7 });
    expect(wrapper.text()).toBe('COMPANIES.DETAIL.ATTRIBUTES.EMPTY_STATE');
    expect(wrapper.vm.usedAttributes).toEqual([]);
    env.state.attributes = null;
    expect(mountList({ id: 7 }).text()).toBe(
      'COMPANIES.DETAIL.ATTRIBUTES.EMPTY_STATE'
    );
  });
});
