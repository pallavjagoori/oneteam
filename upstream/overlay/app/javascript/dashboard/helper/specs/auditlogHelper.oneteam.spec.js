import {
  extractChangedAccountUserValues,
  generateLogActionKey,
  generateTranslationPayload,
} from '../auditlogHelper';

const agents = [{ id: 1, name: 'Jo' }];
const log = attrs => ({
  user_id: 1,
  auditable_id: 10,
  auditable_type: 'Inbox',
  action: 'update',
  audited_changes: {},
  ...attrs,
});

describe('auditlogHelper (OneTeam)', () => {
  it('reads single values as well as [old, new] pairs', () => {
    expect(
      extractChangedAccountUserValues({ role: 'x', availability: [0, 2] })
    ).toEqual({
      changes: ['role', 'availability'],
      values: [undefined, 'busy'],
    });
  });

  it('names the system and unknown agents', () => {
    expect(
      generateTranslationPayload(log({ user_id: null }), agents).agentName
    ).toBe('System');
    expect(
      generateTranslationPayload(log({ user_id: 7 }), agents).agentName
    ).toBe(7);
  });

  it('uses the display ID of a deleted conversation, else its own ID', () => {
    const destroyed = { auditable_type: 'Conversation', action: 'destroy' };
    expect(
      generateTranslationPayload(
        log({ ...destroyed, audited_changes: { display_id: 3 } }),
        agents
      ).id
    ).toBe(3);
    expect(
      generateTranslationPayload(
        log({ ...destroyed, audited_changes: null }),
        agents
      ).id
    ).toBe(10);
  });

  it('records the conversation of a deleted message', () => {
    expect(
      generateTranslationPayload(
        log({
          auditable_type: 'Message',
          action: 'destroy',
          audited_changes: null,
        }),
        agents
      )
    ).toEqual({ agentName: 'Jo', id: 10, conversationId: undefined });
  });

  describe('account users', () => {
    it('falls back to an unknown role for new users', () => {
      expect(
        generateTranslationPayload(
          log({
            auditable_type: 'AccountUser',
            action: 'create',
            audited_changes: { user_id: 1, role: 9 },
          }),
          agents
        )
      ).toMatchObject({ invitee: 'Jo', role: 'unknown' });
    });

    it('names the changed user only when it is someone else', () => {
      const self = generateTranslationPayload(
        log({
          auditable_type: 'AccountUser',
          auditable: { user_id: 1 },
          audited_changes: { role: [0, 1] },
        }),
        agents
      );
      expect(self.user).toBeUndefined();
      expect(self.values).toEqual(['administrator']);
    });

    it('ignores other actions', () => {
      expect(
        generateTranslationPayload(
          log({ auditable_type: 'AccountUser', action: 'destroy' }),
          agents
        )
      ).toEqual({ agentName: 'Jo', id: 10 });
    });
  });

  describe('inbox and team members', () => {
    it('records the team, inbox and user that changed', () => {
      expect(
        generateTranslationPayload(
          log({
            auditable_type: 'TeamMember',
            action: 'create',
            audited_changes: { user_id: 1, team_id: 4, inbox_id: 5 },
          }),
          agents
        )
      ).toEqual({
        agentName: 'Jo',
        id: 10,
        user: 'Jo',
        team_id: 4,
        inbox_id: 5,
      });
    });

    it('copes with no recorded changes', () => {
      expect(
        generateTranslationPayload(
          log({ auditable_type: 'InboxMember', audited_changes: null }),
          agents
        )
      ).toEqual({ agentName: 'Jo', id: 10 });
      expect(
        generateTranslationPayload(
          log({ auditable_type: 'InboxMember' }),
          agents
        )
      ).toEqual({ agentName: 'Jo', id: 10 });
    });
  });

  it('returns an empty key for unknown actions', () => {
    expect(generateLogActionKey(log({ auditable_type: 'Widget' }))).toBe('');
  });
});
