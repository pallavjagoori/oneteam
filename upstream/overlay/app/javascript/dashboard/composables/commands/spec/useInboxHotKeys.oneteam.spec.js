import { emitter } from 'shared/helpers/mitt';
import { CMD_SNOOZE_NOTIFICATION } from 'dashboard/helper/commandbar/events';
import { useInboxHotKeys } from '../useInboxHotKeys';

/*
 * OneTeam coverage for the inbox command bar snooze entries: choosing one
 * emits the snooze event with that option.
 */
vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: key => key }) }));
vi.mock('vue-router', () => ({
  useRoute: () => ({ name: 'inbox_view_conversation' }),
}));
vi.mock('shared/helpers/mitt', () => ({ emitter: { emit: vi.fn() } }));

describe('useInboxHotKeys (OneTeam)', () => {
  it('emits the chosen snooze option', () => {
    const { inboxHotKeys } = useInboxHotKeys();
    const options = inboxHotKeys.value.filter(action => action.handler);
    options.forEach(option => option.handler());
    expect(emitter.emit).toHaveBeenCalledTimes(options.length);
    expect(emitter.emit).toHaveBeenCalledWith(
      CMD_SNOOZE_NOTIFICATION,
      options[0].id
    );
  });
});
