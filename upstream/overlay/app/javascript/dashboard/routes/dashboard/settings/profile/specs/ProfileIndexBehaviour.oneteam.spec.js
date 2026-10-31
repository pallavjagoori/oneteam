/**
 * OneTeam behaviour spec for the profile settings page.
 *
 * Covers loading the current user into the form, profile and signature
 * updates (including the logout after an email change), avatar changes,
 * the send-message hotkey, the cloud-plan gate on the access token, and
 * which sections show for the profile-update and MFA settings.
 */
import { mount, flushPromises } from '@vue/test-utils';
import ProfileIndex from '../Index.vue';

const env = vi.hoisted(() => ({}));

vi.mock('dashboard/composables', () => ({ useAlert: vi.fn() }));
vi.mock('dashboard/composables/useUISettings', () => ({
  useUISettings: () => ({
    isEditorHotKeyEnabled: key => key === 'enter',
    updateUISettings: env.updateUISettings,
  }),
}));
vi.mock('dashboard/composables/useFontSize', () => ({
  useFontSize: () => ({ currentFontSize: '16px', updateFontSize: vi.fn() }),
}));
vi.mock('shared/composables/useBranding', () => ({
  useBranding: () => ({ replaceInstallationName: text => `branded:${text}` }),
}));
vi.mock('shared/helpers/clipboard', () => ({
  copyTextToClipboard: vi.fn(async () => {}),
}));
vi.mock('dashboard/store/utils/api', async importOriginal => ({
  ...(await importOriginal()),
  clearCookiesOnLogout: vi.fn(),
  parseAPIErrorResponse: error => error?.apiMessage,
}));

const { useAlert } = await import('dashboard/composables');
const { copyTextToClipboard } = await import('shared/helpers/clipboard');
const { clearCookiesOnLogout } = await import('dashboard/store/utils/api');

const stub = (name, props = []) => ({
  name,
  props,
  template: `<div class="${name}"><slot /></div>`,
});

const user = {
  name: 'Jane',
  email: 'jane@acme.test',
  avatar_url: 'https://cdn.test/jane.png',
  display_name: 'JD',
  message_signature: '-- Jane',
  access_token: 'tok-1',
  accounts: [{ id: 1, api_and_webhooks: false }],
};

const mountPage = ({ userId = 1, cloud = false, config = {} } = {}) => {
  env.store = {
    getters: {
      getCurrentUser: env.user,
      getCurrentUserID: userId,
      'globalConfig/get': config,
      'globalConfig/isOnChatwootCloud': cloud,
    },
    dispatch: env.dispatch,
  };
  return mount(ProfileIndex, {
    global: {
      mocks: { $store: env.store },
      stubs: {
        BaseSettingsHeader: stub('BaseSettingsHeader'),
        SectionLayout: stub('SectionLayout', ['title', 'description']),
        UserProfilePicture: stub('UserProfilePicture', ['src', 'name']),
        UserBasicDetails: stub('UserBasicDetails', [
          'name',
          'displayName',
          'email',
          'emailEnabled',
        ]),
        MessageSignature: stub('MessageSignature', ['messageSignature']),
        FontSize: stub('FontSize', ['value']),
        UserLanguageSelect: stub('UserLanguageSelect'),
        RadioCard: stub('RadioCard', ['id', 'label', 'isActive']),
        ChangePassword: stub('ChangePassword'),
        MfaSettingsCard: stub('MfaSettingsCard'),
        ActiveSessions: stub('ActiveSessions'),
        AudioNotifications: stub('AudioNotifications'),
        NotificationPreferences: stub('NotificationPreferences'),
        Policy: stub('Policy', ['permissions']),
        AccessToken: stub('AccessToken', ['value', 'disabled']),
      },
    },
  });
};

const child = (wrapper, name) => wrapper.findComponent({ name });
const sectionTitles = wrapper =>
  wrapper
    .findAllComponents({ name: 'SectionLayout' })
    .map(s => s.props('title'));

