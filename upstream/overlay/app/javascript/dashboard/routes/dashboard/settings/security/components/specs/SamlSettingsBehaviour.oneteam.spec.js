/**
 * OneTeam behaviour spec for the SAML settings section.
 *
 * Covers loading (feature gate, existing settings, 404 and other errors),
 * the metadata URL / manual tabs and their validation, saving (create,
 * update, backend errors), refreshing metadata and disabling SAML.
 */
import { mount, flushPromises } from '@vue/test-utils';
import SamlSettings from '../SamlSettings.vue';

const env = vi.hoisted(() => ({}));

vi.mock('vue-i18n', async importOriginal => ({
  ...(await importOriginal()),
  useI18n: () => ({ t: key => key }),
}));
vi.mock('dashboard/composables', () => ({ useAlert: vi.fn() }));
vi.mock('dashboard/composables/useAccount', () => ({
  useAccount: () => ({ isCloudFeatureEnabled: flag => env.features[flag] }),
}));
vi.mock('dashboard/api/samlSettings', () => ({
  default: {
    get: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(async () => ({})),
    refresh: vi.fn(),
  },
}));

const { useAlert } = await import('dashboard/composables');
const { default: API } = await import('dashboard/api/samlSettings');

const S = 'SECURITY_SETTINGS.SAML';

const ToggleSection = {
  name: 'SettingsToggleSection',
  props: ['modelValue', 'header', 'description', 'beta', 'hideToggle'],
  emits: ['update:modelValue'],
  template:
    '<section><slot name="hiddenToggle" /><div class="editor"><slot name="editor" /></div></section>',
};
const TabBar = {
  name: 'TabBar',
  props: ['tabs', 'initialActiveTab'],
  emits: ['tabChanged'],
  template: '<nav />',
};
const WithLabel = {
  name: 'WithLabel',
  props: ['name', 'label', 'helpMessage', 'hasError', 'errorMessage'],
  template:
    '<div class="field" :data-name="name" :data-error="errorMessage"><slot /></div>',
};
const field = tag => ({
  name: tag,
  props: ['modelValue', 'modelModifiers', 'type', 'placeholder', 'rows'],
  emits: ['update:modelValue'],
  template: `<${tag === 'TextArea' ? 'textarea' : 'input'} :value="modelValue" @input="$emit('update:modelValue', $event.target.value)" />`,
});
const ButtonStub = {
  name: 'NextButton',
  props: ['label', 'type', 'isLoading'],
  emits: ['click'],
  template:
    '<button :type="type" :data-label="label" :data-loading="String(!!isLoading)" @click="type === \'button\' && $emit(\'click\')">{{ label }}</button>',
};

const mountSaml = () =>
  mount(SamlSettings, {
    global: {
      config: {
        errorHandler: error => {
          env.errors.push(error);
        },
      },
      stubs: {
        SettingsToggleSection: ToggleSection,
        TabBar,
        WithLabel,
        TextInput: field('TextInput'),
        TextArea: field('TextArea'),
        NextButton: ButtonStub,
        Spinner: { template: '<i class="spinner" />' },
        SamlInfoSection: {
          name: 'SamlInfoSection',
          props: ['fingerprint', 'spEntityId'],
          template: '<div class="info" />',
        },
        SamlAttributeMap: { template: '<div class="map" />' },
      },
    },
  });

const fieldInput = (wrapper, name) =>
  wrapper.find(
    `.field[data-name="${name}"] input, .field[data-name="${name}"] textarea`
  );
const fieldError = (wrapper, name) =>
  wrapper.find(`.field[data-name="${name}"]`).attributes('data-error');
const toggle = wrapper => wrapper.findComponent(ToggleSection);
const submit = async wrapper => {
  await wrapper.find('form').trigger('submit');
  await flushPromises();
};

