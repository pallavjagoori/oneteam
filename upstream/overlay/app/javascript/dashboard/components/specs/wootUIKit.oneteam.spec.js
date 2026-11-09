/**
 * OneTeam spec for the deprecated Woot UI kit plugin.
 *
 * Covers registering every kit component with a woot prefix, and the
 * automatic install when a global Vue is present.
 */
describe('Woot UI kit', () => {
  afterEach(() => {
    delete window.Vue;
    vi.resetModules();
  });

  it('registers every component with a woot prefix', async () => {
    const { default: WootUIKit } = await import('../index');
    const component = vi.fn();
    WootUIKit.install({ component });
    const names = component.mock.calls.map(([name]) => name);
    expect(names).toHaveLength(18);
    expect(names).toContain('wootModal');
    expect(names).toContain('wootDatePicker');
    expect(names).not.toContain('wootinstall');
  });

  it('installs itself on a global Vue', async () => {
    window.Vue = { use: vi.fn() };
    vi.resetModules();
    const { default: WootUIKit } = await import('../index');
    expect(window.Vue.use).toHaveBeenCalledWith(WootUIKit);
  });
});
