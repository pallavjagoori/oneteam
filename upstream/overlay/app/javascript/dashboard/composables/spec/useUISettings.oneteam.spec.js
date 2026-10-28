import { ref } from 'vue';
import {
  useUISettings,
  DEFAULT_CONVERSATION_SIDEBAR_ITEMS_ORDER,
  DEFAULT_CONTACT_SIDEBAR_ITEMS_ORDER,
} from '../useUISettings';

/*
 * OneTeam coverage for UI settings that were never saved: default sidebar
 * orders, new sidebar items added to an old saved order, the condensed
 * layout default, channels without a type, and the send hotkey derived
 * from the older enter_to_send flag.
 */
const settings = ref({});
const dispatch = vi.fn();

vi.mock('dashboard/composables/store', () => ({
  useStoreGetters: () => ({ getUISettings: settings }),
  useStore: () => ({ dispatch }),
}));

describe('useUISettings defaults (OneTeam)', () => {
  beforeEach(() => {
    settings.value = {};
    dispatch.mockClear();
  });

  it('uses the default sidebar orders and condensed layout when nothing is saved', () => {
    const ui = useUISettings();
    expect(ui.conversationSidebarItemsOrder.value).toEqual(
      DEFAULT_CONVERSATION_SIDEBAR_ITEMS_ORDER
    );
    expect(ui.contactSidebarItemsOrder.value).toBe(
      DEFAULT_CONTACT_SIDEBAR_ITEMS_ORDER
    );
    expect(ui.isOnExpandedLayout.value).toBe(false);
    settings.value = { conversation_display_type: 'expanded' };
    expect(ui.isOnExpandedLayout.value).toBe(true);
  });

  it('appends sidebar items that a saved order does not know yet', () => {
    settings.value = {
      conversation_sidebar_items_order: [{ name: 'macros' }],
    };
    const order = useUISettings().conversationSidebarItemsOrder.value;
    expect(order[0]).toEqual({ name: 'macros' });
    expect(order).toHaveLength(DEFAULT_CONVERSATION_SIDEBAR_ITEMS_ORDER.length);
  });

  it('ignores signature settings without a channel type', () => {
    const ui = useUISettings();
    ui.setSignatureFlagForInbox(undefined, true);
    expect(dispatch).not.toHaveBeenCalled();
    expect(ui.fetchSignatureFlagFromUISettings(undefined)).toBe(false);
  });

  it('derives the send hotkey from the older enter-to-send flag', () => {
    const ui = useUISettings();
    expect(ui.isEditorHotKeyEnabled('cmd_enter')).toBe(true);
    settings.value = { enter_to_send_enabled: true };
    expect(ui.isEditorHotKeyEnabled('enter')).toBe(true);
    settings.value = null;
    expect(ui.isEditorHotKeyEnabled('enter')).toBe(false);
  });
});
