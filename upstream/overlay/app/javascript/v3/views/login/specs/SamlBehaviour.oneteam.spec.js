/**
 * OneTeam behaviour spec for the SAML login view.
 *
 * Covers the auth error alert, the CSRF token, hidden redirect and SSO
 * fields, the dark logo, and the back to login route.
 */
import { mount, flushPromises } from '@vue/test-utils';
import { createStore } from 'vuex';
import Saml from '../Saml.vue';
import { useAlert } from 'dashboard/composables';

vi.mock('dashboard/composables', () => ({ useAlert: vi.fn() }));
vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: key => key }) }));

const LinkStub = {
  name: 'RouterLink',
  props: ['to'],
  template: '<a><slot /></a>',
};

const InputStub = {
  name: 'FormInput',
  props: ['modelValue', 'hasError'],
  emits: ['update:modelValue', 'input'],
  template: '<input class="email" />',
};

/**
 * Mounts the view.
 *
 * @param {object} props component props
 * @param {object} config global config
 * @returns {Promise<import('@vue/test-utils').VueWrapper>}
 */
const mountSaml = async (props, config = {}) => {
  const store = createStore({
    getters: { 'globalConfig/get': () => ({ logo: '/l.png', ...config }) },
  });
  const wrapper = mount(Saml, {
    props,
    global: {
      plugins: [store],
      stubs: {
        RouterLink: LinkStub,
        FormInput: InputStub,
        NextButton: true,
      },
    },
  });
  await flushPromises();
  return wrapper;
};

describe('Saml login behaviour', () => {
  afterEach(() => {
    document.head.innerHTML = '';
  });

  it('shows plain login without extras', async () => {
    const wrapper = await mountSaml({});
    expect(useAlert).not.toHaveBeenCalled();
    expect(wrapper.find('input[name="authenticity_token"]').element.value).toBe(
      ''
    );
    expect(wrapper.find('input[name="redirect_url"]').exists()).toBe(false);
    expect(wrapper.findAll('img')).toHaveLength(1);
    expect(wrapper.findComponent(LinkStub).props('to')).toEqual({
      name: 'login',
    });
  });

  it('alerts on an auth error and keeps redirect and SSO details', async () => {
    document.head.innerHTML = '<meta name="csrf-token" content="tok">';
    const wrapper = await mountSaml(
      { authError: 'bad', redirectUrl: '/r', ssoAccountId: '9' },
      { logoDark: '/d.png' }
    );
    expect(useAlert).toHaveBeenCalledWith('LOGIN.SAML.API.ERROR_MESSAGE');
    expect(wrapper.find('section.animate-wiggle').exists()).toBe(true);
    expect(wrapper.find('input[name="authenticity_token"]').element.value).toBe(
      'tok'
    );
    expect(wrapper.find('input[name="redirect_url"]').element.value).toBe('/r');
    expect(wrapper.find('input[name="sso_account_id"]').element.value).toBe(
      '9'
    );
    expect(wrapper.findAll('img')).toHaveLength(2);
    expect(wrapper.findComponent(LinkStub).props('to')).toEqual({
      name: 'login',
      query: { redirect_url: '/r', sso_account_id: '9' },
    });
  });

  it('updates and validates the email', async () => {
    const wrapper = await mountSaml({});
    const input = wrapper.findComponent(InputStub);
    input.vm.$emit('update:modelValue', 'bad');
    input.vm.$emit('input');
    await wrapper.vm.$nextTick();
    expect(input.props('modelValue')).toBe('bad');
    expect(input.props('hasError')).toBe(true);
  });

  it('keeps the redirect without an SSO account', async () => {
    const wrapper = await mountSaml({ redirectUrl: '/r' });
    expect(wrapper.findComponent(LinkStub).props('to')).toEqual({
      name: 'login',
      query: { redirect_url: '/r' },
    });
  });
});
