/**
 * OneTeam spec for the super admin Vue pages entrypoint: on DOMContentLoaded
 * it mounts the component named by #app's data attributes with its props.
 */
import { vi } from 'vitest';

const rendered = vi.hoisted(() => ({ props: null }));

vi.mock('../../superadmin_pages/views/dashboard/Index.vue', () => ({
  default: {
    name: 'DashboardIndex',
    props: ['componentData'],
    render() {
      rendered.props = this.componentData;
      return null;
    },
  },
}));

describe('super admin pages entrypoint', () => {
  beforeAll(async () => {
    await import('../superadmin_pages');
  });

  it('does nothing on a page without #app', () => {
    document.body.innerHTML = '';
    document.dispatchEvent(new Event('DOMContentLoaded'));
    expect(rendered.props).toBeNull();
  });

  it('mounts the named component with the page props', () => {
    document.body.innerHTML = `<div id="app" data-component-name="DashboardIndex" data-props='{"accountsCount":3}'></div>`;
    document.dispatchEvent(new Event('DOMContentLoaded'));
    expect(rendered.props).toEqual({ accountsCount: 3 });
  });
});
