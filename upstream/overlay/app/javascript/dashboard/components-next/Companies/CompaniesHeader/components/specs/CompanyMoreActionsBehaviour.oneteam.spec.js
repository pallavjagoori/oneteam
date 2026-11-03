/**
 * OneTeam behaviour spec for the companies header "more actions" menu.
 *
 * Covers toggling the menu, creating a company, ignoring other actions,
 * and closing on click away.
 */
import { mount } from '@vue/test-utils';
import CompanyMoreActions from '../CompanyMoreActions.vue';

vi.mock('vue-i18n', async importOriginal => ({
  ...(await importOriginal()),
  useI18n: () => ({ t: key => key }),
}));

const Button = {
  name: 'NextButton',
  emits: ['click'],
  template: '<button @click="$emit(\'click\')" />',
};
const DropdownMenu = {
  name: 'DropdownMenu',
  props: ['menuItems'],
  emits: ['action'],
  template: '<ul />',
};

/**
 * Mounts the menu, capturing the click-away handler.
 *
 * @returns {{ wrapper: import('@vue/test-utils').VueWrapper, away: { fn?: Function } }}
 *   The wrapper and the captured handler.
 */
const mountMenu = () => {
  const away = {};
  const wrapper = mount(CompanyMoreActions, {
    global: {
      stubs: { Button, DropdownMenu },
      directives: {
        onClickaway: (el, binding) => {
          away.fn = binding.value;
        },
      },
    },
  });
  return { wrapper, away };
};

describe('CompanyMoreActions behaviour', () => {
  it('creates a company from the menu', async () => {
    const { wrapper } = mountMenu();
    const button = wrapper.get('button');
    expect(button.classes()).not.toContain('bg-n-alpha-2');
    await button.trigger('click');
    expect(button.classes()).toContain('bg-n-alpha-2');
    const menu = wrapper.getComponent(DropdownMenu);
    expect(menu.props('menuItems')[0]).toMatchObject({
      action: 'create',
      label: 'COMPANIES.ACTIONS.CREATE',
    });
    menu.vm.$emit('action', { action: 'create' });
    await wrapper.vm.$nextTick();
    expect(wrapper.emitted('create')).toHaveLength(1);
    expect(wrapper.findComponent(DropdownMenu).exists()).toBe(false);
  });

  it('ignores other actions and closes on click away', async () => {
    const { wrapper, away } = mountMenu();
    await wrapper.get('button').trigger('click');
    wrapper.getComponent(DropdownMenu).vm.$emit('action', { action: 'other' });
    await wrapper.vm.$nextTick();
    expect(wrapper.emitted('create')).toBeUndefined();
    await wrapper.get('button').trigger('click');
    away.fn();
    await wrapper.vm.$nextTick();
    expect(wrapper.findComponent(DropdownMenu).exists()).toBe(false);
  });
});
