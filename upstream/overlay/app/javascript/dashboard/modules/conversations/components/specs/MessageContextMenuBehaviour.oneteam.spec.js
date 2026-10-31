/**
 * OneTeam behaviour spec for the message context menu.
 *
 * Covers which options show, opening the menu, copying text and the
 * message link, translating (agent, account and default languages,
 * errors), reply and forward, adding a canned response, reporting a
 * Captain message, deleting (success and failure), and reading message
 * fields from both snake_case and camelCase messages.
 */
import { flushPromises, mount } from '@vue/test-utils';
import { useAlert, useTrack } from 'dashboard/composables';
import { copyTextToClipboard } from 'shared/helpers/clipboard';
import MessageContextMenu from '../MessageContextMenu.vue';

vi.mock('dashboard/composables', () => ({
  useAlert: vi.fn(),
  useTrack: vi.fn(),
}));
vi.mock('shared/helpers/clipboard', () => ({
  copyTextToClipboard: vi.fn().mockResolvedValue(),
}));
vi.mock('shared/composables/useMessageFormatter', () => ({
  useMessageFormatter: () => ({ getPlainText: text => `plain:${text}` }),
}));
vi.mock('dashboard/store/utils/api', () => ({
  parseAPIErrorResponse: error => `parsed:${error.message}`,
}));

const env = { reportOpen: vi.fn() };

const MenuItem = {
  name: 'MenuItem',
  props: ['option'],
  emits: ['click'],
  template:
    '<button class="item" @click="$emit(\'click\', $event)">{{ option.label }}</button>',
};
const ContextMenu = {
  name: 'ContextMenu',
  props: ['x', 'y'],
  emits: ['close'],
  template: '<div class="menu"><slot /></div>',
};
const NextButton = {
  name: 'NextButton',
  emits: ['click'],
  template: '<button class="open" @click="$emit(\'click\', $event)" />',
};
const Report = {
  name: 'ReportCaptainMessageDialog',
  props: ['messageId'],
  methods: { open: () => env.reportOpen() },
  template: '<div />',
};
const Modal = {
  name: 'WootModal',
  props: ['show', 'onClose'],
  emits: ['update:show'],
  template: '<div class="modal"><slot /></div>',
};
const DeleteModal = {
  name: 'WootDeleteModal',
  props: ['show', 'onClose', 'onConfirm'],
  emits: ['update:show'],
  template: '<div class="delete" />',
};
const AddCanned = {
  name: 'AddCannedModal',
  props: ['responseContent', 'onClose'],
  template: '<div />',
};

const ALL = {
  forwardEmail: true,
  replyTo: true,
  copy: true,
  translate: true,
  copyLink: true,
  cannedResponse: true,
  report: true,
  delete: true,
};
const message = {
  id: 11,
  conversation_id: 4,
  content: 'Hello',
  content_attributes: { inReplyTo: 2 },
};

const mountMenu = (props = {}, { uiLocale, accountLocale } = {}) => {
  const $store = {
    dispatch: vi.fn().mockResolvedValue(),
    getters: {
      'accounts/getAccount': () => ({ locale: accountLocale }),
      getCurrentAccountId: 1,
      getUISettings: uiLocale ? { locale: uiLocale } : null,
    },
  };
  const wrapper = mount(MessageContextMenu, {
    props: {
      message,
      isOpen: true,
      enabledOptions: ALL,
      contextMenuPosition: { x: 5, y: 6 },
      ...props,
    },
    global: {
      stubs: {
        MenuItem,
        ContextMenu,
        NextButton,
        ReportCaptainMessageDialog: Report,
        WootModal: Modal,
        WootDeleteModal: DeleteModal,
        AddCannedModal: AddCanned,
      },
      mocks: { $store, $t: key => key },
    },
  });
  return { wrapper, $store };
};

const click = (wrapper, key) =>
  wrapper
    .findAll('.item')
    .find(b => b.text().endsWith(key))
    .trigger('click');

