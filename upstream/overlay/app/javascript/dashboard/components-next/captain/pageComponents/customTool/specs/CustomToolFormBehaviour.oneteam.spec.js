/**
 * OneTeam behaviour spec for the Captain custom tool form.
 *
 * Child inputs are stubbed and the risk helpers are controlled. Covers
 * filling the form when editing, validation (title length, required
 * fields, invalid headers or parameters), parameters including the
 * verified email source, the email verification switch, the risk
 * warning dialog, and testing the endpoint.
 */
import { mount, flushPromises } from '@vue/test-utils';
import CustomToolForm from '../CustomToolForm.vue';

const env = vi.hoisted(() => ({}));

vi.mock('vue-router', async importOriginal => ({
  ...(await importOriginal()),
  useRoute: () => ({ params: { assistantId: '3' } }),
}));
vi.mock('dashboard/api/captain/customTools', () => ({
  default: { test: (...args) => env.test(...args) },
}));
vi.mock('../toolRisk', () => ({
  RISK_LEVELS: { NONE: 'none', MEDIUM: 'medium', HIGH: 'high' },
  toolRiskLevel: () => env.risk,
  isEmailLikeParam: param => param.name === 'email',
}));

const field = name => ({
  name,
  props: [
    'modelValue',
    'label',
    'message',
    'messageType',
    'options',
    'disabled',
  ],
  emits: ['update:modelValue'],
  template: '<div :data-label="label" />',
});
const Button = {
  name: 'Button',
  props: ['label', 'icon', 'disabled', 'isLoading'],
  emits: ['click'],
  template:
    '<button type="button" :data-icon="icon" :disabled="disabled" @click="$emit(\'click\')">{{ label }}</button>',
};
const row = name => ({
  name,
  props: ['name', 'type', 'description', 'required', 'suggestVerifiedEmail'],
  emits: ['update:name', 'remove', 'useVerifiedEmail'],
  methods: { validate: () => env.paramsValid },
  template: '<li class="param" />',
});

const mountForm = async (props = {}) => {
  const wrapper = mount(CustomToolForm, {
    props,
    global: {
      stubs: {
        Input: field('Input'),
        TextArea: field('TextArea'),
        ComboBox: field('ComboBox'),
        Switch: field('Switch'),
        Button,
        AuthConfig: {
          name: 'AuthConfig',
          props: ['authType', 'authConfig'],
          template: '<div />',
        },
        HeadersConfig: {
          name: 'HeadersConfig',
          props: ['headers'],
          emits: ['update:headers'],
          methods: { validate: () => env.headersValid },
          template: '<div />',
        },
        ParamRow: row('ParamRow'),
        VerifiedParamRow: row('VerifiedParamRow'),
        ToolFormSection: {
          name: 'ToolFormSection',
          props: ['open', 'title', 'summary'],
          emits: ['update:open'],
          template: '<section :data-title="title"><slot /></section>',
        },
        Dialog: {
          name: 'Dialog',
          props: ['description'],
          emits: ['confirm'],
          methods: {
            open: () => env.dialogOpen(),
            close: () => env.dialogClose(),
          },
          template: '<div class="dialog" />',
        },
      },
    },
  });
  await flushPromises();
  return wrapper;
};

const inputs = wrapper => wrapper.findAllComponents({ name: 'Input' });
const areas = wrapper => wrapper.findAllComponents({ name: 'TextArea' });
const combos = wrapper => wrapper.findAllComponents({ name: 'ComboBox' });
const sections = wrapper =>
  wrapper.findAllComponents({ name: 'ToolFormSection' });
const params = wrapper => wrapper.findAll('.param');
const button = (wrapper, icon) =>
  wrapper.findAllComponents(Button).find(b => b.props('icon') === icon);
const fill = async (
  wrapper,
  { title = 'Lookup', url = 'https://api.x' } = {}
) => {
  inputs(wrapper)[0].vm.$emit('update:modelValue', title);
  inputs(wrapper)[1].vm.$emit('update:modelValue', url);
  await flushPromises();
};
const submit = async wrapper => {
  await wrapper.find('form').trigger('submit');
  await flushPromises();
};

