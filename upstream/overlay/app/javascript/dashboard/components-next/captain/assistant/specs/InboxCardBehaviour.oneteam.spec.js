/**
 * OneTeam behaviour spec for a Captain assistant's connected inbox card.
 *
 * Covers the inbox name with its Twilio / WhatsApp identifier or email
 * address (and plain names otherwise), the channel icon, opening the
 * admin-only menu, closing it on an outside click, and emitting the
 * disconnect action with the card id.
 */
import { mount } from '@vue/test-utils';
import InboxCard from '../InboxCard.vue';

const env = vi.hoisted(() => ({ clickaway: null }));

vi.mock('@vueuse/core', async importOriginal => {
  const { ref: appRef } = await import('vue');
  return {
    ...(await importOriginal()),
    useToggle: initial => {
      const state = appRef(initial);
      const toggle = value => {
        state.value = typeof value === 'boolean' ? value : !state.value;
      };
      return [state, toggle];
    },
  };
});
vi.mock('dashboard/helper/inbox', async importOriginal => ({
  ...(await importOriginal()),
  getInboxIconByType: (type, medium, variant, voice) =>
    `icon-${type}-${medium}-${variant}-${voice}`,
}));

const Button = {
  name: 'NextButton',
  emits: ['click'],
  template: '<button class="menu-toggle" @click="$emit(\'click\')" />',
};
const DropdownMenu = {
  name: 'DropdownMenu',
  props: ['menuItems'],
  emits: ['action'],
  template: '<ul class="menu" />',
};

const mountCard = inbox =>
  mount(InboxCard, {
    props: { id: 7, inbox },
    global: {
      stubs: {
        NextButton: Button,
        Button,
        DropdownMenu,
        CardLayout: { template: '<div><slot /></div>' },
        Policy: { template: '<div><slot /></div>' },
      },
      directives: {
        onClickaway: {
          mounted: (el, binding) => {
            env.clickaway = binding.value;
          },
        },
      },
    },
  });
const name = inbox => mountCard(inbox).find('.line-clamp-1').text();

describe('Captain inbox card behaviour', () => {
  it('names the inbox with its identifier', () => {
    expect(name({})).toBe('');
    expect(
      name({
        name: 'SMS',
        channel_type: 'Channel::TwilioSms',
        messaging_service_sid: 'MG1',
      })
    ).toBe('SMS (MG1)');
    expect(
      name({
        name: 'SMS',
        channel_type: 'Channel::TwilioSms',
        phone_number: '+1555',
      })
    ).toBe('SMS (+1555)');
    expect(name({ name: 'WA', channel_type: 'Channel::Whatsapp' })).toBe('WA');
    expect(
      name({
        name: 'Mail',
        channel_type: 'Channel::Email',
        email: 'hi@acme.com',
      })
    ).toBe('Mail (hi@acme.com)');
    expect(name({ name: 'Mail', channel_type: 'Channel::Email' })).toBe('Mail');
    expect(name({ name: 'Site', channel_type: 'Channel::WebWidget' })).toBe(
      'Site'
    );
  });

  it('shows the channel icon', () => {
    const wrapper = mountCard({
      name: 'Call',
      channel_type: 'Channel::Api',
      medium: 'x',
      voice_enabled: true,
    });
    expect(wrapper.find('.line-clamp-1 span').classes()).toContain(
      'icon-Channel::Api-x-outline-true'
    );
  });

  it('opens the menu, closes it outside and emits disconnect', async () => {
    const wrapper = mountCard({
      name: 'Site',
      channel_type: 'Channel::WebWidget',
    });
    await wrapper.find('.menu-toggle').trigger('click');
    const menu = wrapper.findComponent(DropdownMenu);
    expect(menu.props('menuItems')).toEqual([
      expect.objectContaining({ action: 'delete', value: 'delete' }),
    ]);
    env.clickaway();
    await wrapper.vm.$nextTick();
    expect(wrapper.find('.menu').exists()).toBe(false);

    await wrapper.find('.menu-toggle').trigger('click');
    wrapper
      .findComponent(DropdownMenu)
      .vm.$emit('action', { action: 'delete', value: 'delete' });
    await wrapper.vm.$nextTick();
    expect(wrapper.emitted('action')).toEqual([
      [{ action: 'delete', value: 'delete', id: 7 }],
    ]);
    expect(wrapper.find('.menu').exists()).toBe(false);
  });
});
