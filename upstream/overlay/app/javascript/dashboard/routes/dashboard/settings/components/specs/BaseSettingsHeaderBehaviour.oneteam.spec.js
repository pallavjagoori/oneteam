/**
 * OneTeam behaviour spec for the settings page header.
 *
 * Covers the back button, title slot, description (prop or slot), help
 * link, meta slot, the search box bound to searchQuery, and the tabs,
 * count and actions toolbar.
 */
import { mount } from '@vue/test-utils';
import BaseSettingsHeader from '../BaseSettingsHeader.vue';

vi.mock('../../../../../helper/featureHelper', () => ({
  getHelpUrlForFeature: name =>
    name ? `https://help.test/${name}` : undefined,
}));

const BackButton = {
  name: 'BackButton',
  props: ['buttonLabel'],
  template: '<button class="back" />',
};
const Input = {
  name: 'NextInput',
  props: ['modelValue', 'placeholder'],
  emits: ['update:modelValue'],
  template: '<input /><slot name="prefix" />',
};

/**
 * Mounts the header.
 *
 * @param {object} props Header props.
 * @param {object} [slots] Header slots.
 * @returns {import('@vue/test-utils').VueWrapper} The mounted wrapper.
 */
const mountHeader = (props, slots = {}) =>
  mount(BaseSettingsHeader, {
    props: { title: 'Agents', ...props },
    slots,
    global: {
      stubs: {
        BackButton,
        Input,
        Icon: true,
        CustomBrandPolicyWrapper: { template: '<div><slot /></div>' },
      },
    },
  });

describe('BaseSettingsHeader behaviour', () => {
  it('shows the full header with search, count and actions', async () => {
    const wrapper = mountHeader(
      {
        description: 'Manage agents',
        linkText: 'Learn more',
        featureName: 'agents',
        backButtonLabel: 'Back',
        searchPlaceholder: 'Search agents',
        searchQuery: 'jo',
        'onUpdate:searchQuery': () => {},
      },
      {
        count: '<span class="count">3</span>',
        actions: '<button class="add">Add</button>',
        meta: '<i class="meta" />',
      }
    );
    expect(wrapper.getComponent(BackButton).props('buttonLabel')).toBe('Back');
    expect(wrapper.get('h1').text()).toBe('Agents');
    expect(wrapper.get('p').text()).toBe('Manage agents');
    const help = wrapper.get('a');
    expect(help.attributes('href')).toBe('https://help.test/agents');
    expect(help.text()).toBe('Learn more');
    expect(wrapper.find('.meta').exists()).toBe(true);
    const input = wrapper.getComponent(Input);
    expect(input.props()).toMatchObject({
      modelValue: 'jo',
      placeholder: 'Search agents',
    });
    input.vm.$emit('update:modelValue', 'john');
    expect(wrapper.emitted('update:searchQuery')).toEqual([['john']]);
    expect(wrapper.find('.hidden.sm\\:flex').exists()).toBe(true);
    expect(wrapper.find('.flex-row-reverse').exists()).toBe(true);
    expect(wrapper.find('.w-px').exists()).toBe(true);
  });

  it('uses slots for the title, description and tabs', () => {
    const wrapper = mountHeader(
      {},
      {
        title: '<h2 class="custom">Custom</h2>',
        description: 'Slot description',
        tabs: '<nav class="tabs" />',
      }
    );
    expect(wrapper.find('.custom').exists()).toBe(true);
    expect(wrapper.get('p').text()).toBe('Slot description');
    expect(wrapper.find('a').exists()).toBe(false);
    expect(wrapper.find('.tabs').exists()).toBe(true);
    expect(wrapper.find('.flex-row-reverse').exists()).toBe(false);
    expect(wrapper.find('.w-px').exists()).toBe(false);
    expect(wrapper.findComponent(Input).exists()).toBe(false);
  });

  it('renders only the title when nothing else is given', () => {
    const wrapper = mountHeader({});
    expect(wrapper.find('p').exists()).toBe(false);
    expect(wrapper.find('.text-n-slate-11').exists()).toBe(false);
    expect(wrapper.find('.sm\\:mt-4').exists()).toBe(false);
    expect(mountHeader({ title: '' }).find('h1').exists()).toBe(false);
  });

  it('shows actions without the tabs and search group', () => {
    const wrapper = mountHeader({}, { actions: '<button class="add" />' });
    expect(wrapper.find('.add').exists()).toBe(true);
    expect(wrapper.find('.min-w-0.items-center.gap-3').exists()).toBe(false);
  });

  it('shows the help area for a meta slot without a link', () => {
    const wrapper = mountHeader(
      { linkText: 'Learn' },
      { meta: '<i class="meta" />' }
    );
    expect(wrapper.find('.meta').exists()).toBe(true);
    expect(wrapper.find('a').exists()).toBe(false);
  });
});
