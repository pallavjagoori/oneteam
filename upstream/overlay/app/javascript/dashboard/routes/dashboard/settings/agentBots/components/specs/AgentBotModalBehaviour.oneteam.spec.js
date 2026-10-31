/**
 * OneTeam behaviour spec for the agent bot create / edit modal.
 *
 * Covers form initialisation from a bot, validation, creating (with and
 * without a returned access token), updating, avatar upload and delete,
 * copying and resetting the access token and secret, and closing.
 */
import { reactive } from 'vue';
import { mount, flushPromises } from '@vue/test-utils';
import AgentBotModal from '../AgentBotModal.vue';

const env = vi.hoisted(() => ({}));

// @vueuse/core resolves its own copy of Vue under pnpm, so its refs are not
// tracked by this component's computeds; use an app-Vue toggle instead.
vi.mock('@vueuse/core', async importOriginal => {
  const { ref } = await import('vue');
  return {
    ...(await importOriginal()),
    useToggle: (initial = false) => {
      const value = ref(initial);
      const toggle = next => {
        value.value = typeof next === 'boolean' ? next : !value.value;
        return value.value;
      };
      return [value, toggle];
    },
  };
});
vi.mock('vue-i18n', async importOriginal => ({
  ...(await importOriginal()),
  useI18n: () => ({ t: key => key }),
}));
vi.mock('dashboard/composables', () => ({ useAlert: vi.fn() }));
vi.mock('shared/helpers/clipboard', () => ({
  copyTextToClipboard: vi.fn(async () => {}),
}));
vi.mock('dashboard/composables/store', async () => {
  const { computed } = await import('vue');
  return {
    useMapGetter: () => computed(() => env.state.uiFlags),
    useStore: () => env.store,
  };
});

const { useAlert } = await import('dashboard/composables');
const { copyTextToClipboard } = await import('shared/helpers/clipboard');

const DialogStub = {
  name: 'Dialog',
  props: ['title', 'description', 'type'],
  emits: ['close'],
  methods: {
    open: (...a) => env.dialog.open(...a),
    close: (...a) => env.dialog.close(...a),
  },
  template: '<div class="dialog"><slot /></div>',
};
const InputStub = {
  name: 'Input',
  props: ['id', 'modelValue', 'label', 'message', 'messageType'],
  emits: ['update:modelValue', 'blur'],
  template:
    '<input :id="id" :data-message="message" :data-type="messageType" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" @blur="$emit(\'blur\')" />',
};
const TextAreaStub = {
  name: 'TextArea',
  props: ['id', 'modelValue'],
  emits: ['update:modelValue'],
  template:
    '<textarea :id="id" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
};
const AccessTokenStub = {
  name: 'AccessToken',
  props: ['value', 'showResetButton'],
  emits: ['onCopy', 'onReset'],
  template: '<div class="token" :data-value="value" />',
};
const ButtonStub = {
  name: 'NextButton',
  props: ['label', 'type', 'isLoading', 'disabled'],
  emits: ['click'],
  template:
    '<button :type="type" :data-label="label" :data-loading="String(!!isLoading)" :disabled="disabled" @click="type === \'reset\' && $emit(\'click\')">{{ label }}</button>',
};

const mountModal = (props = {}) =>
  mount(AgentBotModal, {
    props,
    global: {
      stubs: {
        Dialog: DialogStub,
        Input: InputStub,
        TextArea: TextAreaStub,
        AccessToken: AccessTokenStub,
        NextButton: ButtonStub,
        Avatar: {
          name: 'Avatar',
          props: ['src', 'name'],
          emits: ['upload', 'delete'],
          template: '<img class="avatar" :src="src" />',
        },
      },
    },
  });

const bot = {
  id: 4,
  name: 'Helper',
  description: 'Answers FAQs',
  outgoing_url: 'https://bot.test/hook',
  thumbnail: 'https://cdn.test/bot.png',
  access_token: 'tok-1',
  secret: 'sec-1',
};

const fill = async (wrapper, name, url) => {
  await wrapper.find('#bot-name').setValue(name);
  await wrapper.find('#bot-url').setValue(url);
};
const submit = async wrapper => {
  await wrapper.find('form').trigger('submit');
  await flushPromises();
};
const dialog = wrapper => wrapper.findComponent(DialogStub);
const tokens = wrapper => wrapper.findAllComponents(AccessTokenStub);

