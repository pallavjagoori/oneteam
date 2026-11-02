/**
 * OneTeam behaviour spec for the super admin dashboard.
 *
 * Covers loading the stats as JSON from the current page, the loading
 * placeholders, the four totals (accounts and users link to their
 * lists, missing totals show N/A), the daily conversations chart with
 * whole-number steps, the total, daily average and busiest day summary,
 * an installation with no conversations yet, and the error message when
 * the stats cannot be loaded.
 */
import { mount, flushPromises } from '@vue/test-utils';
import Dashboard from '../Index.vue';

const BarChart = {
  name: 'BarChart',
  props: [
    'data',
    'height',
    'maxBarWidth',
    'barRadius',
    'yStepSize',
    'ariaLabel',
  ],
  template: '<div class="chart" />',
};

const respond = (body, ok = true) =>
  vi
    .fn()
    .mockResolvedValue({ ok, status: ok ? 200 : 500, json: async () => body });

const mountDashboard = async (componentData = {}) => {
  const wrapper = mount(Dashboard, {
    props: { componentData },
    global: { stubs: { BarChart } },
  });
  await flushPromises();
  return wrapper;
};

const totals = wrapper =>
  wrapper.findAll('li').map(li => li.text().replace(/\s+/g, ' ').trim());
const summary = wrapper =>
  wrapper
    .findAll('dl > div')
    .map(d => [d.find('dt').text(), d.find('dd').text()]);

describe('Super admin dashboard behaviour', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('shows placeholders while the stats load', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => new Promise(() => {}))
    );
    const wrapper = await mountDashboard();
    expect(fetch).toHaveBeenCalledWith(window.location.pathname, {
      headers: { Accept: 'application/json' },
    });
    expect(wrapper.findAll('li .animate-pulse')).toHaveLength(4);
    expect(wrapper.find('section .animate-pulse').exists()).toBe(true);
    expect(wrapper.find('.chart').exists()).toBe(false);
    expect(summary(wrapper)).toEqual([]);
  });

  it('shows totals, the chart and its summary', async () => {
    vi.stubGlobal(
      'fetch',
      respond({
        accountsCount: 12,
        usersCount: 40,
        inboxesCount: 0,
        chartData: [
          ['2026-10-01', 5],
          ['2026-10-02', 10],
          ['2026-10-03', 3],
        ],
      })
    );
    const wrapper = await mountDashboard({
      accountsPath: '/super_admin/accounts',
      usersPath: '/super_admin/users',
    });
    expect(totals(wrapper)).toEqual([
      'Accounts12',
      'Users40',
      'InboxesN/A',
      'ConversationsN/A',
    ]);
    const links = wrapper.findAll('li a');
    expect(links.map(a => a.attributes('href'))).toEqual([
      '/super_admin/accounts',
      '/super_admin/users',
    ]);
    expect(links[0].classes()).toContain('hover:bg-n-solid-3');
    expect(wrapper.findAll('li > div')).toHaveLength(2);

    const chart = wrapper.findComponent(BarChart).props();
    expect(chart.data).toEqual({
      categories: ['1 Oct', '2 Oct', '3 Oct'],
      series: [
        {
          id: 'conversations',
          label: 'Conversations',
          color: '#2781F6',
          data: [5, 10, 3],
        },
      ],
    });
    expect(chart).toEqual(
      expect.objectContaining({
        height: 300,
        maxBarWidth: 28,
        barRadius: 6,
        yStepSize: 3,
        ariaLabel: 'Conversations created by day',
      })
    );
    expect(summary(wrapper)).toEqual([
      ['Total', '18'],
      ['Daily average', '6'],
      ['Busiest day', '2 Oct'],
    ]);
  });

  it('handles an installation without conversations yet', async () => {
    vi.stubGlobal('fetch', respond({ accountsCount: 1 }));
    const wrapper = await mountDashboard();
    const chart = wrapper.findComponent(BarChart).props();
    expect(chart.data.categories).toEqual([]);
    expect(chart.yStepSize).toBe(1);
    expect(summary(wrapper)).toEqual([]);
    expect(wrapper.findAll('li a')).toHaveLength(0);
  });

  it('explains when the stats cannot be loaded', async () => {
    vi.stubGlobal('fetch', respond({}, false));
    const failed = await mountDashboard();
    expect(failed.find('p.py-16').text()).toBe(
      'Could not load the dashboard stats. Reload the page to try again.'
    );
    expect(totals(failed)[0]).toBe('AccountsN/A');
    expect(failed.find('.chart').exists()).toBe(false);

    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    expect((await mountDashboard()).text()).toContain(
      'Could not load the dashboard stats.'
    );
  });
});
