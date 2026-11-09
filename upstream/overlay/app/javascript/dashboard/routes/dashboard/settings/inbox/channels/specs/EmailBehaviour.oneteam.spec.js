/**
 * OneTeam behaviour spec for the email channel provider picker.
 *
 * Covers which providers are offered on self-hosted and Chatwoot
 * instances, ignoring clicks on disabled providers, and opening the
 * Microsoft, Google and other provider screens.
 */
import { computed } from 'vue';
import { mount } from '@vue/test-utils';
import Email from '../Email.vue';

const env = vi.hoisted(() => ({}));

vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: key => key }) }));
vi.mock('dashboard/composables/store', () => ({
  useStoreGetters: () => ({
    'globalConfig/get': computed(() => env.config),
    'globalConfig/isAChatwootInstance': computed(() => env.isCloud),
  }),
}));

/**
 * Mounts the picker.
 *
 * @returns {import('@vue/test-utils').VueWrapper}
 */
const mountPicker = () =>
  mount(Email, {
    global: {
      mocks: { $t: key => key },
      stubs: {
        PageHeader: true,
        ChannelSelector: {
          name: 'ChannelSelector',
          props: { title: String, disabled: Boolean },
          emits: ['click'],
          template: '<button @click="$emit(\'click\')">{{ title }}</button>',
        },
        Microsoft: { template: '<div class="microsoft" />' },
        Google: { template: '<div class="google" />' },
        ForwardToOption: { template: '<div class="forward" />' },
      },
    },
  });

/**
 * Lists the offered provider titles.
 *
 * @param {import('@vue/test-utils').VueWrapper} wrapper mounted picker
 * @returns {string[]}
 */
const titles = wrapper =>
  wrapper
    .findAllComponents({ name: 'ChannelSelector' })
    .map(c => c.props('title'));

describe('Email channel picker behaviour', () => {
  beforeEach(() => {
    env.config = {};
    env.isCloud = false;
    window.chatwootConfig = {};
  });

  it('offers only enabled providers on self-hosted installs', () => {
    expect(titles(mountPicker())).toEqual([
      'INBOX_MGMT.EMAIL_PROVIDERS.OTHER_PROVIDERS.TITLE',
    ]);
    env.config = { azureAppId: 'az' };
    window.chatwootConfig = { googleOAuthClientId: 'g' };
    expect(titles(mountPicker())).toHaveLength(3);
  });

  it('shows disabled providers on Chatwoot and ignores their clicks', async () => {
    env.isCloud = true;
    const wrapper = mountPicker();
    const selectors = wrapper.findAllComponents({ name: 'ChannelSelector' });
    expect(selectors.map(c => c.props('disabled'))).toEqual([
      true,
      true,
      false,
    ]);
    await selectors[0].trigger('click');
    expect(wrapper.find('.microsoft').exists()).toBe(false);
    await selectors[2].trigger('click');
    expect(wrapper.find('.forward').exists()).toBe(true);
  });

  it.each([
    [0, '.microsoft'],
    [1, '.google'],
  ])('opens the chosen OAuth provider', async (index, selector) => {
    env.config = { azureAppId: 'az' };
    window.chatwootConfig = { googleOAuthClientId: 'g' };
    const wrapper = mountPicker();
    await wrapper.findAll('button')[index].trigger('click');
    expect(wrapper.find(selector).exists()).toBe(true);
  });
});
