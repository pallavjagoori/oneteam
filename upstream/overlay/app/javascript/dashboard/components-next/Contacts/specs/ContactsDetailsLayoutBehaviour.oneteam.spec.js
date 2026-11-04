/**
 * OneTeam behaviour spec for the contact details layout.
 *
 * Covers the breadcrumb and back navigation, blocking and unblocking,
 * the call and compose actions, and the desktop and mobile sidebars
 * including closing the mobile sidebar on outside clicks.
 */
import { mount } from '@vue/test-utils';
import ContactsDetailsLayout from '../ContactsDetailsLayout.vue';

const env = vi.hoisted(() => ({ outside: null }));

vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: key => key }) }));
vi.mock('vue-router', async importOriginal => ({
  ...(await importOriginal()),
  useRoute: () => ({ params: { contactId: '12' } }),
}));
vi.mock('@vueuse/components', () => ({
  vOnClickOutside: {
    mounted: (el, binding) => {
      [env.outside] = binding.value;
    },
  },
}));

/**
 * Mounts the layout.
 *
 * @param {object} props component props
 * @param {object} slots slot content
 * @returns {import('@vue/test-utils').VueWrapper}
 */
const mountLayout = (props, slots = {}) =>
  mount(ContactsDetailsLayout, {
    props,
    slots,
    global: {
      mocks: { $t: key => key },
      stubs: {
        Breadcrumb: {
          name: 'Breadcrumb',
          props: ['items'],
          emits: ['click'],
          template: '<nav />',
        },
        Button: {
          props: ['label', 'icon'],
          emits: ['click'],
          template:
            '<button :class="icon" @click="$emit(\'click\')">{{ label }}</button>',
        },
        VoiceCallButton: {
          name: 'VoiceCallButton',
          props: ['phone', 'contactId'],
          template: '<i />',
        },
        ComposeConversation: {
          props: ['contactId'],
          template: '<div class="compose"><slot name="trigger" /></div>',
        },
        Transition: { template: '<div><slot /></div>' },
      },
    },
  });

describe('ContactsDetailsLayout behaviour', () => {
  it('navigates back and toggles blocking', async () => {
    const wrapper = mountLayout({
      selectedContact: { name: 'Amy', blocked: true, phoneNumber: '+1' },
    });
    const breadcrumb = wrapper.findComponent({ name: 'Breadcrumb' });
    expect(breadcrumb.props('items').map(item => item.label)).toEqual([
      'CONTACTS_LAYOUT.HEADER.BREADCRUMB.CONTACTS',
      'Amy',
    ]);
    breadcrumb.vm.$emit('click');
    expect(wrapper.emitted('goToContactsList')).toHaveLength(1);
    expect(wrapper.findComponent({ name: 'VoiceCallButton' }).props()).toEqual({
      phone: '+1',
      contactId: '12',
    });
    const block = wrapper.findAll('button')[0];
    expect(block.text()).toBe('CONTACTS_LAYOUT.HEADER.UNBLOCK_CONTACT');
    await block.trigger('click');
    expect(wrapper.emitted('toggleBlock')).toEqual([[true]]);
    await wrapper.setProps({ selectedContact: { name: 'Amy' } });
    expect(wrapper.findAll('button')[0].text()).toBe(
      'CONTACTS_LAYOUT.HEADER.BLOCK_CONTACT'
    );
    await wrapper.setProps({ selectedContact: null });
    expect(
      wrapper.findComponent({ name: 'Breadcrumb' }).props('items')
    ).toHaveLength(1);
    expect(wrapper.find('[data-contact-sidebar-toggle]').exists()).toBe(false);
  });

  it('opens and closes the mobile sidebar', async () => {
    const wrapper = mountLayout(
      {},
      { sidebar: '<p class="side" />', sidebarHeader: '<h4 />' }
    );
    expect(wrapper.findAll('.side')).toHaveLength(1);
    env.outside();
    await wrapper.find('.i-lucide-panel-right-open').trigger('click');
    expect(wrapper.find('#contact-sidebar-content').exists()).toBe(true);
    expect(wrapper.findAll('.side')).toHaveLength(2);
    await wrapper.find('.i-lucide-panel-right-close').trigger('click');
    expect(wrapper.find('#contact-sidebar-content').exists()).toBe(false);
    await wrapper.find('.i-lucide-panel-right-open').trigger('click');
    env.outside();
    await wrapper.vm.$nextTick();
    expect(wrapper.find('#contact-sidebar-content').exists()).toBe(false);
  });
});
