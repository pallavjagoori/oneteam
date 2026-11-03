/**
 * OneTeam behaviour spec for the Captain CustomToolCard.
 *
 * Covers opening the tool (edit for admins, view for installed tools or
 * agents), the status toggle, the actions menu, auth and source labels.
 */
import { mount } from '@vue/test-utils';
import CustomToolCard from '../CustomToolCard.vue';

const env = vi.hoisted(() => ({ admin: true }));
const clickaway = { handler: null };

vi.mock('dashboard/composables/useAdmin', async () => {
  const { ref: vueRef } = await import('vue');
  return { useAdmin: () => ({ isAdmin: vueRef(env.admin) }) };
});

vi.mock('@vueuse/core', async importOriginal => {
  const { ref: vueRef } = await import('vue');
  return {
    ...(await importOriginal()),
    useToggle: () => {
      const state = vueRef(false);
      const toggle = value => {
        state.value = typeof value === 'boolean' ? value : !state.value;
      };
      return [state, toggle];
    },
  };
});

vi.mock('shared/composables/useExactTimestamp', () => ({
  useExactTimestamp: () => value => `exact:${value}`,
}));

vi.mock('shared/helpers/timeHelper', () => ({
  dynamicTime: value => `time:${value}`,
}));

vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: key => key }) }));

const SwitchStub = {
  name: 'Switch',
  props: { modelValue: Boolean },
  emits: ['update:modelValue'],
  template: '<input type="checkbox" class="switch" />',
};

const MenuStub = {
  name: 'DropdownMenu',
  props: { menuItems: Array },
  emits: ['action'],
  template: '<div class="menu" />',
};

/**
 * Mounts the card.
 *
 * @param {object} props component props
 * @returns {import('@vue/test-utils').VueWrapper}
 */
const mountCard = props =>
  mount(CustomToolCard, {
    props: { id: 4, title: 'Lookup', updatedAt: 0, createdAt: 50, ...props },
    global: {
      directives: {
        tooltip: {},
        onClickaway: {
          mounted: (el, binding) => {
            clickaway.handler = binding.value;
          },
        },
      },
      stubs: {
        CardLayout: { template: '<div><slot /></div>' },
        Policy: { template: '<div><slot /></div>' },
        Switch: SwitchStub,
        DropdownMenu: MenuStub,
        Button: {
          emits: ['click'],
          template: '<button class="menu-toggle" @click="$emit(\'click\')" />',
        },
      },
    },
  });

describe('CustomToolCard behaviour', () => {
  beforeEach(() => {
    env.admin = true;
  });

  it('opens an own tool for editing as an admin', async () => {
    const wrapper = mountCard({});
    await wrapper.find('[data-test="tool-title"]').trigger('click');
    expect(wrapper.emitted('action')).toEqual([[{ action: 'edit', id: 4 }]]);
    expect(wrapper.text()).toContain('CAPTAIN.CUSTOM_TOOLS.STATUS.ENABLED');
    expect(wrapper.text()).toContain('time:50');
  });

  it('opens read-only for agents', async () => {
    env.admin = false;
    const wrapper = mountCard({ enabled: false });
    await wrapper.find('[data-test="tool-title"]').trigger('click');
    expect(wrapper.emitted('action')).toEqual([[{ action: 'view', id: 4 }]]);
    expect(wrapper.text()).toContain('CAPTAIN.CUSTOM_TOOLS.STATUS.DISABLED');
  });

  it('emits the toggle with the new state', () => {
    const wrapper = mountCard({});
    wrapper.findComponent(SwitchStub).vm.$emit('update:modelValue', false);
    expect(wrapper.emitted('toggle')).toEqual([[{ id: 4, enabled: false }]]);
  });

  it('offers edit and delete and forwards a menu action', async () => {
    const wrapper = mountCard({
      description: 'Finds orders',
      authType: 'bearer',
    });
    expect(wrapper.text()).toContain('Finds orders');
    expect(wrapper.text()).toContain(
      'CAPTAIN.CUSTOM_TOOLS.FORM.AUTH_TYPES.BEARER'
    );
    await wrapper.find('.menu-toggle').trigger('click');
    const menu = wrapper.findComponent(MenuStub);
    expect(menu.props('menuItems').map(i => i.value)).toEqual([
      'edit',
      'delete',
    ]);
    menu.vm.$emit('action', { action: 'delete', value: 'delete' });
    await wrapper.vm.$nextTick();
    expect(wrapper.emitted('action')).toEqual([
      [{ action: 'delete', value: 'delete', id: 4 }],
    ]);
    expect(wrapper.findComponent(MenuStub).exists()).toBe(false);
  });

  it('closes the menu on click away', async () => {
    const wrapper = mountCard({});
    await wrapper.find('.menu-toggle').trigger('click');
    clickaway.handler();
    await wrapper.vm.$nextTick();
    expect(wrapper.findComponent(MenuStub).exists()).toBe(false);
  });

  it('offers view for installed tools and shows the source', async () => {
    const wrapper = mountCard({
      updatedAt: 99,
      sourceMetadata: { repository: 'acme/tools', path: 'lookup.json' },
    });
    expect(wrapper.text()).toContain('acme/tools/lookup.json');
    expect(wrapper.text()).toContain('time:99');
    await wrapper.find('[data-test="tool-title"]').trigger('click');
    expect(wrapper.emitted('action')).toEqual([[{ action: 'view', id: 4 }]]);
    await wrapper.find('.menu-toggle').trigger('click');
    expect(wrapper.findComponent(MenuStub).props('menuItems')[0].value).toBe(
      'view'
    );
  });
});
