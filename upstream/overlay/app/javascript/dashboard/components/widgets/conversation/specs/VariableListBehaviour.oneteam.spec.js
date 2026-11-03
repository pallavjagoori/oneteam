/**
 * OneTeam behaviour spec for the reply editor VariableList picker.
 *
 * Covers standard and custom attribute variables, search filtering,
 * the preview with and without a resolved value, and forwarding events.
 */
import { computed } from 'vue';
import { mount } from '@vue/test-utils';
import VariableList from '../VariableList.vue';

vi.mock('dashboard/composables/store', () => ({
  useMapGetter: () =>
    computed(() => [
      {
        attribute_model: 'contact_attribute',
        attribute_key: 'plan',
        attribute_description: 'Plan name',
      },
      {
        attribute_model: 'conversation_attribute',
        attribute_key: 'order',
        attribute_description: null,
      },
      { attribute_model: 'other', attribute_key: 'skip' },
    ]),
}));

vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: key => key }) }));

const PickerStub = {
  name: 'CaretAnchoredPicker',
  props: { items: Array, search: String },
  emits: ['update:search', 'select', 'close', 'removeTrigger'],
  template:
    '<div><div v-for="item in items" :key="item.id" class="preview"><slot name="preview" :item="item" /></div><slot name="preview" :item="null" /></div>',
};

/**
 * Mounts the variable list.
 *
 * @param {object} props component props
 * @returns {import('@vue/test-utils').VueWrapper}
 */
const mountList = props =>
  mount(VariableList, {
    props,
    global: { stubs: { CaretAnchoredPicker: PickerStub } },
  });

const keys = wrapper =>
  wrapper
    .findComponent(PickerStub)
    .props('items')
    .map(item => item.key);

describe('VariableList behaviour', () => {
  it('lists standard and custom attribute variables', () => {
    const list = keys(mountList({}));
    expect(list).toContain('contact.name');
    expect(list).toContain('contact.custom_attribute.plan');
    expect(list).toContain('conversation.custom_attribute.order');
    expect(list.some(key => key.includes('skip'))).toBe(false);
  });

  it('filters by key or description', async () => {
    const wrapper = mountList({ searchKey: 'plan' });
    expect(keys(wrapper)).toEqual(['contact.custom_attribute.plan']);
    wrapper.findComponent(PickerStub).vm.$emit('update:search', 'PLAN NAME');
    await wrapper.vm.$nextTick();
    expect(keys(wrapper)).toEqual(['contact.custom_attribute.plan']);
  });

  it('previews resolved values and missing ones', () => {
    const wrapper = mountList({
      searchKey: 'contact.name',
      variables: { 'contact.name': 'Jane' },
    });
    expect(wrapper.text()).toContain('Jane');
    const missing = mountList({ searchKey: 'order' });
    expect(missing.text()).toContain('CONVERSATION.PICKER.VARIABLE.NO_VALUE');
    expect(missing.text()).not.toContain(
      'CONVERSATION.PICKER.VARIABLE.DESCRIPTION'
    );
  });

  it('forwards select, close and remove trigger', () => {
    const wrapper = mountList({});
    const picker = wrapper.findComponent(PickerStub);
    picker.vm.$emit('select', { key: 'contact.email' });
    picker.vm.$emit('close');
    picker.vm.$emit('removeTrigger');
    expect(wrapper.emitted('selectVariable')).toEqual([['contact.email']]);
    expect(wrapper.emitted('close')).toHaveLength(1);
    expect(wrapper.emitted('removeTrigger')).toHaveLength(1);
  });
});
