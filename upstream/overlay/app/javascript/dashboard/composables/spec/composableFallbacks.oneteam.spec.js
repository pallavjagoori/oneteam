import { ref } from 'vue';
import { getActionOptions } from 'dashboard/helper/automationHelper';
import { useKeyboardEvents } from 'dashboard/composables/useKeyboardEvents';
import { useAgentsList } from '../useAgentsList';
import useAutomationValues from '../useAutomationValues';
import { useConversationRequiredAttributes } from '../useConversationRequiredAttributes';
import { useKeyboardNavigableList } from '../useKeyboardNavigableList';
import { useOrderedMacros } from '../useOrderedMacros';
import { useInbox } from '../useInbox';

/*
 * OneTeam coverage for the fallbacks in several composables that
 * Chatwoot's own specs never reach: a missing translation falling back to
 * English, and getters that have not loaded yet (undefined lists, no inbox,
 * no UI settings). The store getters are set per test through ctx.getters.
 */
const ctx = vi.hoisted(() => ({ getters: {}, settings: undefined }));

vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: () => '' }) }));
vi.mock('dashboard/composables/store', () => ({
  useMapGetter: name => ({
    get value() {
      return ctx.getters[name];
    },
  }),
  useStoreGetters: () => ({
    'attributes/getAttributes': { value: [] },
  }),
}));
vi.mock('dashboard/composables/useAccount', () => ({
  useAccount: () => ({
    currentAccount: {
      value: { settings: { conversation_required_attributes: ['plan'] } },
    },
    accountId: { value: 1 },
  }),
}));
vi.mock('dashboard/composables/useUISettings', () => ({
  useUISettings: () => ({
    uiSettings: {
      get value() {
        return ctx.settings;
      },
    },
    updateUISettings: vi.fn(),
  }),
}));
vi.mock('dashboard/composables/useKeyboardEvents', () => ({
  useKeyboardEvents: vi.fn(),
}));
vi.mock('./useKeyboardEvents', () => ({ useKeyboardEvents: vi.fn() }));
vi.mock('dashboard/helper/automationHelper', () => ({
  getActionOptions: vi.fn(() => []),
  getConditionOptions: vi.fn(() => []),
}));

describe('composable fallbacks (OneTeam)', () => {
  beforeEach(() => {
    ctx.getters = {};
    ctx.settings = undefined;
  });

  it('names the "None" agent in English and lists no agents before they load', () => {
    ctx.getters = {
      getSelectedChat: { inbox_id: 1, meta: { assignee: { id: 2 } } },
      'inboxAssignableAgents/getAssignableAgents': () => undefined,
      getCurrentUser: { id: 1 },
      getCurrentAccountId: 1,
    };
    const [none] = useAgentsList().agentsList.value;
    expect(none.name).toBe('None');
  });

  it('adds an English "None" option, even to a missing list', () => {
    useAutomationValues().getActionDropdownValues('assign_team');
    const [[{ addNoneToListFn }]] = getActionOptions.mock.calls;
    expect(addNoneToListFn(undefined)).toEqual([{ id: 'nil', name: 'None' }]);
  });

  it('requires nothing while the feature is off or attributes are not loaded', () => {
    ctx.getters = { 'accounts/isFeatureEnabledonAccount': () => false };
    const required = useConversationRequiredAttributes();
    expect(required.requiredAttributes.value).toEqual([]);
    ctx.getters['accounts/isFeatureEnabledonAccount'] = () => true;
    expect(
      useConversationRequiredAttributes().requiredAttributes.value
    ).toEqual([]);
  });

  it('ignores navigation keys while the list is not loaded', () => {
    const adjustScroll = vi.fn();
    useKeyboardNavigableList({
      items: ref(undefined),
      adjustScroll,
      selectedIndex: ref(0),
    });
    const [[events]] = useKeyboardEvents.mock.calls.slice(-1);
    const event = { preventDefault: vi.fn() };
    events.ArrowDown.action(event);
    expect(event.preventDefault).not.toHaveBeenCalled();
    expect(adjustScroll).not.toHaveBeenCalled();
  });

  it('lists no macros before they or the UI settings load', () => {
    expect(useOrderedMacros().orderedMacros.value).toEqual([]);
  });

  it('reports no inbox details without a selected chat, provider or medium', () => {
    const none = useInbox();
    expect(none.isAWhatsAppCloudChannel.value).toBe(false);
    expect(none.isATwilioSMSChannel.value).toBe(false);
    expect(none.isATwilioWhatsAppChannel.value).toBe(false);

    ctx.getters['inboxes/getInboxById'] = id =>
      ({
        5: { channel_type: 'Channel::Whatsapp' },
        6: { channel_type: 'Channel::TwilioSms' },
      })[id];
    expect(useInbox(5).isAWhatsAppCloudChannel.value).toBe(false);
    const twilio = useInbox(6);
    expect(twilio.isATwilioSMSChannel.value).toBe(false);
    expect(twilio.isATwilioWhatsAppChannel.value).toBe(false);
  });
});
