import {
  formatDelay,
  generateAutomationPayload,
  generateCustomAttributeTypes,
  generateCustomAttributes,
  generateTeamOptions,
  getActionIcon,
  getConditionOptions,
  getDefaultConditions,
  getFileName,
  getOperators,
} from '../automationHelper';
import {
  DEFAULT_CONVERSATION_CONDITION,
  DEFAULT_OTHER_CONDITION,
} from 'dashboard/constants/automation';

describe('automationHelper (OneTeam)', () => {
  it('describes custom attributes as filter types', () => {
    const [type] = generateCustomAttributeTypes(
      [
        {
          attribute_key: 'plan',
          attribute_display_name: 'Plan',
          attribute_display_type: 'list',
        },
      ],
      'conversation_attribute'
    );
    expect(type).toMatchObject({
      key: 'plan',
      name: 'Plan',
      inputType: 'search_select',
      attributeDisplayType: 'list',
      customAttributeType: 'conversation_attribute',
    });
  });

  it('turns teams into options with their emoji and colour', () => {
    expect(
      generateTeamOptions([
        { id: 1, name: 'Sales', icon: '💼', icon_color: 'blue' },
      ])
    ).toEqual([{ id: 1, name: 'Sales', emoji: '💼', iconColor: 'blue' }]);
    expect(generateTeamOptions(null)).toEqual([]);
  });

  it('uses a default icon for unknown actions', () => {
    expect(getActionIcon('teleport')).toBe('i-lucide-zap');
  });

  describe('getConditionOptions', () => {
    const customAttributes = [
      { attribute_key: 'vip', attribute_display_type: 'checkbox' },
      {
        attribute_key: 'plan',
        attribute_display_type: 'list',
        attribute_values: ['free', 'pro'],
      },
    ];

    it('offers yes/no for checkbox attributes', () => {
      const booleanFilterOptions = [{ id: true }, { id: false }];
      expect(
        getConditionOptions({
          customAttributes,
          booleanFilterOptions,
          type: 'vip',
        })
      ).toBe(booleanFilterOptions);
    });

    it('offers the values of list attributes', () => {
      expect(getConditionOptions({ customAttributes, type: 'plan' })).toEqual([
        { id: 'free', name: 'free' },
        { id: 'pro', name: 'pro' },
      ]);
    });
  });

  describe('getFileName', () => {
    const files = [{ blob_id: 'b1', filename: 'a.pdf' }];

    it('finds the attachment name', () => {
      expect(
        getFileName(
          { action_name: 'send_attachment', action_params: ['b1'] },
          files
        )
      ).toBe('a.pdf');
    });

    it('returns nothing without a blob, a match or an attachment action', () => {
      expect(getFileName({ action_params: [] })).toBe('');
      expect(
        getFileName(
          { action_name: 'send_attachment', action_params: ['b2'] },
          files
        )
      ).toBe('');
      expect(
        getFileName(
          { action_name: 'send_message', action_params: ['b1'] },
          files
        )
      ).toBe('');
    });
  });

  it('picks default conditions by event', () => {
    expect(getDefaultConditions('monitor_matched')).toEqual([]);
    expect(getDefaultConditions('conversation_resolved')).toEqual(
      DEFAULT_CONVERSATION_CONDITION
    );
    expect(getDefaultConditions('conversation_updated')).toEqual(
      DEFAULT_OTHER_CONDITION
    );
  });

  it('formats delays in days, hours or minutes', () => {
    expect([2880, 120, 45].map(formatDelay)).toEqual(['2d', '2h', '45m']);
  });

  it('adds only the attribute groups that have attributes', () => {
    expect(generateCustomAttributes([], [], 'Conv', 'Contact')).toEqual([]);
    expect(generateCustomAttributes().length).toBe(0);
  });

  it('builds a payload without conditions', () => {
    expect(generateAutomationPayload({ conditions: [], actions: [] })).toEqual({
      conditions: [],
      actions: [],
    });
  });

  it('uses the standard operators when a custom attribute is not found in edit mode', () => {
    const automationTypes = {
      message_created: {
        conditions: [{ key: 'status', filterOperators: ['equal_to'] }],
      },
    };
    expect(
      getOperators(
        [],
        automationTypes,
        { event_name: 'message_created' },
        'edit',
        'status'
      )
    ).toEqual(['equal_to']);
  });
});
