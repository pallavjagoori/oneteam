/**
 * OneTeam behaviour spec for the WhatsApp message templates settings page.
 *
 * The page lives inside <KeepAlive> in the app, so it is mounted the same
 * way here: activation fetches templates and deactivation aborts them.
 * Covers fetching and grouping, partial failures, filter menus, search,
 * preview and template sync.
 */
import { defineComponent, h, KeepAlive, ref } from 'vue';
import { mount, flushPromises } from '@vue/test-utils';
import TemplatesIndex from '../Index.vue';
import TemplateCard from '../TemplateCard.vue';
import DropdownMenu from 'dashboard/components-next/dropdown-menu/DropdownMenu.vue';

const env = vi.hoisted(() => ({
  inboxes: [],
  templates: {},
  outside: null,
  open: null,
}));

vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key, args) => (args ? `${key}:${JSON.stringify(args)}` : key),
  }),
}));
vi.mock('dashboard/composables', () => ({ useAlert: vi.fn() }));
vi.mock('dashboard/composables/store', async () => {
  const { computed } = await import('vue');
  return {
    useMapGetter: () => computed(() => env.inboxesRef.value),
    useStore: () => env.store,
  };
});
vi.mock('dashboard/api/inboxes', () => ({
  default: {
    getMessageTemplates: vi.fn(async id => {
      const response = env.templates[id];
      if (response instanceof Error) throw response;
      return typeof response === 'function' ? response() : response;
    }),
  },
}));
vi.mock('@vueuse/components', () => ({
  vOnClickOutside: {
    mounted: (el, binding) => {
      env.outside = binding.value;
    },
  },
}));

const { useAlert } = await import('dashboard/composables');
const { default: InboxesAPI } = await import('dashboard/api/inboxes');

const cloud = {
  id: 1,
  name: 'Cloud',
  channel_type: 'Channel::Whatsapp',
  provider_config: { business_account_id: 'waba' },
};
const twilio = {
  id: 2,
  name: 'Twilio',
  channel_type: 'Channel::TwilioSms',
  medium: 'whatsapp',
  account_sid: 'AC1',
};
const otherInboxes = [
  { id: 3, name: 'Web', channel_type: 'Channel::WebWidget' },
  { id: 4, name: 'SMS', channel_type: 'Channel::TwilioSms', medium: 'sms' },
];

const welcome = {
  id: 'w1',
  name: 'welcome_offer',
  language: 'en',
  status: 'APPROVED',
  category: 'MARKETING',
  components: [{ type: 'BODY', text: 'Hello there' }],
};
const promo = {
  id: 'w2',
  name: 'promo_banner',
  language: 'fr',
  status: 'APPROVED',
  category: 'MARKETING',
  components: [
    { type: 'HEADER', format: 'IMAGE' },
    { type: 'BODY', text: 'Bonjour' },
  ],
};
const reminder = {
  content_sid: 'HX1',
  friendly_name: 'payment_reminder',
  language: 'en',
  status: 'approved',
  types: { 'twilio/text': { body: 'Your bill is due' } },
};

const payload = (records, lastSync) => ({
  data: {
    payload: records,
    meta: lastSync ? { last_sync_attempt_at: lastSync } : undefined,
  },
});

const Button = {
  name: 'Button',
  props: ['label', 'icon', 'isLoading', 'disabled'],
  emits: ['click'],
  template: '<button><slot /></button>',
};
const Header = {
  name: 'BaseSettingsHeader',
  props: ['searchQuery', 'searchPlaceholder'],
  emits: ['update:searchQuery'],
  template:
    '<header><div class="meta"><slot name="meta" /></div><slot name="tabs" /><div class="count"><slot name="count" /></div><slot name="actions" /></header>',
};
const Drawer = {
  name: 'TemplatePreviewDrawer',
  props: ['template'],
  methods: {
    open() {
      env.open();
    },
  },
  template: '<aside />',
};

