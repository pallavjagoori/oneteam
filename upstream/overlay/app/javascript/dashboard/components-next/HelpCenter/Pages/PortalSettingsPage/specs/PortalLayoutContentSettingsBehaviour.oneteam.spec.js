/**
 * OneTeam behaviour spec for the help center portal layout and social
 * links settings.
 *
 * Covers loading the saved layout and social handles (or the classic
 * default), switching layouts, the social links section only on the
 * documentation layout, adding, editing and removing platforms (the add
 * menu, closing it on click-away, and hiding it once every platform is
 * shown), Save staying disabled until something changes or while
 * fetching, saving only trimmed non-empty handles, and reloading when
 * the portal changes.
 */
import { mount } from '@vue/test-utils';
import PortalLayoutContentSettings from '../PortalLayoutContentSettings.vue';

const env = vi.hoisted(() => ({ clickaway: null }));

const RadioCard = {
  name: 'RadioCard',
  props: ['id', 'isActive', 'label'],
  emits: ['select'],
  template: '<div class="radio"><slot /></div>',
};
const Button = {
  name: 'Button',
  props: ['label', 'icon', 'disabled'],
  emits: ['click'],
  template:
    '<button :data-icon="icon" @click="$emit(\'click\')">{{ label }}</button>',
};
const DropdownMenu = {
  name: 'DropdownMenu',
  props: ['menuItems'],
  emits: ['action'],
  template: '<ul class="menu" />',
};

const portal = config => ({ id: 2, slug: 'docs', config });

const mountSettings = (activePortal, isFetching = false) =>
  mount(PortalLayoutContentSettings, {
    props: { activePortal, isFetching },
    global: {
      stubs: { RadioCard, Button, DropdownMenu, Icon: true },
      directives: {
        dompurifyHtml: {},
        onClickaway: {
          mounted: (el, binding) => {
            env.clickaway = binding.value;
          },
        },
      },
    },
  });

const save = wrapper =>
  wrapper
    .findAllComponents(Button)
    .find(b => b.text() === 'HELP_CENTER.PORTAL_SETTINGS.LAYOUT_CONTENT.SAVE');
const addButton = wrapper => wrapper.find('[data-icon="i-lucide-plus"]');
const handles = wrapper => wrapper.findAll('input[type="text"]');

describe('PortalLayoutContentSettings behaviour', () => {
  it('defaults to the classic layout without social links', async () => {
    const wrapper = mountSettings(portal(undefined));
    const cards = wrapper.findAllComponents(RadioCard);
    expect(cards.map(c => c.props('isActive'))).toEqual([true, false]);
    expect(wrapper.find('section + section').exists()).toBe(false);
    expect(save(wrapper).props('disabled')).toBe(true);

    await cards[1].vm.$emit('select', 'documentation');
    expect(addButton(wrapper).exists()).toBe(true);
    expect(save(wrapper).props('disabled')).toBe(false);
    await cards[0].vm.$emit('select', 'classic');
    expect(save(wrapper).props('disabled')).toBe(true);
  });

  it('edits social links and saves trimmed handles', async () => {
    const wrapper = mountSettings(
      portal({
        layout: 'documentation',
        social_profiles: { x: 'acme', github: ' ' },
      })
    );
    expect(handles(wrapper).map(i => i.element.value)).toEqual(['acme']);
    expect(wrapper.text()).toContain('x.com/');

    await addButton(wrapper).trigger('click');
    const menu = wrapper.findComponent(DropdownMenu);
    expect(menu.props('menuItems')).toHaveLength(7);
    expect(menu.props('menuItems')[0]).toEqual({
      label: 'Facebook',
      value: 'facebook',
      action: 'facebook',
      icon: 'i-ri-facebook-circle-fill',
    });
    await menu.vm.$emit('action', { value: 'facebook' });
    expect(wrapper.findComponent(DropdownMenu).exists()).toBe(false);
    expect(handles(wrapper)).toHaveLength(2);

    await addButton(wrapper).trigger('click');
    await wrapper
      .findComponent(DropdownMenu)
      .vm.$emit('action', { value: 'facebook' });
    expect(handles(wrapper)).toHaveLength(2);

    await handles(wrapper)[1].setValue('  acmeinc ');
    await wrapper.find('[data-icon="i-lucide-x"]').trigger('click');
    expect(handles(wrapper).map(i => i.element.value)).toEqual(['  acmeinc ']);

    await save(wrapper).trigger('click');
    expect(wrapper.emitted('updatePortalConfiguration')[0]).toEqual([
      {
        id: 2,
        slug: 'docs',
        config: {
          layout: 'documentation',
          social_profiles: { facebook: 'acmeinc' },
        },
      },
    ]);
  });

  it('closes the add menu on click-away and hides it when all are shown', async () => {
    const all = {
      facebook: 'a',
      x: 'b',
      instagram: 'c',
      linkedin: 'd',
      youtube: 'e',
      tiktok: 'f',
      github: 'g',
    };
    const wrapper = mountSettings(
      portal({ layout: 'documentation', social_profiles: all })
    );
    await addButton(wrapper).trigger('click');
    expect(wrapper.findComponent(DropdownMenu).props('menuItems')).toEqual([
      {
        label: 'WhatsApp',
        value: 'whatsapp',
        action: 'whatsapp',
        icon: 'i-ri-whatsapp-fill',
      },
    ]);
    env.clickaway();
    await wrapper.vm.$nextTick();
    expect(wrapper.findComponent(DropdownMenu).exists()).toBe(false);

    await addButton(wrapper).trigger('click');
    await wrapper
      .findComponent(DropdownMenu)
      .vm.$emit('action', { value: 'whatsapp' });
    expect(addButton(wrapper).exists()).toBe(false);
  });

  it('reloads when the portal changes and locks Save while fetching', async () => {
    const wrapper = mountSettings(portal({ layout: 'classic' }), true);
    await wrapper
      .findAllComponents(RadioCard)[1]
      .vm.$emit('select', 'documentation');
    expect(save(wrapper).props('disabled')).toBe(true);

    await wrapper.setProps({
      activePortal: portal({
        layout: 'documentation',
        social_profiles: { youtube: 'acme' },
      }),
      isFetching: false,
    });
    expect(handles(wrapper).map(i => i.element.value)).toEqual(['acme']);
    expect(save(wrapper).props('disabled')).toBe(true);
  });
});