describe('Message context menu behaviour', () => {
  beforeEach(() => {
    window.chatwootConfig = { hostURL: 'https://app.test' };
  });

  it('shows enabled options and opens from the button', async () => {
    const { wrapper } = mountMenu();
    expect(wrapper.findAll('.item')).toHaveLength(8);
    expect(wrapper.findComponent(ContextMenu).props()).toEqual({ x: 5, y: 6 });
    await wrapper.find('.open').trigger('click');
    expect(wrapper.emitted('open')).toHaveLength(1);
    wrapper.findComponent(ContextMenu).vm.$emit('close');
    expect(wrapper.emitted('close')).toHaveLength(1);
    expect(wrapper.vm.contentAttributes).toEqual({ in_reply_to: 2 });

    const bare = mountMenu({
      enabledOptions: {},
      hideButton: true,
      isOpen: false,
    });
    expect(bare.wrapper.find('.open').exists()).toBe(false);
    expect(bare.wrapper.find('.menu').exists()).toBe(false);
    expect(bare.wrapper.findComponent(Report).exists()).toBe(false);
  });

  it('uses empty defaults for options and position', () => {
    const wrapper = mount(MessageContextMenu, {
      props: { message, isOpen: true },
      global: {
        stubs: { MenuItem, ContextMenu, NextButton },
        mocks: { $store: { getters: {} }, $t: key => key },
      },
    });
    expect(wrapper.findAll('.item')).toHaveLength(0);
    expect(wrapper.findComponent(ContextMenu).props()).toEqual({
      x: undefined,
      y: undefined,
    });
  });

  it('reads camelCase messages', () => {
    const { wrapper } = mountMenu({
      message: {
        id: 3,
        conversationId: 9,
        content: 'x',
        contentAttributes: { a: 1 },
      },
    });
    expect(wrapper.vm.conversationId).toBe(9);
    expect(wrapper.vm.contentAttributes).toEqual({ a: 1 });
  });

  it('copies the text and the message link', async () => {
    const { wrapper } = mountMenu();
    await click(wrapper, 'CONTEXT_MENU.COPY');
    await flushPromises();
    expect(copyTextToClipboard).toHaveBeenCalledWith('plain:Hello');
    expect(useAlert).toHaveBeenLastCalledWith('CONTACT_PANEL.COPY_SUCCESSFUL');
    await click(wrapper, 'COPY_PERMALINK');
    await flushPromises();
    expect(copyTextToClipboard).toHaveBeenLastCalledWith(
      'https://app.test/app/accounts/1/conversations/4?messageId=11'
    );
    expect(useAlert).toHaveBeenLastCalledWith(
      'CONVERSATION.CONTEXT_MENU.LINK_COPIED'
    );
    expect(wrapper.emitted('close')).toHaveLength(2);
  });

  it('translates into the agent, account or default language', async () => {
    let { wrapper, $store } = mountMenu(
      {},
      { uiLocale: 'fr', accountLocale: 'de' }
    );
    await click(wrapper, 'TRANSLATE');
    await flushPromises();
    expect($store.dispatch).toHaveBeenCalledWith('translateMessage', {
      conversationId: 4,
      messageId: 11,
      targetLanguage: 'fr',
    });
    expect(useTrack).toHaveBeenCalled();
    ({ wrapper, $store } = mountMenu({}, { accountLocale: 'de' }));
    await click(wrapper, 'TRANSLATE');
    expect($store.dispatch).toHaveBeenLastCalledWith(
      'translateMessage',
      expect.objectContaining({ targetLanguage: 'de' })
    );
    ({ wrapper, $store } = mountMenu());
    $store.dispatch.mockRejectedValueOnce(new Error('quota'));
    await click(wrapper, 'TRANSLATE');
    await flushPromises();
    expect($store.dispatch).toHaveBeenLastCalledWith(
      'translateMessage',
      expect.objectContaining({ targetLanguage: 'en' })
    );
    expect(useAlert).toHaveBeenLastCalledWith('parsed:quota');
    expect(wrapper.emitted('close')).toHaveLength(1);
  });

  it('replies to and forwards the message', async () => {
    const { wrapper } = mountMenu();
    await click(wrapper, 'REPLY_TO');
    expect(wrapper.emitted('replyTo')).toEqual([[message]]);
    await click(wrapper, 'FORWARD_EMAIL');
    expect(wrapper.emitted('forwardEmail')).toHaveLength(1);
    expect(wrapper.emitted('close')).toHaveLength(2);
  });

  it('adds a canned response', async () => {
    const { wrapper } = mountMenu();
    await click(wrapper, 'CREATE_A_CANNED_RESPONSE');
    expect(wrapper.find('.menu').exists()).toBe(false);
    expect(wrapper.findComponent(AddCanned).props('responseContent')).toBe(
      'plain:Hello'
    );
    wrapper.findComponent(AddCanned).props('onClose')();
    await flushPromises();
    expect(wrapper.findComponent(AddCanned).exists()).toBe(false);
    await click(wrapper, 'CREATE_A_CANNED_RESPONSE');
    await wrapper.findComponent(Modal).vm.$emit('update:show', false);
    expect(wrapper.findComponent(AddCanned).exists()).toBe(false);
    expect(wrapper.emitted('close')).toHaveLength(1);
  });

  it('reports a Captain message', async () => {
    const { wrapper } = mountMenu();
    expect(wrapper.findComponent(Report).props('messageId')).toBe(11);
    await click(wrapper, 'REPORT_MESSAGE.LABEL');
    expect(env.reportOpen).toHaveBeenCalled();
    expect(wrapper.emitted('close')).toHaveLength(1);
  });

  it('deletes the message after confirmation', async () => {
    const { wrapper, $store } = mountMenu();
    await click(wrapper, 'CONTEXT_MENU.DELETE');
    const modal = () => wrapper.findComponent(DeleteModal);
    expect(modal().exists()).toBe(true);
    modal().props('onClose')();
    await flushPromises();
    expect(modal().exists()).toBe(false);
    await click(wrapper, 'CONTEXT_MENU.DELETE');
    await modal().vm.$emit('update:show', false);
    expect(modal().exists()).toBe(false);

    await click(wrapper, 'CONTEXT_MENU.DELETE');
    await modal().props('onConfirm')();
    expect($store.dispatch).toHaveBeenCalledWith('deleteMessage', {
      conversationId: 4,
      messageId: 11,
    });
    expect(useAlert).toHaveBeenLastCalledWith(
      'CONVERSATION.SUCCESS_DELETE_MESSAGE'
    );
    $store.dispatch.mockRejectedValueOnce(new Error('x'));
    await modal().props('onConfirm')();
    expect(useAlert).toHaveBeenLastCalledWith(
      'CONVERSATION.FAIL_DELETE_MESSSAGE'
    );
  });
});
