/**
 * OneTeam spec for the CSAT survey entrypoint.
 */
import { vi } from 'vitest';

vi.mock('../../survey/App.vue', () => ({
  default: { name: 'App', render: () => null },
}));

describe('survey entrypoint', () => {
  it('mounts the survey app on window load', async () => {
    document.body.innerHTML = '<div id="app"></div>';
    await import('../survey');
    window.onload();
    expect(window.WOOT_SURVEY).toBeDefined();
    delete window.WOOT_SURVEY;
  });
});