let show;
const mountPage = async () => {
  show = ref(true);
  const Other = defineComponent({ render: () => h('div') });
  const Host = defineComponent({
    setup: () => () =>
      h(KeepAlive, null, [show.value ? h(TemplatesIndex) : h(Other)]),
  });
  const wrapper = mount(Host, {
    global: {
      mocks: {
        $t: (key, args) => (args ? `${key}:${JSON.stringify(args)}` : key),
      },
      stubs: {
        SettingsLayout: {
          props: ['isLoading', 'noRecordsFound'],
          template:
            '<div :data-loading="isLoading"><slot name="header" /><slot name="body" /><slot /></div>',
        },
        BaseSettingsHeader: Header,
        Button,
        DropdownMenu: true,
        TemplateCard: true,
        TemplatePreviewDrawer: Drawer,
        Icon: true,
      },
    },
  });
  await flushPromises();
  return wrapper;
};

const header = wrapper => wrapper.findComponent(Header);
const cards = wrapper => wrapper.findAllComponents(TemplateCard);
const filterButtons = wrapper =>
  wrapper
    .findAllComponents(Button)
    .filter(b => b.props('icon') !== 'i-lucide-refresh-cw');
const syncButton = wrapper =>
  wrapper
    .findAllComponents(Button)
    .find(b => b.props('icon') === 'i-lucide-refresh-cw');
const pickFilter = async (wrapper, index, value) => {
  await filterButtons(wrapper)[index].vm.$emit('click');
  const menu = wrapper.findComponent(DropdownMenu);
  const item = menu.props('menuItems').find(i => i.value === value);
  await menu.vm.$emit('action', item);
};
const search = async (wrapper, query) => {
  await header(wrapper).vm.$emit('update:searchQuery', query);
};

// env.inboxes is a reactive getter over a ref so tests can swap the list.
beforeEach(() => {
  env.inboxesRef = ref([]);
  Object.defineProperty(env, 'inboxes', {
    configurable: true,
    get: () => env.inboxesRef.value,
    set: value => {
      env.inboxesRef.value = value;
    },
  });
  env.inboxes = [cloud, twilio, ...otherInboxes];
  env.templates = {
    1: payload([welcome, promo], '2024-05-01T10:00:00Z'),
    2: payload([reminder], '2024-05-02T10:00:00Z'),
  };
  env.store = {
    dispatch: vi.fn(async action => {
      if (action === 'inboxes/get') return env.didFetchInboxes ?? true;
      if (action === 'inboxes/syncTemplates') return env.sync?.();
      return undefined;
    }),
  };
  env.didFetchInboxes = true;
  env.sync = undefined;
  env.open = vi.fn();
  env.outside = null;
  vi.clearAllMocks();
});

