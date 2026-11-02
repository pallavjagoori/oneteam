/**
 * OneTeam behaviour spec for the open conversation's header.
 *
 * Covers the contact's avatar and name, the unverified web widget
 * warning, copying the conversation id, the inbox name when there are
 * several inboxes, the email subject, the snoozed note (until a time or
 * the next reply), the back link for each list the agent came from,
 * and the SLA badge (hidden for blocked contacts).
 */
import { mount, flushPromises } from '@vue/test-utils';
import { ref } from 'vue';
import { useAlert } from 'dashboard/composables';
import { copyTextToClipboard } from 'shared/helpers/clipboard';
import { conversationListPageURL } from 'dashboard/helper/URLHelper';
import ConversationHeader from '../ConversationHeader.vue';

const route = { params: {}, name: 'inbox_conversation' };
const isAWebWidgetInbox = ref(false);
const isAnEmailChannel = ref(false);
const state = {};

vi.mock('vue-router', async importOriginal => ({
  ...(await importOriginal()),
  useRoute: () => route,
}));
vi.mock('vuex', async importOriginal => ({
  ...(await importOriginal()),
  useStore: () => ({
    getters: {
      getSelectedChat: state.selected,
      getCurrentAccountId: 1,
      'contacts/getContact': () => state.contact,
      'inboxes/getInbox': id => ({ id, name: 'Support' }),
      'inboxes/getInboxes': state.inboxes,
    },
  }),
}));
vi.mock('@vueuse/core', async importOriginal => ({
  ...(await importOriginal()),
  useElementSize: () => ({ width: ref(640) }),
}));
vi.mock('dashboard/composables/useInbox', () => ({
  useInbox: () => ({ isAWebWidgetInbox, isAnEmailChannel }),
}));
vi.mock('dashboard/composables', () => ({ useAlert: vi.fn() }));
vi.mock('shared/helpers/clipboard', () => ({ copyTextToClipboard: vi.fn() }));
vi.mock('dashboard/helper/snoozeHelpers', () => ({
  snoozedReopenTime: time => `at ${time}`,
}));
vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: key => key }) }));

const BackButton = {
  name: 'BackButton',
  props: ['backUrl'],
  template: '<a class="back" />',
};
const SLACardLabel = {
  name: 'SLACardLabel',
  props: ['chat', 'parentWidth'],
  template: '<div class="sla" />',
};

const chat = (extra = {}) => ({
  id: 42,
  inbox_id: 3,
  meta: { sender: { id: 9 }, hmac_verified: false },
  additional_attributes: { mail_subject: 'Invoice' },
  ...extra,
});

const mountHeader = (props = {}) =>
  mount(ConversationHeader, {
    props: { chat: chat(), ...props },
    global: {
      stubs: {
        BackButton,
        SLACardLabel,
        Avatar: {
          props: ['name', 'src'],
          template: '<i class="avatar" :data-name="name" />',
        },
        InboxName: {
          props: ['inbox'],
          template: '<span class="inbox">{{ inbox.name }}</span>',
        },
        ConversationCallButton: true,
        MoreActions: {
          props: ['conversationId'],
          template: '<div class="more" />',
        },
        FluentIcon: { template: '<i class="warning" />' },
      },
      directives: { tooltip: {} },
    },
  });

describe('ConversationHeader behaviour', () => {
  beforeEach(() => {
    route.params = {};
    route.name = 'inbox_conversation';
    isAWebWidgetInbox.value = false;
    isAnEmailChannel.value = false;
    state.selected = { id: 42, status: 'open' };
    state.contact = { name: 'Ann', thumbnail: 'a.png' };
    state.inboxes = [{ id: 3 }];
    vi.clearAllMocks();
  });

  it('shows the contact and the conversation id', async () => {
    const wrapper = mountHeader();
    expect(wrapper.text()).toContain('Ann');
    expect(wrapper.find('.avatar').attributes('data-name')).toBe('Ann');
    expect(wrapper.find('.warning').exists()).toBe(false);
    expect(wrapper.find('.inbox').exists()).toBe(false);
    expect(wrapper.text()).not.toContain('Invoice');
    expect(wrapper.find('.back').exists()).toBe(false);
    expect(wrapper.find('.sla').exists()).toBe(false);

    await wrapper.find('button').trigger('click');
    await flushPromises();
    expect(copyTextToClipboard).toHaveBeenCalledWith('42');
    expect(useAlert).toHaveBeenCalledWith(
      'CONVERSATION.HEADER.COPY_ID_SUCCESS'
    );

    copyTextToClipboard.mockRejectedValueOnce(new Error('denied'));
    await wrapper.find('button').trigger('click');
    await flushPromises();
    expect(useAlert).toHaveBeenCalledTimes(1);
  });

  it('warns about unverified web widget visitors', () => {
    isAWebWidgetInbox.value = true;
    expect(mountHeader().find('.warning').exists()).toBe(true);
    const verified = mountHeader({
      chat: chat({ meta: { sender: { id: 9 }, hmac_verified: true } }),
    });
    expect(verified.find('.warning').exists()).toBe(false);
  });

  it('shows the inbox, email subject and snooze state', () => {
    state.inboxes = [{ id: 3 }, { id: 4 }];
    isAnEmailChannel.value = true;
    state.selected = { id: 42, status: 'snoozed', snoozed_until: 1700 };
    const wrapper = mountHeader();
    expect(wrapper.find('.inbox').text()).toBe('Support');
    expect(wrapper.text()).toContain('Invoice');
    expect(wrapper.text()).toContain(
      'CONVERSATION.HEADER.SNOOZED_UNTIL at 1700'
    );

    state.selected = { id: 42, status: 'snoozed' };
    expect(mountHeader().text()).toContain(
      'CONVERSATION.HEADER.SNOOZED_UNTIL_NEXT_REPLY'
    );
    expect(
      mountHeader({ chat: chat({ additional_attributes: undefined }) }).text()
    ).not.toContain('Invoice');
  });

  it('links back to the list the agent came from', () => {
    const backUrl = () =>
      mountHeader({ showBackButton: true })
        .findComponent(BackButton)
        .props('backUrl');
    expect(backUrl()).toBe(conversationListPageURL({ accountId: 1 }));

    route.name = 'conversation_through_mentions';
    expect(backUrl()).toBe(
      conversationListPageURL({ accountId: 1, conversationType: 'mention' })
    );
    route.name = 'conversation_through_participating';
    expect(backUrl()).toContain('participating');
    route.name = 'conversation_through_unattended';
    expect(backUrl()).toContain('unattended');

    route.name = 'inbox_conversation';
    route.params = { inbox_id: 3 };
    expect(backUrl()).toBe(
      conversationListPageURL({ accountId: 1, inboxId: 3 })
    );
    route.params = { label: 'vip' };
    expect(backUrl()).toContain('vip');
    route.params = { teamId: 5 };
    expect(backUrl()).toBe(
      conversationListPageURL({ accountId: 1, teamId: 5 })
    );
    route.params = { id: 8 };
    expect(backUrl()).toBe(
      conversationListPageURL({ accountId: 1, customViewId: 8 })
    );
  });

  it('shows the SLA badge unless the contact is blocked', () => {
    const withSla = chat({ applied_sla: { id: 2 } });
    const sla = mountHeader({ chat: withSla }).findComponent(SLACardLabel);
    expect(sla.props('parentWidth')).toBe(640);
    state.contact = { name: 'Ann', blocked: true };
    expect(mountHeader({ chat: withSla }).find('.sla').exists()).toBe(false);
  });
});
