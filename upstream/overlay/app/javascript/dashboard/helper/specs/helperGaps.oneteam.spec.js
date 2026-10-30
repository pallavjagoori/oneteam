// Fills the remaining coverage gaps in small helpers that already have
// Chatwoot specs. Each block names the helper it covers.
import { conversationUrl } from '../URLHelper';
import {
  getAgentsByAvailability,
  getAgentsByUpdatedPresence,
  isAIAssigneeType,
} from '../agentHelper';
import { isEmptyObject } from '../commons';
import { getLastMessage } from '../conversationHelper';
import { downloadCsvFile } from '../downloadHelper';
import filterQueryGenerator from '../filterQueryGenerator';
import { getCustomFields, getFormattedPreChatFields } from '../preChat';
import { formatStripeAmount } from '../stripeHelper';
import { validateSingleFilter } from '../validations';
import { buildSuggestionCandidates } from '../snoozeDateParser/suggestions';

describe('URLHelper.conversationUrl (OneTeam)', () => {
  const base = { accountId: 1, id: 9 };

  it.each([
    [{ foldersId: 3 }, 'accounts/1/custom_view/3/conversations/9'],
    [{ conversationType: 'mention' }, 'accounts/1/mentions/conversations/9'],
    [
      { conversationType: 'participating' },
      'accounts/1/participating/conversations/9',
    ],
    [
      { conversationType: 'unattended' },
      'accounts/1/unattended/conversations/9',
    ],
    [{ foldersId: 0 }, 'accounts/1/conversations/9'],
  ])('builds the URL for %o', (extra, url) => {
    expect(conversationUrl({ ...base, ...extra })).toBe(url);
  });
});

describe('agentHelper (OneTeam)', () => {
  it('sorts agents without names first', () => {
    expect(
      getAgentsByAvailability(
        [
          { name: 'B', availability_status: 'online' },
          { availability_status: 'online' },
          { name: 'A', availability_status: 'online' },
        ],
        'online'
      ).map(agent => agent.name)
    ).toEqual([undefined, 'A', 'B']);
  });

  it('treats any non-user assignee as AI', () => {
    expect(isAIAssigneeType('AgentBot')).toBe(true);
    expect(isAIAssigneeType('User')).toBe(false);
    expect(isAIAssigneeType(null)).toBe(false);
  });

  it('updates presence only for the current user as a human assignee', () => {
    const agents = [
      { id: 1, availability_status: 'offline', assignee_type: 'AgentBot' },
      { id: 1, availability_status: 'offline' },
    ];
    const currentUser = {
      id: 1,
      accounts: [{ id: 5, availability_status: 'online' }],
    };
    expect(
      getAgentsByUpdatedPresence(agents, currentUser, 5).map(
        agent => agent.availability_status
      )
    ).toEqual(['offline', 'online']);
  });
});

describe('commons.isEmptyObject (OneTeam)', () => {
  it('is true only for an empty plain object', () => {
    expect(isEmptyObject({})).toBe(true);
    expect(isEmptyObject({ a: 1 })).toBe(false);
    expect(isEmptyObject(new Date(0))).toBe(false);
  });
});

describe('conversationHelper.getLastMessage (OneTeam)', () => {
  it('falls back to the last activity message', () => {
    const activity = { id: 1, message_type: 2 };
    expect(getLastMessage({ messages: [activity] })).toBe(activity);
  });

  it('prefers the newer of the store and API messages', () => {
    const inStore = { id: 1, message_type: 0, created_at: 10 };
    const fromApi = { id: 2, message_type: 0, created_at: 20 };
    expect(
      getLastMessage({
        messages: [inStore],
        last_non_activity_message: fromApi,
      })
    ).toBe(fromApi);
    expect(
      getLastMessage({ messages: [], last_non_activity_message: fromApi })
    ).toBe(fromApi);
  });
});

describe('downloadHelper.downloadCsvFile (OneTeam)', () => {
  it('downloads the content through a temporary link', () => {
    URL.createObjectURL = vi.fn(() => 'blob:report');
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => {});
    const link = downloadCsvFile('report.csv', 'a,b');
    expect(link.getAttribute('download')).toBe('report.csv');
    expect(link.getAttribute('href')).toBe('blob:report');
    expect(click).toHaveBeenCalled();
    click.mockRestore();
  });
});

describe('filterQueryGenerator (OneTeam)', () => {
  it('turns empty values into an empty list', () => {
    const [query] = filterQueryGenerator([
      {
        attribute_key: 'status',
        filter_operator: 'equal_to',
        values: '',
        query_operator: 'and',
      },
    ]).payload;
    expect(query.values).toEqual([]);
  });

  it('can skip the timezone on timestamp filters', () => {
    const [query] = filterQueryGenerator(
      [
        {
          attribute_key: 'created_at',
          filter_operator: 'is_greater_than',
          values: '2026-01-01',
          timezone: 'Asia/Kolkata',
        },
      ],
      { useLocalTimezone: false }
    ).payload;
    expect(query.timezone).toBe('Asia/Kolkata');
  });
});

describe('preChat (OneTeam)', () => {
  it('keeps custom labels and placeholders for unknown fields', () => {
    expect(
      getFormattedPreChatFields({
        preChatFields: [
          { name: 'order', label: 'Order', placeholder: 'Order no.' },
          { name: 'plan' },
          { name: 'FULL_NAME', label: 'Ignored', placeholder: 'Ignored' },
        ],
      }).map(({ label, placeholder }) => [label, placeholder])
    ).toEqual([
      ['Order', 'Order no.'],
      ['plan', 'plan'],
      ['Full Name', 'Please enter your full name'],
    ]);
  });

  it('adds only attributes that are not already pre-chat fields', () => {
    expect(
      getCustomFields({
        standardFields: { pre_chat_fields: [{ name: 'plan' }] },
        customAttributes: [
          { attribute_key: 'plan' },
          { attribute_key: 'size', attribute_display_name: 'Size' },
        ],
      }).map(field => field.name)
    ).toEqual(['size']);
  });
});

describe('stripeHelper.formatStripeAmount (OneTeam)', () => {
  it('uses the currency precision', () => {
    expect(formatStripeAmount(500, 'jpy')).toContain('500');
    expect(formatStripeAmount(1500, 'kwd')).toContain('1.500');
  });

  it('can keep extra precision from the amount', () => {
    expect(
      formatStripeAmount('1234.5', 'usd', { preservePrecision: true })
    ).toContain('12.345');
    expect(
      formatStripeAmount('1234', 'usd', { preservePrecision: true })
    ).toContain('12.34');
  });
});

describe('validations.validateSingleFilter (OneTeam)', () => {
  it('accepts days_before inside the allowed range', () => {
    expect(
      validateSingleFilter({
        attribute_key: 'created_at',
        filter_operator: 'days_before',
        values: '998',
      })
    ).toBeNull();
    expect(
      validateSingleFilter({
        attribute_key: 'created_at',
        filter_operator: 'days_before',
        values: '999',
      })
    ).toBe('VALUE_MUST_BE_BETWEEN_1_AND_998');
  });
});

describe('snoozeDateParser.buildSuggestionCandidates (OneTeam)', () => {
  it('returns nothing for empty input', () => {
    expect(buildSuggestionCandidates('')).toEqual([]);
  });
});