describe('Templates fetching', () => {
  it('loads templates from every WhatsApp inbox', async () => {
    const wrapper = await mountPage();
    expect(InboxesAPI.getMessageTemplates.mock.calls.map(c => c[0])).toEqual([
      1, 2,
    ]);
    expect(cards(wrapper)).toHaveLength(3);
    expect(wrapper.find('.count').text()).toBe(
      'WHATSAPP_TEMPLATE_MGMT.COUNT:{"n":3}'
    );
    expect(wrapper.find('.meta').text()).toContain(
      'WHATSAPP_TEMPLATE_MGMT.LAST_SYNC_ATTEMPT'
    );
    expect(header(wrapper).props('searchPlaceholder')).toBe(
      'WHATSAPP_TEMPLATE_MGMT.SEARCH_PLACEHOLDER'
    );
    expect(syncButton(wrapper).props('disabled')).toBe(false);
    expect(useAlert).not.toHaveBeenCalled();
  });

  it('hides the sync time when no inbox reports a valid one', async () => {
    env.templates[1] = payload([welcome]);
    env.templates[2] = payload([reminder], 'not a date');
    const wrapper = await mountPage();
    expect(wrapper.find('.meta').text()).toBe('');
  });

  it('reports a failed inbox list', async () => {
    env.didFetchInboxes = false;
    const wrapper = await mountPage();
    expect(useAlert).toHaveBeenCalledWith('WHATSAPP_TEMPLATE_MGMT.FETCH_ERROR');
    expect(cards(wrapper)).toHaveLength(0);
  });

  it('reports a partial failure and keeps what loaded', async () => {
    env.templates[2] = new Error('down');
    const wrapper = await mountPage();
    expect(useAlert).toHaveBeenCalledWith(
      'WHATSAPP_TEMPLATE_MGMT.PARTIAL_FETCH_ERROR'
    );
    expect(cards(wrapper)).toHaveLength(2);
  });

  it('reports a total failure, including malformed payloads', async () => {
    env.templates[1] = { data: { payload: null } };
    env.templates[2] = new Error('down');
    const wrapper = await mountPage();
    expect(useAlert).toHaveBeenCalledWith('WHATSAPP_TEMPLATE_MGMT.FETCH_ERROR');
    expect(wrapper.find('.flex.items-center.justify-center').text()).toBe(
      'WHATSAPP_TEMPLATE_MGMT.NO_RESULTS'
    );
    expect(header(wrapper).props('searchPlaceholder')).toBe('');
  });

  it('refetches on reactivation, dropping removed inboxes and stale filters', async () => {
    const wrapper = await mountPage();
    await pickFilter(wrapper, 0, '2');
    await pickFilter(wrapper, 1, 'en');
    await pickFilter(wrapper, 2, 'TEXT');
    expect(cards(wrapper)).toHaveLength(1);

    show.value = false;
    await flushPromises();
    env.inboxes = [cloud];
    env.templates[1] = payload([promo]);
    show.value = true;
    await flushPromises();

    expect(cards(wrapper)).toHaveLength(1);
    const labels = filterButtons(wrapper).map(b => b.text());
    expect(labels).toEqual([
      'WHATSAPP_TEMPLATE_MGMT.FILTERS.ALL_INBOXES',
      'WHATSAPP_TEMPLATE_MGMT.FILTERS.ALL_LANGUAGES',
      'WHATSAPP_TEMPLATE_MGMT.FILTERS.ALL_TYPES',
    ]);
    // The removed inbox's sync time is gone with it.
    expect(wrapper.find('.meta').text()).toBe('');
  });

  it('keeps still-valid filters after a refetch', async () => {
    const wrapper = await mountPage();
    await pickFilter(wrapper, 0, '1');
    show.value = false;
    await flushPromises();
    show.value = true;
    await flushPromises();
    expect(filterButtons(wrapper)[0].text()).toBe('Cloud');
  });

  it('stops quietly when deactivated while inboxes load', async () => {
    let finish;
    env.store.dispatch = vi.fn(
      () =>
        new Promise(resolve => {
          finish = resolve;
        })
    );
    const wrapper = await mountPage();
    show.value = false;
    await flushPromises();
    finish(true);
    await flushPromises();
    expect(InboxesAPI.getMessageTemplates).not.toHaveBeenCalled();
    expect(wrapper.find('[data-loading]').exists()).toBe(false);
    expect(useAlert).not.toHaveBeenCalled();
  });

  it('drops template responses that arrive after deactivation', async () => {
    let finish;
    env.templates[1] = () =>
      new Promise(resolve => {
        finish = resolve;
      });
    const wrapper = await mountPage();
    show.value = false;
    await flushPromises();
    finish(payload([welcome]));
    await flushPromises();
    show.value = true;
    env.templates[1] = payload([]);
    env.templates[2] = payload([]);
    await flushPromises();
    expect(cards(wrapper)).toHaveLength(0);
  });
});

