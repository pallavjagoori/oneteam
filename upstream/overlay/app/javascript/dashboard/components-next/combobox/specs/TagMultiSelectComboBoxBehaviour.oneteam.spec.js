/**
 * OneTeam behaviour spec for the tag-style multi-select combobox.
 *
 * Covers the placeholder, tags for known and unknown values, opening and
 * closing (disabled, outside click, exposed toggle), search filtering,
 * toggling options, removing tags, v-model sync, and the error message.
 */
import { mount, flushPromises } from '@vue/test-utils';
import TagMultiSelectComboBox from '../TagMultiSelectComboBox.vue';

vi.mock('@vueuse/components', () => ({
  OnClickOutside: {
    name: 'OnClickOutside',
    emits: ['trigger'],
    template: '<div class="outside"><slot /></div>',
  },
}));

const focus = vi.fn();
const ComboBoxDropdown = {
  name: 'ComboBoxDropdown',
  props: ['open', 'options', 'searchValue', 'selectedValues', 'multiple'],
  emits: ['update:searchValue', 'select'],
  methods: { focus },
  template:
    '<ul v-if="open"><li v-for="o in options" :key="o.value">{{ o.label }}</li></ul>',
};

const options = [
  { value: 'a', label: 'Alpha' },
  { value: 'b', label: 'Beta' },
  { value: 'n' },
];

const mountBox = props =>
  mount(TagMultiSelectComboBox, {
    props: { options, ...props },
    global: { stubs: { ComboBoxDropdown } },
  });
const field = wrapper => wrapper.find('.outside > div');
const dropdown = wrapper => wrapper.findComponent(ComboBoxDropdown);
const tags = wrapper =>
  field(wrapper)
    .findAll('div')
    .map(tag => tag.text());

describe('TagMultiSelectComboBox behaviour', () => {
  it('shows the placeholder without tags', () => {
    expect(field(mountBox()).text()).toBe('COMBOBOX.PLACEHOLDER');
    expect(field(mountBox({ placeholder: 'Pick' })).text()).toBe('Pick');
  });

  it('shows tags for known and unknown values', () => {
    const wrapper = mountBox({ modelValue: ['b', 'zz'] });
    expect(tags(wrapper)).toEqual(['Beta', 'zz']);
    expect(field(wrapper).find('span.text-n-slate-11.flex').exists()).toBe(
      false
    );
  });

  it('opens with focus, closes on toggle or outside click', async () => {
    const wrapper = mountBox();
    await field(wrapper).trigger('click');
    await flushPromises();
    expect(dropdown(wrapper).props('open')).toBe(true);
    expect(focus).toHaveBeenCalled();
    expect(field(wrapper).classes()).toContain('border-n-brand');
    await field(wrapper).trigger('click');
    expect(dropdown(wrapper).props('open')).toBe(false);
    wrapper.vm.toggleDropdown();
    await flushPromises();
    expect(wrapper.vm.open).toBe(true);
    await wrapper.findComponent({ name: 'OnClickOutside' }).vm.$emit('trigger');
    expect(dropdown(wrapper).props('open')).toBe(false);
  });

  it('stays closed when disabled', async () => {
    const wrapper = mountBox({ disabled: true });
    expect(wrapper.vm.disabled).toBe(true);
    await field(wrapper).trigger('click');
    expect(dropdown(wrapper).props('open')).toBe(false);
  });

  it('filters by search and skips options without labels', async () => {
    const wrapper = mountBox();
    await dropdown(wrapper).vm.$emit('update:searchValue', 'BE');
    expect(dropdown(wrapper).props('options')).toEqual([options[1]]);
    expect(dropdown(wrapper).props('searchValue')).toBe('BE');
  });

  it('toggles options and removes tags', async () => {
    const wrapper = mountBox({ modelValue: [] });
    await dropdown(wrapper).vm.$emit('select', options[0]);
    await dropdown(wrapper).vm.$emit('select', options[1]);
    expect(tags(wrapper)).toEqual(['Alpha', 'Beta']);
    await dropdown(wrapper).vm.$emit('select', options[0]);
    expect(tags(wrapper)).toEqual(['Beta']);
    await field(wrapper).find('.i-lucide-x').trigger('click');
    expect(tags(wrapper)).toEqual([]);
    expect(dropdown(wrapper).props('open')).toBe(false);
    expect(wrapper.emitted('update:modelValue')).toHaveLength(4);
    wrapper.vm.$.setupState.removeTag('missing');
    expect(wrapper.emitted('update:modelValue')).toHaveLength(4);
  });

  it('follows v-model and shows the error message', async () => {
    const wrapper = mountBox({ hasError: true, message: 'Required' });
    expect(field(wrapper).classes()).toContain('border-n-ruby-8');
    expect(wrapper.find('p').classes()).toContain('text-n-ruby-9');
    await wrapper.setProps({ modelValue: ['a'], hasError: false });
    expect(tags(wrapper)).toEqual(['Alpha']);
    expect(wrapper.find('p').classes()).toContain('text-n-slate-11');
    expect(mountBox().find('p').exists()).toBe(false);
  });
});
