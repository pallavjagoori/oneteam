/**
 * OneTeam behaviour spec for the inbox pre-chat form settings.
 *
 * Covers loading defaults from the inbox (and reloading on change),
 * missing field options, toggling the form and editing its message,
 * flipping a field's flags, reordering fields, and saving with success
 * and error alerts.
 */
import { ref } from 'vue';
import { flushPromises, mount } from '@vue/test-utils';
import Settings from '../Settings.vue';

const env = vi.hoisted(() => ({
  dispatch: vi.fn(),
  alerts: [],
  options: null,
}));

vi.mock('vuex', async importOriginal => ({
  ...(await importOriginal()),
  useStore: () => ({ dispatch: (...args) => env.dispatch(...args) }),
}));
vi.mock('dashboard/composables/store', () => ({
  useMapGetter: name =>
    ref(name === 'inboxes/getUIFlags' ? { isUpdating: false } : []),
}));
vi.mock('dashboard/composables', () => ({
  useAlert: message => env.alerts.push(message),
}));
vi.mock('dashboard/helper/preChat', () => ({
  getPreChatFields: ({ preChatFormOptions }) =>
    env.options === 'none' ? null : preChatFormOptions,
}));

const Toggle = {
  name: 'SettingsToggleSection',
  props: ['modelValue'],
  emits: ['update:modelValue'],
  template: '<section><slot name="editor" /></section>',
};
const Editor = {
  name: 'WootMessageEditor',
  props: ['modelValue'],
  emits: ['update:modelValue'],
  template: '<textarea />',
};
const Fields = {
  name: 'PreChatFields',
  props: ['preChatFields'],
  emits: ['update', 'dragEnd'],
  template: '<tbody />',
};

const inbox = (enabled = true) => ({
  id: 3,
  pre_chat_form_enabled: enabled,
  pre_chat_form_options: {
    pre_chat_message: 'Hi',
    pre_chat_fields: [
      { name: 'email', required: false },
      { name: 'phone', required: true },
    ],
  },
});

const mountSettings = props =>
  mount(Settings, {
    props,
    global: {
      stubs: {
        SettingsToggleSection: Toggle,
        WootMessageEditor: Editor,
        PreChatFields: Fields,
        Button: { template: '<button type="submit" />' },
      },
    },
  });

describe('PreChatForm Settings behaviour', () => {
  beforeEach(() => {
    env.dispatch = vi.fn().mockResolvedValue();
    env.alerts = [];
    env.options = null;
  });

  it('edits and saves the pre-chat form', async () => {
    const wrapper = mountSettings({ inbox: inbox() });
    await flushPromises();
    expect(wrapper.findAll('th')).toHaveLength(7);
    const fields = wrapper.findComponent(Fields);
    await fields.vm.$emit('update', null, 'required', {
      name: 'email',
      required: false,
    });
    expect(fields.props('preChatFields')[0].required).toBe(true);
    await fields.vm.$emit('dragEnd', [{ name: 'phone' }]);
    await wrapper.findComponent(Editor).vm.$emit('update:modelValue', 'Hey');
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    expect(env.dispatch).toHaveBeenCalledWith('inboxes/updateInbox', {
      id: 3,
      formData: false,
      channel: {
        pre_chat_form_enabled: true,
        pre_chat_form_options: {
          pre_chat_message: 'Hey',
          pre_chat_fields: [{ name: 'phone' }],
        },
      },
    });

    env.dispatch.mockRejectedValueOnce(new Error('no'));
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    expect(env.alerts).toEqual([
      'INBOX_MGMT.EDIT.API.SUCCESS_MESSAGE',
      'INBOX_MGMT.EDIT.API.ERROR_MESSAGE',
    ]);

    await wrapper.findComponent(Toggle).vm.$emit('update:modelValue', false);
    expect(wrapper.find('table').exists()).toBe(false);
  });

  it('reloads on inbox change and tolerates missing options', async () => {
    const wrapper = mountSettings({ inbox: inbox(false) });
    expect(wrapper.find('table').exists()).toBe(false);
    await wrapper.setProps({ inbox: inbox(true) });
    expect(wrapper.find('table').exists()).toBe(true);

    env.options = 'none';
    await wrapper.setProps({ inbox: { id: 4, pre_chat_form_enabled: true } });
    expect(
      wrapper.findComponent(Fields).props('preChatFields')
    ).toBeUndefined();
    expect(mountSettings().find('table').exists()).toBe(false);
  });
});
