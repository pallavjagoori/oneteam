/**
 * OneTeam behaviour spec for connecting a TikTok inbox.
 *
 * Covers the connect screen (with the North America warning on
 * Chatwoot Cloud only), sending the agent to TikTok's authorization
 * page, and the error screens after a failed authorization (bad request
 * or other error), which also strip the error from the address.
 */
import { mount, flushPromises } from '@vue/test-utils';
import { ref } from 'vue';
import tiktokClient from 'dashboard/api/channel/tiktokClient';
import Tiktok from '../Tiktok.vue';

const isOnChatwootCloud = ref(false);
vi.mock('dashboard/composables/useAccount', () => ({
  useAccount: () => ({ isOnChatwootCloud }),
}));
const blankKeys = new Set();
vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: key => (blankKeys.has(key) ? '' : key) }),
}));
vi.mock('dashboard/api/channel/tiktokClient', () => ({
  default: { generateAuthorization: vi.fn() },
}));

const Button = {
  name: 'Button',
  props: { disabled: Boolean, isLoading: Boolean, label: String },
  emits: ['click'],
  template:
    '<button :disabled="disabled" @click="$emit(\'click\')">{{ label }}</button>',
};

const mountPage = () =>
  mount(Tiktok, {
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

describe('Tiktok behaviour', () => {
  beforeEach(() => {
    isOnChatwootCloud.value = false;
    window.history.replaceState({}, '', '/app/inboxes/new/tiktok');
  });

  it('asks to connect and warns cloud users', () => {
    const wrapper = mountPage();
    expect(wrapper.find('h6').text()).toBe(
      'INBOX_MGMT.ADD.TIKTOK.CONNECT_YOUR_TIKTOK_PROFILE'
    );
    expect(wrapper.find('.banner').exists()).toBe(false);
    isOnChatwootCloud.value = true;
    expect(mountPage().find('.banner').text()).toContain(
      'INBOX_MGMT.ADD.TIKTOK.NORTH_AMERICA_WARNING'
    );
  });

  it('sends the agent to TikTok to authorize', async () => {
    let finish;
    tiktokClient.generateAuthorization.mockReturnValue(
      new Promise(resolve => {
        finish = resolve;
      })
    );
    const wrapper = mountPage();
    await wrapper.find('button').trigger('click');
    expect(wrapper.findComponent(Button).props()).toEqual(
      expect.objectContaining({ disabled: true, isLoading: true })
    );
    finish({ data: { url: '#tiktok-authorize' } });
    await flushPromises();
    expect(window.location.hash).toBe('#tiktok-authorize');
  });

  it('explains a rejected authorization and cleans the address', async () => {
    window.history.replaceState(
      {},
      '',
      '/app/inboxes/new/tiktok?code=400&error_message=Bad%20scope'
    );
    const wrapper = mountPage();
    await wrapper.vm.$nextTick();
    expect(wrapper.find('h5').text()).toBe('Bad scope');
    expect(wrapper.find('p').text()).toBe('INBOX_MGMT.ADD.TIKTOK.ERROR_AUTH');
    expect(window.location.search).toBe('');
    expect(wrapper.find('button').exists()).toBe(false);

    // Without a translated explanation only the message is shown.
    blankKeys.add('INBOX_MGMT.ADD.TIKTOK.ERROR_AUTH');
    window.history.replaceState({}, '', '/x?code=400&error_message=Denied');
    const bare = mountPage();
    await bare.vm.$nextTick();
    expect(bare.find('h5').text()).toBe('Denied');
    expect(bare.find('p').exists()).toBe(false);
    blankKeys.clear();
  });

  it('shows other authorization errors', async () => {
    window.history.replaceState(
      {},
      '',
      '/app/inboxes/new/tiktok?code=500&error_message=Server%20down'
    );
    const wrapper = mountPage();
    await wrapper.vm.$nextTick();
    expect(wrapper.find('h5').text()).toBe(
      'INBOX_MGMT.ADD.TIKTOK.ERROR_MESSAGE'
    );
    expect(wrapper.find('p').text()).toBe('Server down');
  });
});
