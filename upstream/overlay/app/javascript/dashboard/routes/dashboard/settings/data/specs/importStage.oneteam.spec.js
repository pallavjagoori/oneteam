/**
 * OneTeam spec for the data import status helpers: which stage an import is
 * in and how a source record is labelled.
 */
import { importStageKey, sourceObjectLabel } from '../importStatus';

describe('importStageKey', () => {
  it('reports finished, failed and queued imports by status', () => {
    expect(importStageKey({ status: 'completed_with_errors' })).toBe(
      'completed_with_errors'
    );
  });

  it('walks contacts, then conversations, then finalizing', () => {
    const running = (cursor, extra = {}) =>
      importStageKey({
        status: 'running',
        import_types: ['contacts', 'conversations'],
        cursor,
        ...extra,
      });
    expect(running(undefined)).toBe('contacts');
    expect(running({ contacts: { completed: true } })).toBe('conversations');
    expect(
      running({
        contacts: { completed: true },
        conversations: { completed: true },
      })
    ).toBe('finalizing');
    expect(
      importStageKey({
        status: 'running',
        import_types: [],
        data_type: 'conversations',
      })
    ).toBe('conversations');
  });
});

describe('sourceObjectLabel', () => {
  it('joins the source type and id, or shows a dash', () => {
    expect(
      sourceObjectLabel({ source_object_type: 'ticket', source_object_id: 42 })
    ).toBe('ticket: 42');
    expect(sourceObjectLabel({ source_object_type: 'ticket' })).toBe('ticket');
    expect(sourceObjectLabel({})).toBe('-');
  });
});