describe('Profile settings page', () => {
  beforeEach(() => {
    env.user = { ...user, accounts: [...user.accounts] };
    env.dispatch = vi.fn(async () => true);
    env.updateUISettings = vi.fn();
    window.chatwootConfig = {};
  });

  it('fills the form from the current user', async () => {
    const wrapper = mountPage();
    await flushPromises();
    expect(child(wrapper, 'UserProfilePicture').props()).toEqual({
      src: 'https://cdn.test/jane.png',
      name: 'Jane',
    });
    expect(child(wrapper, 'UserBasicDetails').props()).toEqual({
      name: 'Jane',
      displayName: 'JD',
      email: 'jane@acme.test',
      emailEnabled: true,
    });
    expect(child(wrapper, 'MessageSignature').props('messageSignature')).toBe(
      '-- Jane'
    );
    expect(child(wrapper, 'FontSize').props('value')).toBe('16px');
    expect(child(wrapper, 'AccessToken').props()).toEqual({
      value: 'tok-1',
      disabled: false,
    });
    expect(wrapper.findAllComponents({ name: 'Policy' })).toHaveLength(2);
  });

  it('leaves the form empty without a signed-in user id', () => {
    const wrapper = mountPage({ userId: null });
    expect(child(wrapper, 'UserBasicDetails').props('name')).toBe('');
  });

  it('hides the password section and email when profile updates are disabled', () => {
    const titles = sectionTitles(mountPage());
    expect(titles).toContain('PROFILE_SETTINGS.FORM.PASSWORD_SECTION.TITLE');

    const wrapper = mountPage({ config: { disableUserProfileUpdate: true } });
    expect(sectionTitles(wrapper)).not.toContain(
      'PROFILE_SETTINGS.FORM.PASSWORD_SECTION.TITLE'
    );
    expect(child(wrapper, 'UserBasicDetails').props('emailEnabled')).toBe(
      false
    );
    expect(child(wrapper, 'ChangePassword').exists()).toBe(false);
  });

  it('shows the security section only when MFA is enabled', () => {
    expect(child(mountPage(), 'MfaSettingsCard').exists()).toBe(false);
    window.chatwootConfig = { isMfaEnabled: 'true' };
    expect(child(mountPage(), 'MfaSettingsCard').exists()).toBe(true);
    window.chatwootConfig = undefined;
    expect(child(mountPage(), 'MfaSettingsCard').exists()).toBe(false);
  });

  it('updates the profile, keeping blank fields and the new avatar', async () => {
    const wrapper = mountPage();
    child(wrapper, 'UserProfilePicture').vm.$emit('change', {
      file: 'FILE',
      url: 'blob:new',
    });
    await flushPromises();
    expect(child(wrapper, 'UserProfilePicture').props('src')).toBe('blob:new');

    child(wrapper, 'UserBasicDetails').vm.$emit('updateUser', {
      name: '',
      email: 'jane@acme.test',
      displayName: '',
    });
    await flushPromises();
    expect(env.dispatch).toHaveBeenCalledWith('updateProfile', {
      name: 'Jane',
      email: 'jane@acme.test',
      displayName: 'JD',
      avatar: 'FILE',
    });
    expect(useAlert).toHaveBeenCalledWith('PROFILE_SETTINGS.UPDATE_SUCCESS');
    expect(clearCookiesOnLogout).not.toHaveBeenCalled();
  });

  it('keeps the old email when a blank one is emitted, but treats it as changed', async () => {
    // The real form requires an email, so this only pins the fallback: the
    // change check compares the raw input, so a blank email still logs out.
    const wrapper = mountPage();
    child(wrapper, 'UserBasicDetails').vm.$emit('updateUser', {
      name: 'Janet',
      email: '',
      displayName: 'JD',
    });
    await flushPromises();
    expect(env.dispatch.mock.lastCall[1].email).toBe('jane@acme.test');
    expect(useAlert).toHaveBeenCalledWith(
      'PROFILE_SETTINGS.AFTER_EMAIL_CHANGED'
    );
    expect(clearCookiesOnLogout).toHaveBeenCalled();
  });

  it('logs out after a successful email change', async () => {
    const wrapper = mountPage();
    child(wrapper, 'UserBasicDetails').vm.$emit('updateUser', {
      name: 'Jane',
      email: 'new@acme.test',
      displayName: 'JD',
    });
    await flushPromises();
    expect(useAlert.mock.lastCall[0]).not.toBe(
      'PROFILE_SETTINGS.UPDATE_SUCCESS'
    );
    expect(clearCookiesOnLogout).toHaveBeenCalled();
  });

  it('reports update errors from the API or a fallback, without logging out', async () => {
    const wrapper = mountPage();
    env.dispatch.mockRejectedValueOnce({ apiMessage: 'Email taken' });
    child(wrapper, 'UserBasicDetails').vm.$emit('updateUser', {
      name: 'Jane',
      email: 'new@acme.test',
      displayName: 'JD',
    });
    await flushPromises();
    expect(useAlert).toHaveBeenLastCalledWith('Email taken');
    expect(clearCookiesOnLogout).not.toHaveBeenCalled();

    env.dispatch.mockRejectedValueOnce({});
    child(wrapper, 'UserBasicDetails').vm.$emit('updateUser', {
      name: 'Jane',
      email: 'jane@acme.test',
      displayName: 'JD',
    });
    await flushPromises();
    expect(useAlert.mock.lastCall[0]).not.toBe('Email taken');
    expect(useAlert.mock.lastCall[0]).toBeTruthy();
  });

  it('updates the message signature', async () => {
    const wrapper = mountPage();
    child(wrapper, 'MessageSignature').vm.$emit('updateSignature', '-- J');
    await flushPromises();
    expect(env.dispatch).toHaveBeenCalledWith('updateProfile', {
      message_signature: '-- J',
    });
    expect(useAlert).toHaveBeenCalledTimes(1);
  });

  it('deletes the profile picture', async () => {
    const wrapper = mountPage();
    env.dispatch.mockRejectedValueOnce(new Error('nope'));
    child(wrapper, 'UserProfilePicture').vm.$emit('delete');
    await flushPromises();
    expect(child(wrapper, 'UserProfilePicture').props('src')).toBe(
      'https://cdn.test/jane.png'
    );
    const failure = useAlert.mock.lastCall[0];

    child(wrapper, 'UserProfilePicture').vm.$emit('delete');
    await flushPromises();
    expect(env.dispatch).toHaveBeenCalledWith('deleteAvatar');
    expect(child(wrapper, 'UserProfilePicture').props('src')).toBe('');
    expect(useAlert.mock.lastCall[0]).not.toBe(failure);
  });

  it('switches the send-message hotkey', async () => {
    const wrapper = mountPage();
    const cards = wrapper.findAllComponents({ name: 'RadioCard' });
    expect(cards.map(c => [c.props('id'), c.props('isActive')])).toEqual([
      ['enter', true],
      ['cmd_enter', false],
    ]);
    expect(wrapper.find('img').attributes('src')).toBe(
      '/assets/images/dashboard/profile/hot-key-enter.svg'
    );
    cards[1].vm.$emit('select', 'cmd_enter');
    expect(env.updateUISettings).toHaveBeenCalledWith({
      editor_message_key: 'cmd_enter',
    });
    expect(useAlert).toHaveBeenCalled();
    expect(wrapper.vm.hotKeys.map(k => !!k.active)).toEqual([false, true]);
  });

  it('copies and resets the access token', async () => {
    const wrapper = mountPage();
    const token = child(wrapper, 'AccessToken');
    expect(
      wrapper
        .findAllComponents({ name: 'SectionLayout' })
        .at(-1)
        .props('description')
    ).toMatch(/^branded:/);

    token.vm.$emit('onCopy', 'tok-1');
    await flushPromises();
    expect(copyTextToClipboard).toHaveBeenCalledWith('tok-1');

    token.vm.$emit('onReset');
    await flushPromises();
    expect(env.dispatch).toHaveBeenCalledWith('resetAccessToken');
    const success = useAlert.mock.lastCall[0];

    env.dispatch.mockResolvedValueOnce(false);
    token.vm.$emit('onReset');
    await flushPromises();
    expect(useAlert.mock.lastCall[0]).not.toBe(success);
  });

  it('locks the access token on cloud plans without API access', async () => {
    const wrapper = mountPage({ cloud: true });
    const token = child(wrapper, 'AccessToken');
    expect(token.props('disabled')).toBe(true);
    expect(
      wrapper
        .findAllComponents({ name: 'SectionLayout' })
        .at(-1)
        .props('description')
    ).not.toMatch(/^branded:/);

    token.vm.$emit('onCopy', 'tok-1');
    token.vm.$emit('onReset');
    await flushPromises();
    expect(copyTextToClipboard).not.toHaveBeenCalled();
    expect(env.dispatch).not.toHaveBeenCalled();
  });

  it('allows the access token on cloud when an account has API access', () => {
    env.user.accounts.push({ id: 2, api_and_webhooks: true });
    const wrapper = mountPage({ cloud: true });
    expect(child(wrapper, 'AccessToken').props('disabled')).toBe(false);
  });
});
