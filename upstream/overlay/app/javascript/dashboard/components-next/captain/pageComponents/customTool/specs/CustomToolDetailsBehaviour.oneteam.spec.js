/**
 * OneTeam behaviour spec for a Captain custom tool's read-only details.
 *
 * Covers the description and installed-tool note, the auth type label,
 * parameters (type, required, description, verified email values), the
 * request section (method, URL, headers, body template only for
 * non-GET, response template) and opening it, and the email
 * verification switch: implied by a verified email parameter, editable
 * only by admins on installed tools, saved immediately, and reverted
 * with an error message when saving fails.
 */
import { mount, flushPromises } from '@vue/test-utils';
import { ref } from 'vue';
import { useAlert } from 'dashboard/composables';
import CustomToolDetails from '../CustomToolDetails.vue';

const dispatch = vi.fn();
const isAdmin = ref(true);

vi.mock('vue-router', () => ({
  useRoute: () => ({ params: { assistantId: '3' } }),
}));
vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: key => key }) }));
vi.mock('dashboard/composables/store', () => ({
  useStore: () => ({ dispatch }),
}));
vi.mock('dashboard/composables', () => ({ useAlert: vi.fn() }));
vi.mock('dashboard/composables/useAdmin', () => ({
  useAdmin: () => ({ isAdmin }),
}));
vi.mock('dashboard/store/utils/api', () => ({
  parseAPIErrorResponse: error => error.message,
}));

const Switch = {
  name: 'Switch',
  props: { modelValue: Boolean, disabled: Boolean },
  emits: ['update:modelValue'],
  template:
    '<input type="checkbox" :checked="modelValue" :disabled="disabled" />',
};
const ToolFormSection = {
  name: 'ToolFormSection',
  props: { open: Boolean, title: String },
  emits: ['update:open'],
  template: '<section class="request"><slot /></section>',
};

const P = 'CAPTAIN.CUSTOM_TOOLS';
const mountDetails = tool =>
  mount(CustomToolDetails, {
    props: {
      tool: {
        id: 9,
        http_method: 'GET',
        endpoint_url: 'https://x.co',
        ...tool,
      },
    },
    global: { stubs: { Switch, ToolFormSection } },
  });
const toggle = wrapper => wrapper.findComponent(Switch);

