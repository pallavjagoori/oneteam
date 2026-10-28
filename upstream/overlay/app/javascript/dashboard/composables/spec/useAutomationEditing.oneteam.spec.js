import { useAlert } from 'dashboard/composables';
import { useAutomation } from '../useAutomation';
import { useEditableAutomation } from '../useEditableAutomation';

/*
 * OneTeam coverage for the automation rule builder: the guards that keep
 * at least one condition and action, monitor rules (which may have no
 * conditions), re-running the custom attribute merge, and turning a saved
 * rule's conditions and actions back into editor values.
 */
const ctx = vi.hoisted(() => ({
  dropdown: {},
}));

vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: key => key }) }));
vi.mock('dashboard/composables', () => ({ useAlert: vi.fn() }));
vi.mock('dashboard/composables/store', () => ({
  useStoreGetters: () => ({
    'attributes/getAttributesByModel': {
      value: model => [
        {
          attribute_key: `${model}_plan`,
          attribute_display_name: 'Plan',
          attribute_display_type: 'text',
          attribute_model: model,
        },
      ],
    },
  }),
}));
vi.mock('../useAutomationValues', () => ({
  default: () => ({
    getConditionDropdownValues: key => ctx.dropdown[key] || [],
    getActionDropdownValues: key => ctx.dropdown[key] || [],
  }),
}));

describe('automation editing (OneTeam)', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('useAutomation', () => {
    it('keeps the last action and condition, except for monitor rules', () => {
      const { automation, removeAction, removeFilter, appendNewCondition } =
        useAutomation({
          event_name: 'monitor_matched',
          conditions: [{ attribute_key: 'status' }],
          actions: [{ action_name: 'add_label' }],
        });
      removeAction(0);
      expect(useAlert).toHaveBeenCalledWith('AUTOMATION.ACTION.DELETE_MESSAGE');
      removeFilter(0);
      expect(automation.value.conditions).toEqual([]);
      appendNewCondition();
      expect(automation.value.conditions).toHaveLength(1);

      automation.value.event_name = 'conversation_created';
      removeFilter(0);
      expect(useAlert).toHaveBeenCalledWith(
        'AUTOMATION.CONDITION.DELETE_MESSAGE'
      );
    });

    it('replaces earlier custom attribute conditions when merged again', () => {
      const { automationTypes, manifestCustomAttributes } = useAutomation();
      manifestCustomAttributes();
      const once = automationTypes.message_created.conditions.length;
      manifestCustomAttributes();
      expect(automationTypes.message_created.conditions).toHaveLength(once);
      expect(
        automationTypes.message_created.conditions.filter(
          c => c.key === 'conversation_custom_attribute'
        )
      ).toHaveLength(1);
    });
  });

  describe('useEditableAutomation', () => {
    const automationTypes = {
      conversation_created: {
        conditions: [
          { key: 'browser_language', inputType: 'search_select' },
          { key: 'phone_number', inputType: 'plain_text' },
        ],
      },
    };
    const actionTypes = [
      { key: 'add_label', inputType: 'multi_select' },
      { key: 'send_email_to_team', inputType: 'team_message' },
      { key: 'send_webhook_event', inputType: 'url' },
    ];

    it('reads custom attribute and multi-option conditions back', () => {
      ctx.dropdown = {
        browser_language: [
          { id: 'en', name: 'English' },
          { id: 'fr', name: 'French' },
        ],
      };
      const { formatAutomation } = useEditableAutomation();
      const { conditions } = formatAutomation(
        {
          event_name: 'conversation_created',
          actions: [],
          conditions: [
            {
              attribute_key: 'plan',
              values: ['pro'],
              query_operator: 'or',
            },
            { attribute_key: 'browser_language', values: ['fr'] },
          ],
        },
        [{ attribute_key: 'plan', attribute_display_type: 'text' }],
        automationTypes,
        actionTypes
      );
      expect(conditions[0]).toMatchObject({
        values: 'pro',
        query_operator: 'or',
      });
      expect(conditions[1].values).toEqual([{ id: 'fr', name: 'French' }]);
    });

    it('reads team messages, plain params and empty actions back', () => {
      ctx.dropdown = {
        add_label: [{ id: 'vip' }, { id: 'new' }],
        send_email_to_team: [{ id: 1, name: 'Sales' }, { id: 2 }],
      };
      const { formatAutomation } = useEditableAutomation();
      const { actions } = formatAutomation(
        {
          conditions: [],
          actions: [
            { action_name: 'add_label', action_params: ['vip'] },
            {
              action_name: 'send_email_to_team',
              action_params: [{ team_ids: [1], message: 'Hi' }],
            },
            { action_name: 'send_webhook_event', action_params: ['https://x'] },
            { action_name: 'add_label', action_params: [] },
          ],
        },
        [],
        automationTypes,
        actionTypes
      );
      expect(actions.map(a => a.action_params)).toEqual([
        [{ id: 'vip' }],
        { team_ids: [{ id: 1, name: 'Sales' }], message: 'Hi' },
        ['https://x'],
        [],
      ]);
    });
  });
});
