/**
 * OneTeam behaviour spec for the WhatsApp campaign analytics page body.
 *
 * Covers loading, the metric cards with rates, the breakdown and delivery
 * table, the inbox line, empty states (error, still processing,
 * unavailable), status tabs and pagination, switching campaigns, ignoring
 * stale responses, polling while a campaign is processing (and stopping on
 * deactivate or unmount), refreshing once it completes, and the
 * breadcrumb.
 */
import { computed, defineComponent, h, KeepAlive, reactive, ref } from 'vue';
import { mount, flushPromises } from '@vue/test-utils';
import CampaignsAPI from 'dashboard/api/campaigns';
import Content from '../WhatsAppCampaignAnalyticsContent.vue';

const env = vi.hoisted(() => ({
  state: null,
  route: null,
  push: null,
  dispatch: null,
}));

vi.mock('vue-router', () => ({
  useRoute: () => env.route,
  useRouter: () => ({ push: env.push }),
}));
vi.mock('dashboard/composables/store', () => ({
  useMapGetter: name => computed(() => env.state[name]),
  useStore: () => ({ dispatch: (...args) => env.dispatch(...args) }),
}));
vi.mock('dashboard/api/campaigns', () => ({
  default: { analyticsMetrics: vi.fn(), analyticsContacts: vi.fn() },
}));
vi.mock('shared/helpers/timeHelper', () => ({
  messageStamp: value => `stamp ${value}`,
}));

const named = (name, props = [], emits = []) => ({
  name,
  props,
  emits,
  template: `<div class="${name}"><slot name="filters" /><slot name="footer" /><slot /></div>`,
});
const stubs = {
  CampaignAnalyticsLayout: named(
    'CampaignAnalyticsLayout',
    ['breadcrumbItems'],
    ['breadcrumbClick']
  ),
  Banner: named('Banner'),
  Icon: { props: ['icon'], template: '<i :class="icon" />' },
  CampaignMetricCard: named('CampaignMetricCard', ['label', 'value', 'rate']),
  CampaignDeliveryBreakdown: named('CampaignDeliveryBreakdown', ['metrics']),
  CampaignDeliveryTable: named('CampaignDeliveryTable', [
    'deliveries',
    'loading',
    'noDataMessage',
  ]),
  TabBar: named('TabBar', ['tabs', 'initialActiveTab'], ['tabChanged']),
  PaginationFooter: named(
    'PaginationFooter',
    ['currentPage', 'totalItems'],
    ['update:currentPage']
  ),
};

const metrics = {
  audience: 200,
  sent: 50,
  delivered: 100,
  read: 30,
  failed: 10,
  skipped: 10,
  status_counts: { sent: 50, delivered: 100 },
};
const contacts = (count = 2, total = 2) => ({
  data: {
    payload: Array.from({ length: count }, (_, i) => ({ id: i })),
    meta: { total_count: total },
  },
});
const campaign = (status = 'completed', extra = {}) => ({
  id: 5,
  title: 'Black Friday',
  campaign_status: status,
  scheduled_at: 1700,
  inbox: { name: 'WhatsApp Sales', channel_type: 'Channel::Whatsapp' },
  ...extra,
});

const mountPage = async () => {
  const visible = ref(true);
  const Host = defineComponent({
    setup: () => () => h(KeepAlive, null, [visible.value ? h(Content) : null]),
  });
  const wrapper = mount(Host, { global: { stubs } });
  await flushPromises();
  return { wrapper, visible };
};
const find = (wrapper, name) => wrapper.findComponent({ name });
const table = wrapper => find(wrapper, 'CampaignDeliveryTable');
const lastContactsCall = () => CampaignsAPI.analyticsContacts.mock.calls.at(-1);