const saved = {
  id: 5,
  sso_url: 'https://idp.test/sso',
  certificate: 'CERT',
  idp_entity_id: 'idp',
  sp_entity_id: 'sp',
  fingerprint: 'AA:BB',
};

describe('SamlSettings behaviour', () => {
  beforeEach(() => {
    env.features = { saml: true };
    env.errors = [];
    API.get.mockResolvedValue({ data: {} });
  });

  it('does nothing without the SAML feature', async () => {
    env.features = { saml: false };
    const wrapper = mountSaml();
    await flushPromises();
    expect(API.get).not.toHaveBeenCalled();
    expect(wrapper.find('.spinner').exists()).toBe(true);
    expect(toggle(wrapper).props('hideToggle')).toBe(true);
  });

  it('shows a spinner while loading and keeps defaults with no settings', async () => {
    let resolve;
    API.get.mockReturnValueOnce(
      new Promise(r => {
        resolve = r;
      })
    );
    const wrapper = mountSaml();
    expect(wrapper.find('.spinner').exists()).toBe(true);
    resolve({ data: {} });
    await flushPromises();
    expect(wrapper.find('.spinner').exists()).toBe(false);
    expect(toggle(wrapper).props('modelValue')).toBe(false);
    expect(wrapper.find('form').exists()).toBe(false);
  });

  it('loads manual settings into the manual tab', async () => {
    API.get.mockResolvedValueOnce({ data: saved });
    const wrapper = mountSaml();
    await flushPromises();
    expect(toggle(wrapper).props('modelValue')).toBe(true);
    expect(wrapper.findComponent({ name: 'SamlInfoSection' }).props()).toEqual({
      fingerprint: 'AA:BB',
      spEntityId: 'sp',
    });
    expect(wrapper.findComponent(TabBar).props('initialActiveTab')).toBe(1);
    expect(wrapper.findComponent(TabBar).props('tabs')).toEqual([
      { label: `${S}.SOURCE.METADATA_URL`, index: 0 },
      { label: `${S}.SOURCE.MANUAL`, index: 1 },
    ]);
    expect(fieldInput(wrapper, 'ssoUrl').element.value).toBe(
      'https://idp.test/sso'
    );
    expect(fieldInput(wrapper, 'certificate').element.value).toBe('CERT');
    expect(fieldInput(wrapper, 'idpEntityId').element.value).toBe('idp');
    expect(wrapper.find(`[data-label="${S}.REFRESH_BUTTON"]`).exists()).toBe(
      false
    );
  });

  it('loads metadata URL settings and defaults missing fields', async () => {
    API.get.mockResolvedValueOnce({
      data: { id: 6, sso_url: 'x', metadata_url: 'https://idp.test/meta' },
    });
    const wrapper = mountSaml();
    await flushPromises();
    expect(wrapper.findComponent(TabBar).props('initialActiveTab')).toBe(0);
    expect(fieldInput(wrapper, 'metadataUrl').element.value).toBe(
      'https://idp.test/meta'
    );
    expect(wrapper.findComponent({ name: 'SamlInfoSection' }).props()).toEqual({
      fingerprint: '',
      spEntityId: '',
    });
    expect(wrapper.find(`[data-label="${S}.REFRESH_BUTTON"]`).exists()).toBe(
      true
    );
  });

  it('ignores 404s but alerts on other load errors', async () => {
    API.get.mockRejectedValueOnce({ response: { status: 404 } });
    mountSaml();
    await flushPromises();
    expect(useAlert).not.toHaveBeenCalled();

    API.get.mockRejectedValueOnce(new Error('offline'));
    mountSaml();
    await flushPromises();
    expect(useAlert).toHaveBeenCalledWith(`${S}.API.ERROR_LOADING`);
  });

  it('validates and creates settings from a metadata URL', async () => {
    const wrapper = mountSaml();
    await flushPromises();
    toggle(wrapper).vm.$emit('update:modelValue', true);
    await flushPromises();
    expect(wrapper.find('form').exists()).toBe(true);

    await submit(wrapper);
    expect(fieldError(wrapper, 'metadataUrl')).toBe(
      `${S}.VALIDATION.METADATA_URL_ERROR`
    );
    expect(API.create).not.toHaveBeenCalled();

    await fieldInput(wrapper, 'metadataUrl').setValue('  https://idp.test/m  ');
    API.create.mockResolvedValueOnce({
      data: {
        id: 9,
        metadata_url: 'https://idp.test/m',
        sso_url: 'https://idp.test/sso',
      },
    });
    await submit(wrapper);
    expect(API.create).toHaveBeenCalledWith({
      metadata_url: 'https://idp.test/m',
      role_mappings: {},
    });
    expect(useAlert).toHaveBeenCalledWith(`${S}.API.SUCCESS`);
    expect(fieldError(wrapper, 'metadataUrl')).toBe('');

    // A saved record switches later saves to update.
    API.update.mockResolvedValueOnce({ data: null });
    await submit(wrapper);
    expect(API.update).toHaveBeenCalledTimes(1);
  });

  it('validates every manual field and saves them', async () => {
    const wrapper = mountSaml();
    await flushPromises();
    toggle(wrapper).vm.$emit('update:modelValue', true);
    await flushPromises();
    wrapper.findComponent(TabBar).vm.$emit('tabChanged', { index: 1 });
    await flushPromises();
    await submit(wrapper);
    expect(fieldError(wrapper, 'ssoUrl')).toBe(`${S}.VALIDATION.SSO_URL_ERROR`);
    expect(fieldError(wrapper, 'idpEntityId')).toBe(
      `${S}.VALIDATION.IDP_ENTITY_ID_ERROR`
    );
    expect(fieldError(wrapper, 'certificate')).toBe(
      `${S}.VALIDATION.CERTIFICATE_ERROR`
    );

    // Switching tabs resets validation.
    wrapper.findComponent(TabBar).vm.$emit('tabChanged', { index: 0 });
    await flushPromises();
    expect(fieldError(wrapper, 'metadataUrl')).toBe('');
    wrapper.findComponent(TabBar).vm.$emit('tabChanged', { index: 1 });
    await flushPromises();
    expect(fieldError(wrapper, 'ssoUrl')).toBe('');

    await fieldInput(wrapper, 'ssoUrl').setValue('https://idp.test/sso');
    await fieldInput(wrapper, 'idpEntityId').setValue('idp');
    await fieldInput(wrapper, 'certificate').setValue('CERT');
    API.create.mockResolvedValueOnce({ data: saved });
    await submit(wrapper);
    expect(API.create).toHaveBeenCalledWith({
      metadata_url: '',
      sso_url: 'https://idp.test/sso',
      certificate: 'CERT',
      idp_entity_id: 'idp',
      role_mappings: {},
    });
    expect(wrapper.findComponent({ name: 'SamlInfoSection' }).props()).toEqual({
      fingerprint: 'AA:BB',
      spEntityId: 'sp',
    });
  });

  it('defaults fingerprint and SP entity from a sparse save response', async () => {
    API.get.mockResolvedValueOnce({ data: saved });
    const wrapper = mountSaml();
    await flushPromises();
    API.update.mockResolvedValueOnce({ data: { id: 5, sso_url: 'y' } });
    await submit(wrapper);
    expect(API.update).toHaveBeenCalled();
    expect(wrapper.findComponent({ name: 'SamlInfoSection' }).props()).toEqual({
      fingerprint: '',
      spEntityId: '',
    });
  });

  it.each([
    [{ response: { data: { errors: ['Bad cert', 'other'] } } }, 'Bad cert'],
    [{ response: { data: { errors: 'Bad url' } } }, 'Bad url'],
    [new Error('offline'), `${S}.API.ERROR`],
  ])('alerts on save failure %#', async (error, message) => {
    API.get.mockResolvedValueOnce({ data: saved });
    const wrapper = mountSaml();
    await flushPromises();
    let resolveFail;
    API.update.mockReturnValueOnce(
      new Promise((_, reject) => {
        resolveFail = () => reject(error);
      })
    );
    await wrapper.find('form').trigger('submit');
    expect(
      wrapper
        .find(`[data-label="${S}.UPDATE_BUTTON"]`)
        .attributes('data-loading')
    ).toBe('true');
    resolveFail();
    await flushPromises();
    expect(useAlert).toHaveBeenCalledWith(message);
    expect(env.errors).toEqual([error]);
    expect(
      wrapper
        .find(`[data-label="${S}.UPDATE_BUTTON"]`)
        .attributes('data-loading')
    ).toBe('false');
  });

  it('refreshes metadata', async () => {
    API.get.mockResolvedValueOnce({
      data: { id: 6, sso_url: 'x', metadata_url: 'https://idp.test/meta' },
    });
    const wrapper = mountSaml();
    await flushPromises();
    const refresh = () => wrapper.find(`[data-label="${S}.REFRESH_BUTTON"]`);

    API.refresh.mockResolvedValueOnce({
      data: { metadata_url: 'https://idp.test/meta', fingerprint: 'CC' },
    });
    await refresh().trigger('click');
    await flushPromises();
    expect(useAlert).toHaveBeenLastCalledWith(`${S}.API.REFRESH_SUCCESS`);
    expect(
      wrapper.findComponent({ name: 'SamlInfoSection' }).props('fingerprint')
    ).toBe('CC');

    API.refresh.mockResolvedValueOnce({
      data: { metadata_url: 'https://idp.test/meta' },
    });
    await refresh().trigger('click');
    await flushPromises();
    expect(
      wrapper.findComponent({ name: 'SamlInfoSection' }).props('fingerprint')
    ).toBe('');

    API.refresh.mockRejectedValueOnce({
      response: { data: { errors: ['Unreachable'] } },
    });
    await refresh().trigger('click');
    await flushPromises();
    expect(useAlert).toHaveBeenLastCalledWith('Unreachable');

    let fail;
    API.refresh.mockReturnValueOnce(
      new Promise((_, reject) => {
        fail = () => reject(new Error('offline'));
      })
    );
    await refresh().trigger('click');
    expect(refresh().attributes('data-loading')).toBe('true');
    fail();
    await flushPromises();
    expect(useAlert).toHaveBeenLastCalledWith(`${S}.API.REFRESH_ERROR`);
    expect(refresh().attributes('data-loading')).toBe('false');
  });

  it('disabling clears the form and deletes the settings', async () => {
    API.get.mockResolvedValueOnce({ data: saved });
    const wrapper = mountSaml();
    await flushPromises();
    toggle(wrapper).vm.$emit('update:modelValue', false);
    await flushPromises();
    expect(API.delete).toHaveBeenCalled();
    expect(useAlert).toHaveBeenCalledWith(`${S}.API.DISABLED`);
    expect(wrapper.find('form').exists()).toBe(false);

    // Re-enabling starts from an empty metadata URL form and creates anew.
    toggle(wrapper).vm.$emit('update:modelValue', true);
    await flushPromises();
    expect(fieldInput(wrapper, 'metadataUrl').element.value).toBe('');
    expect(wrapper.findComponent({ name: 'SamlInfoSection' }).props()).toEqual({
      fingerprint: '',
      spEntityId: '',
    });
  });

  it('surfaces delete failures', async () => {
    API.get.mockResolvedValueOnce({ data: saved });
    const wrapper = mountSaml();
    await flushPromises();
    const error = new Error('locked');
    API.delete.mockRejectedValueOnce(error);
    toggle(wrapper).vm.$emit('update:modelValue', false);
    await flushPromises();
    expect(useAlert).toHaveBeenCalledWith(`${S}.API.ERROR`);
    expect(env.errors).toEqual([error]);
  });
});