describe('CustomToolDetails behaviour', () => {
  beforeEach(() => {
    isAdmin.value = true;
    vi.clearAllMocks();
  });

  it('shows a plain tool with no extras', () => {
    const wrapper = mountDetails({});
    expect(wrapper.findAll('p')).toHaveLength(0);
    expect(wrapper.text()).toContain(`${P}.FORM.AUTH_TYPES.NONE`);
    expect(wrapper.text()).not.toContain(`${P}.FORM.PARAMETERS.LABEL`);
    expect(wrapper.text()).not.toContain(`${P}.FORM.HEADERS.LABEL`);
    expect(wrapper.find('pre').exists()).toBe(false);
    expect(wrapper.text()).toContain(
      `${P}.FORM.EMAIL_VERIFICATION.DESCRIPTION`
    );
    expect(toggle(wrapper).props()).toEqual({
      modelValue: false,
      disabled: true,
    });
  });

  it('describes the tool, its auth and parameters', () => {
    const label = auth_type =>
      mountDetails({ auth_type }).findAll('section')[0].text();
    expect(label('bearer')).toContain(`${P}.FORM.AUTH_TYPES.BEARER`);
    expect(label('basic')).toContain(`${P}.FORM.AUTH_TYPES.BASIC`);
    expect(label('api_key')).toContain(`${P}.FORM.AUTH_TYPES.API_KEY`);

    const wrapper = mountDetails({
      description: 'Looks up orders',
      source_metadata: { toolset: 'shop' },
      param_schema: [
        {
          name: 'order_id',
          type: 'string',
          required: true,
          description: 'The order',
        },
        { name: 'count', type: 'number' },
      ],
    });
    expect(wrapper.find('p').text()).toBe('Looks up orders');
    expect(wrapper.text()).toContain(`${P}.VIEW.INSTALLED_NOTE`);
    const rows = wrapper.findAll('li');
    expect(rows[0].text()).toContain('order_id');
    expect(rows[0].text()).toContain(`${P}.FORM.PARAM_TYPES.STRING`);
    expect(rows[0].text()).toContain(`${P}.FORM.PARAM_REQUIRED.LABEL`);
    expect(rows[0].text()).toContain('The order');
    expect(rows[1].text()).toContain(`${P}.FORM.PARAM_TYPES.NUMBER`);
    expect(rows[1].text()).not.toContain(`${P}.FORM.PARAM_REQUIRED.LABEL`);
    expect(rows[1].find('p').exists()).toBe(false);
  });

  it('shows the request details and opens them', async () => {
    const wrapper = mountDetails({
      http_method: 'POST',
      headers: { 'X-Key': 'abc' },
      request_template: '{"id": 1}',
      response_template: '{{ result }}',
    });
    const request = wrapper.find('.request');
    expect(request.text()).toContain('POST');
    expect(request.text()).toContain('https://x.co');
    expect(request.findAll('li').map(li => li.text())).toEqual(['X-Keyabc']);
    expect(request.findAll('pre').map(p => p.text())).toEqual([
      '{"id": 1}',
      '{{ result }}',
    ]);
    const section = wrapper.findComponent(ToolFormSection);
    expect(section.props('open')).toBe(false);
    await section.vm.$emit('update:open', true);
    expect(section.props('open')).toBe(true);

    const get = mountDetails({ request_template: '{"id": 1}' });
    expect(get.findAll('pre')).toHaveLength(0);
  });

  it('implies verification when a parameter uses the verified email', () => {
    const wrapper = mountDetails({
      source_metadata: {},
      param_schema: [
        { name: 'email', source: 'verified.email', description: 'ignored' },
      ],
    });
    expect(wrapper.text()).toContain(`${P}.FORM.EMAIL_VERIFICATION.IMPLIED`);
    expect(wrapper.text()).toContain(`${P}.FORM.VERIFIED_VALUES.EMAIL`);
    expect(wrapper.find('li p').text()).toBe(`${P}.FORM.VERIFIED_VALUES.HELP`);
    expect(toggle(wrapper).props()).toEqual({
      modelValue: true,
      disabled: true,
    });
  });

  it('lets admins change verification on installed tools', async () => {
    const wrapper = mountDetails({
      source_metadata: {},
      settings: { requires_email_verification: true },
    });
    expect(toggle(wrapper).props()).toEqual({
      modelValue: true,
      disabled: false,
    });
    await wrapper.setProps({
      tool: { id: 9, source_metadata: {}, settings: {} },
    });
    expect(toggle(wrapper).props('modelValue')).toBe(false);

    let finish;
    dispatch.mockReturnValue(
      new Promise(resolve => {
        finish = resolve;
      })
    );
    await toggle(wrapper).vm.$emit('update:modelValue', true);
    expect(toggle(wrapper).props()).toEqual({
      modelValue: true,
      disabled: true,
    });
    expect(dispatch).toHaveBeenCalledWith('captainCustomTools/update', {
      id: 9,
      settings: { requires_email_verification: true },
      assistantId: '3',
    });
    finish();
    await flushPromises();
    expect(useAlert).toHaveBeenCalledWith(`${P}.EDIT.SUCCESS_MESSAGE`);
    expect(toggle(wrapper).props('disabled')).toBe(false);

    isAdmin.value = false;
    await wrapper.vm.$nextTick();
    expect(toggle(wrapper).props('disabled')).toBe(true);
  });

  it('reverts and explains when saving fails', async () => {
    const wrapper = mountDetails({ source_metadata: {} });
    dispatch.mockRejectedValueOnce(new Error('Not allowed'));
    await toggle(wrapper).vm.$emit('update:modelValue', true);
    await flushPromises();
    expect(toggle(wrapper).props('modelValue')).toBe(false);
    expect(useAlert).toHaveBeenLastCalledWith('Not allowed');

    dispatch.mockRejectedValueOnce(new Error(''));
    await toggle(wrapper).vm.$emit('update:modelValue', true);
    await flushPromises();
    expect(useAlert).toHaveBeenLastCalledWith(`${P}.EDIT.ERROR_MESSAGE`);
  });
});
