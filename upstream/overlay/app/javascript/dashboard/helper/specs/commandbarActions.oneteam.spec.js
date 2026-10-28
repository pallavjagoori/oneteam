import { emitter } from 'shared/helpers/mitt';
import {
  MUTE_ACTION,
  OPEN_CONVERSATION_ACTIONS,
  RESOLVED_CONVERSATION_ACTIONS,
  SEND_TRANSCRIPT_ACTION,
  SNOOZE_CONVERSATION_ACTIONS,
  UNMUTE_ACTION,
} from '../commandbar/actions';
import {
  CMD_MUTE_CONVERSATION,
  CMD_REOPEN_CONVERSATION,
  CMD_RESOLVE_CONVERSATION,
  CMD_SEND_TRANSCRIPT,
  CMD_SNOOZE_CONVERSATION,
  CMD_UNMUTE_CONVERSATION,
} from '../commandbar/events';

describe('command bar actions (OneTeam)', () => {
  const emit = vi.spyOn(emitter, 'emit');

  it.each([
    [OPEN_CONVERSATION_ACTIONS[0], CMD_RESOLVE_CONVERSATION],
    [RESOLVED_CONVERSATION_ACTIONS[0], CMD_REOPEN_CONVERSATION],
    [SEND_TRANSCRIPT_ACTION, CMD_SEND_TRANSCRIPT],
    [UNMUTE_ACTION, CMD_UNMUTE_CONVERSATION],
    [MUTE_ACTION, CMD_MUTE_CONVERSATION],
  ])('%s emits its event', (action, event) => {
    action.handler();
    expect(emit).toHaveBeenCalledWith(event);
  });

  it('emits the chosen snooze option', () => {
    const [, firstOption] = SNOOZE_CONVERSATION_ACTIONS;
    firstOption.handler();
    expect(emit).toHaveBeenCalledWith(CMD_SNOOZE_CONVERSATION, firstOption.id);
  });
});
