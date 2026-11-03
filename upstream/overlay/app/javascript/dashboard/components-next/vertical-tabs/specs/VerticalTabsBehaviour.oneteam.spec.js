/**
 * OneTeam behaviour spec for the vertical tab rail.
 *
 * Covers marking the active tab, switching tabs, keeping every panel
 * mounted while showing only the active one, optional icons, the
 * content class, and the tab validator.
 */
import { mount } from '@vue/test-utils';
import VerticalTabs from '../VerticalTabs.vue';

const Icon = { name: 'Icon', props: ['icon'], template: '<i />' };
const tabs = [
  { id: 'general', label: 'General', icon: 'i-lucide-cog' },
  { id: 'advanced', label: 'Advanced' },
];

describe('VerticalTabs behaviour', () => {
  it('switches tabs and keeps every panel mounted', async () => {
    const wrapper = mount(VerticalTabs, {
      props: { tabs, modelValue: 'general', contentClass: 'pt-4' },
      slots: {
        general: '<p class="general">General</p>',
        advanced: '<p class="advanced">Advanced</p>',
      },
      global: { stubs: { Icon } },
      attachTo: document.body,
    });
    const [general, advanced] = wrapper.findAll('button');
    expect(general.attributes('aria-current')).toBe('page');
    expect(advanced.attributes('aria-current')).toBeUndefined();
    expect(wrapper.findAllComponents(Icon)).toHaveLength(1);
    expect(wrapper.find('.pt-4').exists()).toBe(true);
    expect(wrapper.get('.advanced').isVisible()).toBe(false);
    await advanced.trigger('click');
    expect(wrapper.emitted('update:modelValue')).toEqual([['advanced']]);
    await wrapper.setProps({ modelValue: 'advanced' });
    expect(wrapper.get('.advanced').isVisible()).toBe(true);
    expect(wrapper.get('.general').isVisible()).toBe(false);
    wrapper.unmount();
  });

  it('requires an id and label on every tab', () => {
    const { validator } = VerticalTabs.props.tabs;
    expect(validator(tabs)).toBe(true);
    expect(validator([{ id: 'x' }])).toBe(false);
  });
});
