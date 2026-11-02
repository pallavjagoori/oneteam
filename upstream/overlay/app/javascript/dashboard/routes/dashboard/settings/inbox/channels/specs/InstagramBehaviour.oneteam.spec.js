/**
 * OneTeam behaviour spec for connecting an Instagram inbox.
 *
 * Covers the connect screen, sending the agent to Instagram's
 * authorization page, blocking the connection (with a warning and a
 * status link) while Meta inbox creation is restricted, and the error
 * screens after a failed authorization (bad request or other error),
 * which also strip the error from the address.
 */
import { mount, flushPromises } from '@vue/test-utils';
import { ref } from 'vue';
import instagramClient from 'dashboard/api/channel/instagramClient';
import { META_RESTRICTION_STATUS_URL } from 'dashboard/constants/globals';
import Instagram from '../Instagram.vue';

const isMetaInboxCreationDisabled = ref(false);
vi.mock('dashboard/composables/useAccount', () => ({
  useAccount: () => ({ isMetaInboxCreationDisabled }),
}));
const blankKeys = new Set();
vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: key => (blankKeys.has(key) ? '' : key) }),
}));
vi.mock('dashboard/api/channel/instagramClient', () => ({
  default: { generateAuthorization: vi.fn() },
}));

const Button = {
  name: 'Button',
  props: { disabled: Boolean, isLoading: Boolean, label: String },
  emits: ['click'],
  template: '<button @click="$emit(\'click\')">{{ label }}</button>',
};

const mountPage = async () => {
  const wrapper = mount(Instagram, {
    global: {
      stubs: {
        Button,
        Banner: { template: '<div class="banner"><slot /></div>' },
        Icon: true,
      },
      directives: {
        dompurifyHtml: {
          mounted(el, { value }) {
            el.innerHTML = value;
          },
        },
      },
    },
  });
  await wrapper.vm.$nextTick();
  return wrapper;
};

describe('Instagram behaviour', () => {
  beforeEach(() => {
    isMetaInboxCreationDisabled.value = false;
    blankKeys.clear();
    vi.clearAllMocks();
    window.history.replaceState({}, '', '/app/inboxes/new/instagram');
  });

  it('sends the agent to Instagram to authorize', async () => {
    let finish;
    instagramClient.generateAuthorization.mockReturnValue(
      new Promise(resolve => {
        finish = resolve;
      })
    );
    const wrapper = await mountPage();
    expect(wrapper.find('h6').text()).toBe(
      'INBOX_MGMT.ADD.INSTAGRAM.CONNECT_YOUR_INSTAGRAM_PROFILE'
    );
    expect(wrapper.find('.banner').exists()).toBe(false);
    await wrapper.find('button').trigger('click');
    expect(wrapper.findComponent(Button).props()).toEqual(
      expect.objectContaining({ disabled: true, isLoading: true })
    );
    finish({ data: { url: '#instagram-authorize' } });
    await flushPromises();
    expect(window.location.hash).toBe('#instagram-authorize');
  });

  it('blocks connecting while Meta inbox creation is restricted', async () => {
    isMetaInboxCreationDisabled.value = true;
    const wrapper = await mountPage();
    expect(wrapper.findComponent(Button).props('disabled')).toBe(true);
    expect(wrapper.find('.banner').text()).toContain(
      'INBOX_MGMT.ADD.INSTAGRAM.RESTRICTED_WARNING'
    );
    expect(wrapper.find('.banner a').attributes('href')).toBe(
      META_RESTRICTION_STATUS_URL
    );
    await wrapper.find('button').trigger('click');
    expect(instagramClient.generateAuthorization).not.toHaveBeenCalled();
  });

  it('explains a rejected authorization and cleans the address', async () => {
    window.history.replaceState(
      {},
      '',
      '/x?code=400&error_message=Bad%20scope'
    );
    const wrapper = await mountPage();
    expect(wrapper.find('h5').text()).toBe('Bad scope');
    expect(wrapper.find('p').text()).toBe(
      'INBOX_MGMT.ADD.INSTAGRAM.ERROR_AUTH'
    );
    expect(window.location.search).toBe('');
    expect(wrapper.find('button').exists()).toBe(false);

    blankKeys.add('INBOX_MGMT.ADD.INSTAGRAM.ERROR_AUTH');
    window.history.replaceState({}, '', '/x?code=400&error_message=Denied');
    const bare = await mountPage();
    expect(bare.find('h5').text()).toBe('Denied');
    expect(bare.find('p').exists()).toBe(false);
  });

  it('shows other authorization errors', async () => {
    window.history.replaceState(
      {},
      '',
      '/x?code=500&error_message=Server%20down'
    );
    const wrapper = await mountPage();
    expect(wrapper.find('h5').text()).toBe(
      'INBOX_MGMT.ADD.INSTAGRAM.ERROR_MESSAGE'
    );
    expect(wrapper.find('p').text()).toBe('Server down');
  });
});
