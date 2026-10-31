/**
 * OneTeam spec for the help center portal entrypoint: it starts Rails UJS
 * and Turbo, and runs the portal setup on every Turbo page load.
 */
import { vi } from 'vitest';

vi.mock('@rails/ujs', () => ({ default: { start: vi.fn() } }));
vi.mock('@hotwired/turbo-rails', () => ({ Turbo: { start: vi.fn() } }));
vi.mock('../../portal/application.scss', () => ({}));
vi.mock('../../portal/portalHelpers', () => ({
  InitializationHelpers: { onLoad: vi.fn() },
}));

describe('portal entrypoint', () => {
  it('starts Rails UJS and Turbo and sets up each page on load', async () => {
    const Rails = (await import('@rails/ujs')).default;
    const { Turbo } = await import('@hotwired/turbo-rails');
    const { InitializationHelpers } = await import(
      '../../portal/portalHelpers'
    );
    await import('../portal');
    expect(Rails.start).toHaveBeenCalled();
    expect(Turbo.start).toHaveBeenCalled();
    document.dispatchEvent(new Event('turbo:load'));
    expect(InitializationHelpers.onLoad).toHaveBeenCalled();
  });
});
