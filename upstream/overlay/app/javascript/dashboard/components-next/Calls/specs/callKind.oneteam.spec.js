/**
 * OneTeam spec for getCallKind: the calls list shows each call as one kind
 * made from its status and direction.
 */
import { getCallKind, CALL_KIND } from '../constants';

describe('getCallKind', () => {
  it.each([
    [{ status: 'ringing' }, CALL_KIND.ONGOING],
    [{ status: 'in-progress' }, CALL_KIND.ONGOING],
    [{ status: 'failed' }, CALL_KIND.FAILED],
    [{ status: 'rejected' }, CALL_KIND.FAILED],
    [{ status: 'no-answer', direction: 'inbound' }, CALL_KIND.MISSED],
    [{ status: 'no-answer', direction: 'outbound' }, CALL_KIND.NO_REPLY],
    [{ status: 'completed', direction: 'inbound' }, CALL_KIND.INCOMING],
    [{ status: 'completed', direction: 'outbound' }, CALL_KIND.OUTGOING],
  ])('reads %j as %s', (call, kind) => {
    expect(getCallKind(call)).toBe(kind);
  });
});