describe('AgentBotModal behaviour', () => {
  beforeEach(() => {
    env.state = reactive({ uiFlags: { isCreating: false, isUpdating: false } });
    env.store = { dispatch: vi.fn(async () => ({})) };
    env.dialog = { open: vi.fn(), close: vi.fn() };
  });

  it('exposes the dialog ref', () => {
    const wrapper = mountModal();
    expect(wrapper.vm.dialogRef.open).toBeTypeOf('function');
  });

  it('starts empty in create mode and validates on blur and submit', async () => {
    env.state.uiFlags.isCreating = true;
    const wrapper = mountModal();
    expect(dialog(wrapper).props()).toMatchObject({
      title: 'AGENT_BOTS.ADD.TITLE',
      description: '',
    });
    const save = wrapper.find('[data-label="AGENT_BOTS.FORM.CREATE"]');
    expect(save.attributes('data-loading')).toBe('true');
    expect(save.attributes('disabled')).toBe('');
    expect(tokens(wrapper)).toHaveLength(0);

    await wrapper.find('#bot-name').trigger('blur');
    expect(wrapper.find('#bot-name').attributes('data-message')).toBe(
      'AGENT_BOTS.FORM.ERRORS.NAME'
    );
    expect(wrapper.find('#bot-name').attributes('data-type')).toBe('error');
    expect(wrapper.find('#bot-url').attributes('data-type')).toBe('info');

    await submit(wrapper);
    expect(wrapper.find('#bot-url').attributes('data-message')).toBe(
      'AGENT_BOTS.FORM.ERRORS.URL'
    );
    await wrapper.find('#bot-url').setValue('not a url');
    await wrapper.find('#bot-url').trigger('blur');
    expect(wrapper.find('#bot-url').attributes('data-message')).toBe(
      'AGENT_BOTS.FORM.ERRORS.VALID_URL'
    );
    expect(env.store.dispatch).not.toHaveBeenCalled();
  });

  it('creates a bot and shows its access token and secret', async () => {
    env.store.dispatch.mockResolvedValueOnce({
      id: 9,
      access_token: 'new-token',
      secret: 'new-secret',
    });
    const wrapper = mountModal();
    await fill(wrapper, 'Helper', 'https://bot.test/hook');
    await wrapper.find('#bot-description').setValue('Says hi');
    wrapper.findComponent({ name: 'Avatar' }).vm.$emit('upload', {
      file: 'FILE',
      url: 'blob:avatar',
    });
    await flushPromises();
    expect(wrapper.find('.avatar').attributes('src')).toBe('blob:avatar');

    await submit(wrapper);
    expect(env.store.dispatch).toHaveBeenCalledWith('agentBots/create', {
      name: 'Helper',
      description: 'Says hi',
      outgoing_url: 'https://bot.test/hook',
      bot_type: 'webhook',
      avatar: 'FILE',
    });
    expect(useAlert).toHaveBeenCalledWith('AGENT_BOTS.ADD.API.SUCCESS_MESSAGE');
    expect(env.dialog.close).not.toHaveBeenCalled();
    expect(dialog(wrapper).props()).toMatchObject({
      title: 'AGENT_BOTS.ACCESS_TOKEN.TITLE',
      description: 'AGENT_BOTS.ACCESS_TOKEN.DESCRIPTION',
    });
    expect(wrapper.find('#bot-name').exists()).toBe(false);
    expect(wrapper.find('[data-label="AGENT_BOTS.FORM.CREATE"]').exists()).toBe(
      false
    );
    expect(tokens(wrapper).map(c => c.props())).toEqual([
      { value: 'new-token', showResetButton: false },
      { value: 'new-secret', showResetButton: false },
    ]);

    tokens(wrapper)[0].vm.$emit('onCopy', 'new-token');
    await flushPromises();
    expect(copyTextToClipboard).toHaveBeenCalledWith('new-token');
    expect(useAlert).toHaveBeenCalledWith(
      'AGENT_BOTS.ACCESS_TOKEN.COPY_SUCCESSFUL'
    );
    tokens(wrapper)[1].vm.$emit('onCopy', '');
    await flushPromises();
    expect(copyTextToClipboard).toHaveBeenLastCalledWith('new-secret');
    expect(useAlert).toHaveBeenCalledWith('AGENT_BOTS.SECRET.COPY_SUCCESS');

    // Closing keeps validation state while the token view is open.
    await wrapper
      .find('[data-label="AGENT_BOTS.FORM.CANCEL"]')
      .trigger('click');
    expect(env.dialog.close).toHaveBeenCalled();
    expect(tokens(wrapper)).toHaveLength(0);
    expect(wrapper.find('#bot-name').exists()).toBe(true);
  });

  it('shows the token without a secret when none is returned', async () => {
    env.store.dispatch.mockResolvedValueOnce({ id: 9, access_token: 'tok' });
    const wrapper = mountModal();
    await fill(wrapper, 'Helper', 'https://bot.test/hook');
    await submit(wrapper);
    expect(tokens(wrapper).map(c => c.props('value'))).toEqual(['tok']);
  });

  it('ignores submits while the token view is open', async () => {
    env.store.dispatch.mockResolvedValueOnce({ id: 9, access_token: 'tok' });
    const wrapper = mountModal();
    await fill(wrapper, 'Helper', 'https://bot.test/hook');
    await submit(wrapper);
    await wrapper.setProps({
      selectedBot: { name: 'X', outgoing_url: 'https://x.test' },
    });
    env.store.dispatch.mockClear();
    await submit(wrapper);
    expect(env.store.dispatch).not.toHaveBeenCalled();
  });

  it.each([[{ id: 9 }], [undefined]])(
    'closes after create when no token comes back (%o)',
    async response => {
      env.store.dispatch.mockResolvedValueOnce(response);
      const wrapper = mountModal();
      await fill(wrapper, 'Helper', 'https://bot.test/hook');
      await submit(wrapper);
      expect(env.dialog.close).toHaveBeenCalled();
      expect(tokens(wrapper)).toHaveLength(0);
      expect(wrapper.find('#bot-name').element.value).toBe('');
    }
  );

  it('alerts when create fails', async () => {
    env.store.dispatch.mockRejectedValueOnce(new Error('nope'));
    const wrapper = mountModal();
    await fill(wrapper, 'Helper', 'https://bot.test/hook');
    await submit(wrapper);
    expect(useAlert).toHaveBeenCalledWith('AGENT_BOTS.ADD.API.ERROR_MESSAGE');
    expect(wrapper.find('#bot-name').element.value).toBe('Helper');
  });

  it('fills the form from a bot and updates it in edit mode', async () => {
    env.state.uiFlags.isUpdating = true;
    const wrapper = mountModal({ type: 'edit', selectedBot: bot });
    expect(dialog(wrapper).props('title')).toBe('AGENT_BOTS.EDIT.TITLE');
    expect(wrapper.find('#bot-name').element.value).toBe('Helper');
    expect(wrapper.find('#bot-description').element.value).toBe('Answers FAQs');
    expect(wrapper.find('#bot-url').element.value).toBe(
      'https://bot.test/hook'
    );
    expect(wrapper.find('.avatar').attributes('src')).toBe(
      'https://cdn.test/bot.png'
    );
    const update = wrapper.find('[data-label="AGENT_BOTS.FORM.UPDATE"]');
    expect(update.attributes('data-loading')).toBe('true');
    expect(tokens(wrapper).map(c => c.props('value'))).toEqual([
      'sec-1',
      'tok-1',
    ]);
    expect(wrapper.text()).toContain('AGENT_BOTS.SECRET.LABEL');

    env.store.dispatch.mockResolvedValueOnce({});
    await submit(wrapper);
    expect(env.store.dispatch).toHaveBeenCalledWith('agentBots/update', {
      id: 4,
      data: {
        name: 'Helper',
        description: 'Answers FAQs',
        outgoing_url: 'https://bot.test/hook',
        bot_type: 'webhook',
        avatar: null,
      },
    });
    expect(useAlert).toHaveBeenCalledWith(
      'AGENT_BOTS.EDIT.API.SUCCESS_MESSAGE'
    );
    expect(env.dialog.close).toHaveBeenCalled();
  });

  it('alerts when update fails', async () => {
    const wrapper = mountModal({ type: 'edit', selectedBot: bot });
    env.store.dispatch.mockRejectedValueOnce(new Error('nope'));
    await submit(wrapper);
    expect(useAlert).toHaveBeenCalledWith('AGENT_BOTS.EDIT.API.ERROR_MESSAGE');
  });

  it('falls back to bot_config and blanks for sparse bots', async () => {
    const wrapper = mountModal({
      type: 'edit',
      selectedBot: { id: 3, bot_config: { webhook_url: 'https://cfg.test' } },
    });
    expect(wrapper.find('#bot-name').element.value).toBe('');
    expect(wrapper.find('#bot-description').element.value).toBe('');
    expect(wrapper.find('#bot-url').element.value).toBe('https://cfg.test');
    expect(wrapper.find('.avatar').attributes('src')).toBe('');
    // Edit mode always shows the access token row, even when empty.
    expect(tokens(wrapper).map(c => c.props('value'))).toEqual(['']);

    await wrapper.setProps({ selectedBot: { id: 3 } });
    expect(wrapper.find('#bot-url').element.value).toBe('');
  });

  it('ignores token fields from a bot in create mode', () => {
    const wrapper = mountModal({ selectedBot: bot });
    expect(wrapper.find('#bot-name').element.value).toBe('Helper');
    expect(tokens(wrapper)).toHaveLength(0);
  });

  it('resets the form when the bot is cleared', async () => {
    const wrapper = mountModal({ type: 'edit', selectedBot: bot });
    await wrapper.setProps({ selectedBot: {} });
    expect(wrapper.find('#bot-name').element.value).toBe('');
    await wrapper.setProps({ selectedBot: null });
    expect(wrapper.find('#bot-url').element.value).toBe('');
  });

  it('resets the secret and access token', async () => {
    const wrapper = mountModal({ type: 'edit', selectedBot: bot });
    const [secret, token] = tokens(wrapper);

    env.store.dispatch.mockResolvedValueOnce({ secret: 'sec-2' });
    secret.vm.$emit('onReset');
    await flushPromises();
    expect(env.store.dispatch).toHaveBeenCalledWith('agentBots/resetSecret', 4);
    expect(useAlert).toHaveBeenCalledWith('AGENT_BOTS.SECRET.RESET_SUCCESS');
    expect(tokens(wrapper)[0].props('value')).toBe('sec-2');

    env.store.dispatch.mockResolvedValueOnce(null);
    secret.vm.$emit('onReset');
    await flushPromises();
    expect(useAlert).toHaveBeenCalledWith('AGENT_BOTS.SECRET.RESET_ERROR');

    env.store.dispatch.mockResolvedValueOnce({ access_token: 'tok-2' });
    token.vm.$emit('onReset');
    await flushPromises();
    expect(env.store.dispatch).toHaveBeenCalledWith(
      'agentBots/resetAccessToken',
      4
    );
    expect(useAlert).toHaveBeenCalledWith(
      'AGENT_BOTS.ACCESS_TOKEN.RESET_SUCCESS'
    );
    expect(tokens(wrapper)[1].props('value')).toBe('tok-2');

    env.store.dispatch.mockResolvedValueOnce(undefined);
    token.vm.$emit('onReset');
    await flushPromises();
    expect(useAlert).toHaveBeenCalledWith(
      'AGENT_BOTS.ACCESS_TOKEN.RESET_ERROR'
    );

    token.vm.$emit('onCopy', 'tok-2');
    await flushPromises();
    expect(copyTextToClipboard).toHaveBeenCalledWith('tok-2');
  });

  it('deletes a saved avatar through the store', async () => {
    const wrapper = mountModal({ type: 'edit', selectedBot: bot });
    const avatar = wrapper.findComponent({ name: 'Avatar' });

    env.store.dispatch.mockRejectedValueOnce(new Error('nope'));
    avatar.vm.$emit('delete');
    await flushPromises();
    expect(useAlert).toHaveBeenCalledWith('AGENT_BOTS.AVATAR.ERROR_DELETE');
    expect(wrapper.find('.avatar').attributes('src')).toBe(
      'https://cdn.test/bot.png'
    );

    avatar.vm.$emit('delete');
    await flushPromises();
    expect(env.store.dispatch).toHaveBeenCalledWith(
      'agentBots/deleteAgentBotAvatar',
      4
    );
    expect(useAlert).toHaveBeenCalledWith('AGENT_BOTS.AVATAR.SUCCESS_DELETE');
    expect(wrapper.find('.avatar').attributes('src')).toBe('');
  });

  it('clears an unsaved avatar locally', async () => {
    const wrapper = mountModal();
    const avatar = wrapper.findComponent({ name: 'Avatar' });
    avatar.vm.$emit('upload', { file: 'F', url: 'blob:x' });
    await flushPromises();
    avatar.vm.$emit('delete');
    await flushPromises();
    expect(env.store.dispatch).not.toHaveBeenCalled();
    expect(wrapper.find('.avatar').attributes('src')).toBe('');
  });

  it('resets validation when the dialog closes', async () => {
    const wrapper = mountModal();
    await submit(wrapper);
    expect(wrapper.find('#bot-name').attributes('data-type')).toBe('error');
    dialog(wrapper).vm.$emit('close');
    await flushPromises();
    expect(wrapper.find('#bot-name').attributes('data-type')).toBe('info');
  });
});