describe('WhatsApp campaign analytics behaviour', () => {
  beforeEach(() => {
    env.route = reactive({ params: { campaignId: '5' } });
    env.push = vi.fn();
    env.dispatch = vi.fn();
    env.state = reactive({ 'campaigns/getAllCampaigns': [campaign()] });
    CampaignsAPI.analyticsMetrics.mockResolvedValue({ data: metrics });
    CampaignsAPI.analyticsContacts.mockResolvedValue(contacts());
  });
  afterEach(() => vi.useRealTimers());

  it('shows metrics, the breakdown and deliveries', async () => {
    let finish;
    CampaignsAPI.analyticsMetrics.mockImplementationOnce(
      () =>
        new Promise(resolve => {
          finish = resolve;
        })
    );
    const { wrapper } = await mountPage();
    expect(wrapper.find('[role="status"]').exists()).toBe(true);
    finish({ data: metrics });
    await flushPromises();
    expect(CampaignsAPI.analyticsMetrics).toHaveBeenCalledWith(5);
    expect(lastContactsCall()).toEqual([5, { status: undefined, page: 1 }]);
    const cards = wrapper.findAllComponents({ name: 'CampaignMetricCard' });
    expect(cards.map(c => c.props('value'))).toEqual([
      200, 50, 100, 30, 10, 10,
    ]);
    expect(cards[0].props('rate')).toBe('');
    expect(cards[2].props('rate')).toBe('CAMPAIGN.WHATSAPP.ANALYTICS.RATE');
    expect(find(wrapper, 'CampaignDeliveryBreakdown').props('metrics')).toEqual(
      metrics
    );
    expect(table(wrapper).props('deliveries')).toHaveLength(2);
    expect(table(wrapper).props('noDataMessage')).toBe(
      'CAMPAIGN.WHATSAPP.ANALYTICS.EMPTY'
    );
    expect(
      find(wrapper, 'TabBar')
        .props('tabs')
        .map(tab => tab.count)
    ).toEqual([200, 50, 100, 0, 0, 0]);
    expect(wrapper.text()).toContain('WhatsApp Sales');
    expect(wrapper.text()).toContain('CAMPAIGN.WHATSAPP.ANALYTICS.SENT_ON');
    expect(find(wrapper, 'Banner').exists()).toBe(false);
    expect(find(wrapper, 'PaginationFooter').exists()).toBe(false);
    expect(
      find(wrapper, 'CampaignAnalyticsLayout').props('breadcrumbItems')[2]
    ).toEqual({ label: 'Black Friday' });
  });

  it('shows the error, pending and unavailable empty states', async () => {
    CampaignsAPI.analyticsMetrics.mockRejectedValueOnce(new Error('x'));
    let { wrapper } = await mountPage();
    expect(wrapper.find('h3').text()).toBe(
      'CAMPAIGN.WHATSAPP.ANALYTICS.EMPTY_STATE.ERROR.TITLE'
    );
    expect(table(wrapper).exists()).toBe(false);
    wrapper.unmount();

    env.state['campaigns/getAllCampaigns'] = [campaign('processing')];
    CampaignsAPI.analyticsMetrics.mockResolvedValueOnce({
      data: { audience: 0 },
    });
    ({ wrapper } = await mountPage());
    expect(wrapper.find('h3').text()).toBe(
      'CAMPAIGN.WHATSAPP.ANALYTICS.EMPTY_STATE.PENDING.TITLE'
    );
    expect(find(wrapper, 'Banner').exists()).toBe(true);
    wrapper.unmount();

    env.state['campaigns/getAllCampaigns'] = [];
    CampaignsAPI.analyticsMetrics.mockResolvedValueOnce({ data: null });
    ({ wrapper } = await mountPage());
    expect(wrapper.find('h3').text()).toBe(
      'CAMPAIGN.WHATSAPP.ANALYTICS.EMPTY_STATE.UNAVAILABLE.TITLE'
    );
    expect(
      find(wrapper, 'CampaignAnalyticsLayout').props('breadcrumbItems')[2]
    ).toEqual({ label: '#5' });
    expect(wrapper.text()).not.toContain('SENT_ON');
  });

  it('filters by status, pages and reports delivery errors', async () => {
    CampaignsAPI.analyticsContacts.mockResolvedValue(contacts(25, 60));
    const { wrapper } = await mountPage();
    const tabs = find(wrapper, 'TabBar');
    await tabs.vm.$emit('tabChanged', { key: 'all' });
    expect(CampaignsAPI.analyticsContacts).toHaveBeenCalledTimes(1);
    await find(wrapper, 'PaginationFooter').vm.$emit('update:currentPage', 2);
    await flushPromises();
    expect(lastContactsCall()).toEqual([5, { status: undefined, page: 2 }]);
    CampaignsAPI.analyticsContacts.mockResolvedValueOnce(contacts(0, 0));
    await tabs.vm.$emit('tabChanged', { key: 'failed' });
    await flushPromises();
    expect(lastContactsCall()).toEqual([5, { status: 'failed', page: 1 }]);
    expect(find(wrapper, 'TabBar').props('initialActiveTab')).toBe(4);
    expect(table(wrapper).props('noDataMessage')).toBe(
      'CAMPAIGN.WHATSAPP.ANALYTICS.EMPTY_FILTER'
    );
    CampaignsAPI.analyticsContacts.mockRejectedValueOnce(new Error('x'));
    await find(wrapper, 'TabBar').vm.$emit('tabChanged', { key: 'read' });
    await flushPromises();
    expect(table(wrapper).props('noDataMessage')).toBe(
      'CAMPAIGN.WHATSAPP.ANALYTICS.DELIVERIES_ERROR'
    );
    expect(table(wrapper).props('deliveries')).toEqual([]);
  });

  it('resets filters when the campaign changes', async () => {
    const { wrapper } = await mountPage();
    await find(wrapper, 'TabBar').vm.$emit('tabChanged', { key: 'sent' });
    await flushPromises();
    const calls = CampaignsAPI.analyticsContacts.mock.calls.length;
    env.state['campaigns/getAllCampaigns'] = [
      campaign(),
      campaign('completed', { id: 6, title: 'Cyber Monday' }),
    ];
    env.route.params.campaignId = '6';
    await flushPromises();
    expect(CampaignsAPI.analyticsMetrics).toHaveBeenLastCalledWith(6);
    expect(CampaignsAPI.analyticsContacts.mock.calls.length).toBe(calls + 1);
    expect(lastContactsCall()).toEqual([6, { status: undefined, page: 1 }]);
    env.route.params.campaignId = 'not-a-number';
    await flushPromises();
    expect(CampaignsAPI.analyticsMetrics).toHaveBeenCalledTimes(2);
  });

  it('ignores responses for an older campaign', async () => {
    const pending = [];
    CampaignsAPI.analyticsMetrics.mockImplementation(
      id =>
        new Promise((resolve, reject) => {
          pending.push({ id, resolve, reject, kind: 'metrics' });
        })
    );
    CampaignsAPI.analyticsContacts.mockImplementation(
      id =>
        new Promise((resolve, reject) => {
          pending.push({ id, resolve, reject, kind: 'contacts' });
        })
    );
    const { wrapper } = await mountPage();
    env.route.params.campaignId = '6';
    await flushPromises();
    const old = pending.filter(p => p.id === 5);
    old.find(p => p.kind === 'metrics').resolve({ data: { audience: 999 } });
    old.find(p => p.kind === 'contacts').reject(new Error('late'));
    await flushPromises();
    expect(wrapper.find('[role="status"]').exists()).toBe(true);
    const current = pending.filter(p => p.id === 6);
    current.find(p => p.kind === 'metrics').reject(new Error('x'));
    current.find(p => p.kind === 'contacts').resolve(contacts());
    await flushPromises();
    expect(wrapper.find('h3').text()).toBe(
      'CAMPAIGN.WHATSAPP.ANALYTICS.EMPTY_STATE.ERROR.TITLE'
    );

    env.route.params.campaignId = '7';
    await flushPromises();
    pending.filter(p => p.id === 6).forEach(p => p.resolve(contacts()));
    pending
      .filter(p => p.id === 6 && p.kind === 'metrics')
      .forEach(p => p.reject(new Error('late')));
    pending.filter(p => p.id === 5).forEach(p => p.reject(new Error('late')));
    await flushPromises();
    expect(wrapper.find('[role="status"]').exists()).toBe(true);
  });

  it('polls while processing and refreshes when the campaign completes', async () => {
    vi.useFakeTimers();
    env.state['campaigns/getAllCampaigns'] = [campaign('processing')];
    const { wrapper, visible } = await mountPage();
    expect(CampaignsAPI.analyticsMetrics).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(5000);
    expect(CampaignsAPI.analyticsMetrics).toHaveBeenCalledTimes(2);
    expect(env.dispatch).toHaveBeenCalledWith('campaigns/get');
    expect(wrapper.find('[role="status"]').exists()).toBe(false);

    visible.value = false;
    await flushPromises();
    await vi.advanceTimersByTimeAsync(10000);
    expect(CampaignsAPI.analyticsMetrics).toHaveBeenCalledTimes(2);
    visible.value = true;
    await flushPromises();

    env.state['campaigns/getAllCampaigns'] = [campaign('completed')];
    await flushPromises();
    expect(CampaignsAPI.analyticsMetrics).toHaveBeenCalledTimes(3);
    await vi.advanceTimersByTimeAsync(10000);
    expect(CampaignsAPI.analyticsMetrics).toHaveBeenCalledTimes(3);

    env.state['campaigns/getAllCampaigns'] = [campaign('processing')];
    await flushPromises();
    env.state['campaigns/getAllCampaigns'] = [campaign('paused')];
    await flushPromises();
    expect(CampaignsAPI.analyticsMetrics).toHaveBeenCalledTimes(3);
    wrapper.unmount();
  });

  it('goes back to the campaign list from the breadcrumb', async () => {
    const { wrapper } = await mountPage();
    await find(wrapper, 'CampaignAnalyticsLayout').vm.$emit('breadcrumbClick');
    expect(env.push).toHaveBeenCalledWith({ name: 'campaigns_whatsapp_index' });
  });
});