describe('CustomToolForm behaviour', () => {
  beforeEach(() => {
    env.risk = 'none';
    env.headersValid = true;
    env.paramsValid = true;
    env.dialogOpen = vi.fn();
    env.dialogClose = vi.fn();
    env.test = vi.fn(() => Promise.resolve({ data: { status: 200 } }));
  });

  it('starts empty in create mode', async () => {
    const wrapper = await mountForm();
    expect(inputs(wrapper)[0].props('modelValue')).toBe('');
    expect(combos(wrapper)[0].props('modelValue')).toBe('GET');
    expect(
      combos(wrapper)[0]
        .props('options')
        .map(o => o.value)
    ).toEqual(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']);
    expect(
      combos(wrapper)[1]
        .props('options')
        .map(o => o.value)
    ).toEqual(['none', 'bearer', 'basic', 'api_key']);
    expect(sections(wrapper)[2].props('title')).toBe(
      'CAPTAIN.CUSTOM_TOOLS.FORM.RESPONSE_TEMPLATE.LABEL'
    );
    expect(areas(wrapper)).toHaveLength(2);
    expect(button(wrapper, 'i-lucide-play').props('disabled')).toBe(true);
  });

  it('fills the form when editing a tool', async () => {
    const wrapper = await mountForm({
      mode: 'edit',
      tool: {
        id: 1,
        title: 'Orders',
        description: 'Find orders',
        endpoint_url: 'https://api.x/{{ id }}',
        http_method: 'POST',
        request_template: '{}',
        response_template: 'ok',
        auth_type: 'bearer',
        auth_config: { token: 't' },
        headers: { A: '1', B: '2' },
        param_schema: [{ name: 'id', type: 'string' }],
        settings: { requires_email_verification: true },
      },
    });
    expect(inputs(wrapper)[0].props('modelValue')).toBe('Orders');
    expect(areas(wrapper).map(a => a.props('modelValue'))).toEqual([
      'Find orders',
      '{}',
      'ok',
    ]);
    expect(sections(wrapper).map(s => s.props('summary'))).toEqual([
      '2',
      '1',
      undefined,
    ]);
    expect(sections(wrapper)[2].props('title')).toBe(
      'CAPTAIN.CUSTOM_TOOLS.FORM.SECTIONS.TEMPLATES'
    );
    expect(wrapper.findComponent({ name: 'Switch' }).props('modelValue')).toBe(
      true
    );
    expect(wrapper.text()).toContain('CAPTAIN.CUSTOM_TOOLS.TEST.DISABLED_HINT');
    expect(button(wrapper, 'i-lucide-play').props('disabled')).toBe(true);
  });

  it('uses defaults for missing fields when editing', async () => {
    const wrapper = await mountForm({ mode: 'edit', tool: { id: 2 } });
    expect(inputs(wrapper)[0].props('modelValue')).toBe('');
    expect(combos(wrapper)[0].props('modelValue')).toBe('GET');
    expect(combos(wrapper)[1].props('modelValue')).toBe('none');
    // A tool without an id, or create mode, leaves the form alone.
    await wrapper.setProps({ tool: { title: 'x' } });
    expect(inputs(wrapper)[0].props('modelValue')).toBe('');
    const create = await mountForm({ tool: { id: 3, title: 'y' } });
    expect(inputs(create)[0].props('modelValue')).toBe('');
    await wrapper.setProps({ tool: null });
  });

  it('shows required and max length errors', async () => {
    const wrapper = await mountForm();
    await submit(wrapper);
    expect(inputs(wrapper)[0].props()).toMatchObject({
      message: 'CAPTAIN.CUSTOM_TOOLS.FORM.TITLE.ERROR',
      messageType: 'error',
    });
    expect(inputs(wrapper)[1].props('message')).toBe(
      'CAPTAIN.CUSTOM_TOOLS.FORM.ENDPOINT_URL.ERROR'
    );
    await fill(wrapper, { title: 'x'.repeat(56) });
    expect(inputs(wrapper)[0].props('message')).toBe(
      'CAPTAIN.CUSTOM_TOOLS.FORM.TITLE.MAX_LENGTH_ERROR'
    );
    expect(inputs(wrapper)[1].props('messageType')).toBe('info');
    expect(wrapper.emitted('submit')).toBeUndefined();
  });

  it('submits a valid tool and opens sections with invalid rows', async () => {
    const wrapper = await mountForm();
    await fill(wrapper);
    button(wrapper, 'i-lucide-plus').vm.$emit('click');
    await flushPromises();
    env.headersValid = false;
    env.paramsValid = false;
    await submit(wrapper);
    expect(sections(wrapper)[0].props('open')).toBe(true);
    expect(sections(wrapper)[1].props('open')).toBe(true);
    expect(wrapper.emitted('submit')).toBeUndefined();

    env.headersValid = true;
    env.paramsValid = true;
    await submit(wrapper);
    expect(wrapper.emitted('submit')[0][0]).toMatchObject({
      title: 'Lookup',
      endpoint_url: 'https://api.x',
      param_schema: [
        { name: '', type: 'string', description: '', required: false },
      ],
    });
  });

  it('asks before saving a risky tool', async () => {
    env.risk = 'high';
    const wrapper = await mountForm();
    expect(wrapper.findComponent({ name: 'Dialog' }).props('description')).toBe(
      'CAPTAIN.CUSTOM_TOOLS.FORM.RISK.HIGH'
    );
    await fill(wrapper);
    await submit(wrapper);
    expect(env.dialogOpen).toHaveBeenCalled();
    expect(wrapper.emitted('submit')).toBeUndefined();
    wrapper.findComponent({ name: 'Dialog' }).vm.$emit('confirm');
    expect(env.dialogClose).toHaveBeenCalled();
    expect(wrapper.emitted('submit')).toHaveLength(1);

    env.risk = 'medium';
    const medium = await mountForm();
    expect(medium.findComponent({ name: 'Dialog' }).props('description')).toBe(
      'CAPTAIN.CUSTOM_TOOLS.FORM.RISK.MEDIUM'
    );
  });

  it('skips the risk check once email verification is required', async () => {
    env.risk = 'high';
    const wrapper = await mountForm();
    await fill(wrapper);
    wrapper
      .findComponent({ name: 'Switch' })
      .vm.$emit('update:modelValue', true);
    await submit(wrapper);
    expect(env.dialogOpen).not.toHaveBeenCalled();
    expect(wrapper.emitted('submit')[0][0].settings).toEqual({
      requires_email_verification: true,
    });
  });

  it('adds, edits, converts and removes parameters', async () => {
    const wrapper = await mountForm();
    button(wrapper, 'i-lucide-plus').vm.$emit('click');
    await flushPromises();
    const paramRow = wrapper.findComponent({ name: 'ParamRow' });
    expect(paramRow.props('suggestVerifiedEmail')).toBe(false);
    paramRow.vm.$emit('update:name', 'email');
    await flushPromises();
    expect(paramRow.props('suggestVerifiedEmail')).toBe(true);
    paramRow.vm.$emit('useVerifiedEmail');
    await flushPromises();
    const verified = wrapper.findComponent({ name: 'VerifiedParamRow' });
    expect(verified.props('name')).toBe('email');
    expect(wrapper.text()).toContain(
      'CAPTAIN.CUSTOM_TOOLS.FORM.EMAIL_VERIFICATION.IMPLIED'
    );
    expect(wrapper.findComponent({ name: 'Switch' }).props()).toMatchObject({
      modelValue: true,
      disabled: true,
    });
    expect(button(wrapper, 'i-lucide-mail-check')).toBeUndefined();
    verified.vm.$emit('remove');
    await flushPromises();
    expect(params(wrapper)).toHaveLength(0);
    expect(wrapper.text()).toContain(
      'CAPTAIN.CUSTOM_TOOLS.FORM.EMAIL_VERIFICATION.DESCRIPTION'
    );

    button(wrapper, 'i-lucide-mail-check').vm.$emit('click');
    await flushPromises();
    expect(wrapper.findComponent({ name: 'VerifiedParamRow' }).exists()).toBe(
      true
    );
    button(wrapper, 'i-lucide-plus').vm.$emit('click');
    await flushPromises();
    wrapper.findComponent({ name: 'ParamRow' }).vm.$emit('remove');
    await flushPromises();
    expect(params(wrapper)).toHaveLength(1);
  });

  it('wires the remaining v-models', async () => {
    const wrapper = await mountForm();
    combos(wrapper)[0].vm.$emit('update:modelValue', 'POST');
    combos(wrapper)[1].vm.$emit('update:modelValue', 'basic');
    areas(wrapper)[0].vm.$emit('update:modelValue', 'Desc');
    await flushPromises();
    areas(wrapper)[1].vm.$emit('update:modelValue', '{"a":1}');
    areas(wrapper)[2].vm.$emit('update:modelValue', 'Done');
    wrapper
      .findComponent({ name: 'HeadersConfig' })
      .vm.$emit('update:headers', { X: 'y' });
    sections(wrapper)[2].vm.$emit('update:open', true);
    await flushPromises();
    expect(
      wrapper.findComponent({ name: 'AuthConfig' }).props('authType')
    ).toBe('basic');
    expect(sections(wrapper)[0].props('summary')).toBe('1');
    expect(sections(wrapper)[2].props('open')).toBe(true);
    expect(areas(wrapper).map(a => a.props('modelValue'))).toEqual([
      'Desc',
      '{"a":1}',
      'Done',
    ]);
  });

  it('tests the endpoint and shows the status', async () => {
    const wrapper = await mountForm();
    await fill(wrapper);
    let finish;
    env.test = vi.fn(
      () =>
        new Promise(resolve => {
          finish = resolve;
        })
    );
    await button(wrapper, 'i-lucide-play').trigger('click');
    expect(button(wrapper, 'i-lucide-play').props('isLoading')).toBe(true);
    expect(env.test).toHaveBeenCalledWith(
      expect.objectContaining({
        endpoint_url: 'https://api.x',
        assistantId: '3',
      })
    );
    finish({ data: { status: 204 } });
    await flushPromises();
    expect(wrapper.find('.i-lucide-check-circle').exists()).toBe(true);
    expect(wrapper.text()).toContain('CAPTAIN.CUSTOM_TOOLS.TEST.SUCCESS');

    env.test = vi.fn(() => Promise.resolve({ data: { status: 500 } }));
    await button(wrapper, 'i-lucide-play').trigger('click');
    await flushPromises();
    expect(wrapper.find('.i-lucide-x-circle').exists()).toBe(true);
    env.test = vi.fn(() => Promise.resolve({ data: { status: 199 } }));
    await button(wrapper, 'i-lucide-play').trigger('click');
    await flushPromises();
    expect(wrapper.find('.i-lucide-x-circle').exists()).toBe(true);
  });

  it('shows test errors from the API or a fallback', async () => {
    const wrapper = await mountForm();
    await fill(wrapper);
    env.test = vi.fn(() =>
      Promise.reject(
        Object.assign(new Error('x'), {
          response: { data: { error: 'Timeout' } },
        })
      )
    );
    await button(wrapper, 'i-lucide-play').trigger('click');
    await flushPromises();
    expect(wrapper.text()).toContain('Timeout');
    env.test = vi.fn(() => Promise.reject(new Error('x')));
    await button(wrapper, 'i-lucide-play').trigger('click');
    await flushPromises();
    expect(wrapper.text()).toContain('CAPTAIN.CUSTOM_TOOLS.TEST.ERROR');
  });

  it('does not test with invalid headers', async () => {
    const wrapper = await mountForm();
    await fill(wrapper);
    env.headersValid = false;
    await button(wrapper, 'i-lucide-play').trigger('click');
    await flushPromises();
    expect(env.test).not.toHaveBeenCalled();
    expect(sections(wrapper)[0].props('open')).toBe(true);
  });
});
