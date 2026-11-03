/**
 * OneTeam behaviour spec for the "add label" dropdown button.
 *
 * Covers opening and closing the menu from the button, closing it on an
 * outside click, forwarding the chosen label, and the colour swatch in
 * the thumbnail slot.
 */
import { mount } from '@vue/test-utils';
import AddLabel from '../AddLabel.vue';

vi.mock('vue-i18n', async importOriginal => ({
  ...(await importOriginal()),
  useI18n: () => ({ t: key => key }),
}));

const DropdownMenu = {
  name: 'DropdownMenu',
  props: ['menuItems'],
  emits: ['action'],
  template:
    '<div class="menu"><slot name="thumbnail" :item="menuItems[0]" /></div>',
};

const labelMenuItems = [
  { label: 'bug', value: 1, thumbnail: { color: '#ff0000' } },
];

/**
 * Mounts the button and captures the clickaway handler.
 *
 * @returns {{wrapper: object, away: Function}} Wrapper and handler.
 */
const mountAddLabel = () => {
  let away;
  const wrapper = mount(AddLabel, {
    props: { labelMenuItems },
    global: {
      stubs: { DropdownMenu },
      directives: {
        onClickaway: (el, binding) => {
          away = binding.value;
        },
      },
    },
  });
  return { wrapper, getAway: () => away };
};

describe('AddLabel behaviour', () => {
  it('toggles the menu and shows the label colour', async () => {
    const { wrapper } = mountAddLabel();
    expect(wrapper.find('.menu').exists()).toBe(false);
    const button = wrapper.get('button');
    expect(button.text()).toContain('LABEL.TAG_BUTTON');
    await button.trigger('click');
    expect(button.classes()).toContain('bg-n-alpha-2');
    const menu = wrapper.getComponent(DropdownMenu);
    expect(menu.props('menuItems')).toEqual(labelMenuItems);
    expect(wrapper.get('.menu > div').attributes('style')).toContain(
      'background-color: rgb(255, 0, 0)'
    );
    menu.vm.$emit('action', labelMenuItems[0]);
    expect(wrapper.emitted('updateLabel')).toEqual([[labelMenuItems[0]]]);
    await button.trigger('click');
    expect(wrapper.find('.menu').exists()).toBe(false);
  });

  it('closes the menu on an outside click', async () => {
    const { wrapper, getAway } = mountAddLabel();
    await wrapper.get('button').trigger('click');
    getAway()();
    await wrapper.vm.$nextTick();
    expect(wrapper.find('.menu').exists()).toBe(false);
  });
});