describe('Templates filters and search', () => {
  it('lists filter options and narrows by each filter', async () => {
    const wrapper = await mountPage();
    await filterButtons(wrapper)[0].vm.$emit('click');
    const items = wrapper.findComponent(DropdownMenu).props('menuItems');
    expect(items.map(i => i.label)).toEqual([
      'WHATSAPP_TEMPLATE_MGMT.FILTERS.ALL_INBOXES',
      'Cloud',
      'Twilio',
    ]);
    expect(items[0].isSelected).toBe(true);
    // Clicking the same button again closes it.
    await filterButtons(wrapper)[0].vm.$emit('click');
    expect(wrapper.findComponent(DropdownMenu).exists()).toBe(false);

    await pickFilter(wrapper, 0, '1');
    expect(cards(wrapper)).toHaveLength(2);
    expect(wrapper.findComponent(DropdownMenu).exists()).toBe(false);
    await pickFilter(wrapper, 1, 'fr');
    expect(cards(wrapper)).toHaveLength(1);
    expect(filterButtons(wrapper)[1].text()).not.toBe('fr');
    await pickFilter(wrapper, 0, 'all');
    await pickFilter(wrapper, 1, 'all');

    await filterButtons(wrapper)[2].vm.$emit('click');
    const types = wrapper.findComponent(DropdownMenu).props('menuItems');
    expect(types.length).toBeGreaterThan(2);
    await wrapper.findComponent(DropdownMenu).vm.$emit('action', types[1]);
    expect(cards(wrapper).length).toBeLessThan(3);
  });

  it('closes the open menu on an outside click', async () => {
    const wrapper = await mountPage();
    await filterButtons(wrapper)[1].vm.$emit('click');
    env.outside();
    await wrapper.vm.$nextTick();
    expect(wrapper.findComponent(DropdownMenu).exists()).toBe(false);
  });

  it('searches names and content, then falls back to fuzzy search', async () => {
    const wrapper = await mountPage();
    await search(wrapper, 'WELCOME');
    expect(cards(wrapper).map(c => c.props('template').name)).toEqual([
      'welcome_offer',
    ]);
    await search(wrapper, 'bonjour');
    expect(cards(wrapper).map(c => c.props('template').name)).toEqual([
      'promo_banner',
    ]);
    await search(wrapper, 'promo banner');
    expect(cards(wrapper).map(c => c.props('template').name)).toEqual([
      'promo_banner',
    ]);
    await search(wrapper, 'zzzzqqq');
    expect(cards(wrapper)).toHaveLength(0);
    expect(header(wrapper).props('searchPlaceholder')).toBe(
      'WHATSAPP_TEMPLATE_MGMT.SEARCH_PLACEHOLDER'
    );
    await search(wrapper, '   ');
    expect(cards(wrapper)).toHaveLength(3);
  });

  it('opens the preview drawer for a template', async () => {
    const wrapper = await mountPage();
    await cards(wrapper)[0].vm.$emit('preview');
    expect(env.open).toHaveBeenCalled();
    expect(wrapper.findComponent(Drawer).props('template')).toEqual(
      cards(wrapper)[0].props('template')
    );
  });
});

describe('Templates sync', () => {
  it.each([
    [[true, true], 'WHATSAPP_TEMPLATE_MGMT.SYNC_SUCCESS'],
    [[true, false], 'WHATSAPP_TEMPLATE_MGMT.PARTIAL_SYNC_ERROR'],
    [[false, false], 'WHATSAPP_TEMPLATE_MGMT.SYNC_ERROR'],
  ])('syncs every WhatsApp inbox (%o)', async (results, message) => {
    const queue = [...results];
    env.sync = () =>
      queue.shift() ? Promise.resolve() : Promise.reject(new Error('x'));
    const wrapper = await mountPage();
    await syncButton(wrapper).vm.$emit('click');
    await flushPromises();
    expect(
      env.store.dispatch.mock.calls.filter(
        c => c[0] === 'inboxes/syncTemplates'
      )
    ).toEqual([
      ['inboxes/syncTemplates', 1],
      ['inboxes/syncTemplates', 2],
    ]);
    expect(useAlert).toHaveBeenCalledWith(message);
    expect(syncButton(wrapper).props('isLoading')).toBe(false);
  });

  it('ignores clicks while a sync is running', async () => {
    let finish;
    env.sync = () =>
      new Promise(resolve => {
        finish = resolve;
      });
    env.inboxes = [cloud];
    const wrapper = await mountPage();
    syncButton(wrapper).vm.$emit('click');
    syncButton(wrapper).vm.$emit('click');
    await wrapper.vm.$nextTick();
    expect(syncButton(wrapper).props('disabled')).toBe(true);
    finish();
    await flushPromises();
    expect(
      env.store.dispatch.mock.calls.filter(
        c => c[0] === 'inboxes/syncTemplates'
      )
    ).toHaveLength(1);
  });

  it('disables sync without WhatsApp inboxes', async () => {
    env.inboxes = otherInboxes;
    const wrapper = await mountPage();
    expect(syncButton(wrapper).props('disabled')).toBe(true);
    expect(filterButtons(wrapper)).toHaveLength(0);
  });
});
