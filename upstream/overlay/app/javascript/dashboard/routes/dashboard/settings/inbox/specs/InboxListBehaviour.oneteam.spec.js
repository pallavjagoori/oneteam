/**
 * OneTeam behaviour spec for the inboxes settings list.
 *
 * Covers fetching inboxes when the cached page is shown, sorting by name,
 * channel identifiers, avatar vs channel icon, the count, admin-only
 * actions, searching (matches and no results), the empty state, and the
 * delete confirmation flow (texts, success, failure, closing).
 */
import { KeepAlive, computed, h } from 'vue';
import { flushPromises, mount } from '@vue/test-utils';
import { useAlert } from 'dashboard/composables';
import InboxList from '../Index.vue';

const env = vi.hoisted(() => ({}));

vi.mock('dashboard/composables', () => ({ useAlert: vi.fn() }));
vi.mock('dashboard/composables/useAdmin', () => ({
  useAdmin: () => ({ isAdmin: computed(() => env.isAdmin) }),
}));
vi.mock('dashboard/composables/store', () => ({
  useMapGetter: () => computed(() => env.inboxes),
  useStoreGetters: () => ({
    'inboxes/getUIFlags': computed(() => ({ isFetching: env.fetching })),
  }),
  useStore: () => ({ dispatch: (...args) => env.dispatch(...args) }),
}));

const Layout = {
  name: 'SettingsLayout',
  props: { noRecordsFound: Boolean, isLoading: Boolean },
  template: '<div><slot name="header" /><slot name="body" /><slot /></div>',
};
const Header = {
  name: 'BaseSettingsHeader',
  props: ['searchQuery'],
  emits: ['update:searchQuery'],
  template: '<div class="header"><slot name="count" /><slot name="actions" /></div>',
};
const Button = {
  name: 'Button',
  props: ['label', 'icon'],
  emits: ['click'],
  template: '<button :data-icon="icon" @click="$emit(\'click\')">{{ label }}</button>',
};
const ConfirmModal = {
  name: 'WootConfirmDeleteModal',
  props: ['show', 'message', 'confirmText', 'rejectText', 'confirmValue', 'confirmPlaceHolderText'],
  emits: ['onConfirm', 'onClose', 'update:show'],
  template: '<div class="confirm" />',
};

const Host = {
  props: ['visible'],
  render() {
    return h(KeepAlive, null, [this.visible ? h(InboxList) : h('div')]);
  },
};

const mountList = async () => {
  const wrapper = mount(Host, {
    props: { visible: true },
    global: {
      directives: { tooltip: {} },
      stubs: {
        SettingsLayout: Layout,
        BaseSettingsHeader: Header,
        Button,
        'woot-confirm-delete-modal': ConfirmModal,
        ChannelName: { props: ['channelType'], template: '<span class="channel">{{ channelType }}</span>' },
        ChannelIcon: { template: '<i class="channel-icon" />' },
        Avatar: { props: ['src'], template: '<img class="inbox-avatar" />' },
        'router-link': { props: ['to'], template: '<a><slot /></a>' },
      },
    },
  });
  await flushPromises();
  return wrapper;
};
const rows = wrapper => wrapper.findAll('.divide-y > div');
const deleteButtons = wrapper => wrapper.findAll('[data-icon="i-woot-bin"]');

describe('Inbox list behaviour', () => {
  beforeEach(() => {
    env.isAdmin = true;
    env.fetching = false;
    env.dispatch = vi.fn();
    env.inboxes = [
      { id: 2, name: 'Website', channel_type: 'Channel::WebWidget', website_url: 'acme.com' },
      { id: 1, name: 'Api', channel_type: 'Channel::Api', avatar_url: 'https://cdn/a.png' },
      { id: 3, name: 'Mail', channel_type: 'Channel::Email', email: 'help@acme.com' },
    ];
  });

  it('fetches inboxes and lists them by name', async () => {
    const wrapper = await mountList();
    expect(env.dispatch).toHaveBeenCalledWith('inboxes/get');
    expect(rows(wrapper).map(r => r.find('span[title]').text())).toEqual(['Api', 'Mail', 'Website']);
    expect(wrapper.find('[data-test-id="channel-identifier"]').text()).toBe('help@acme.com');
    expect(rows(wrapper)[0].find('.inbox-avatar').exists()).toBe(true);
    expect(rows(wrapper)[1].find('.channel-icon').exists()).toBe(true);
    expect(wrapper.find('.header span').text()).toContain('INBOX_MGMT.COUNT');
    expect(wrapper.find('.header button').text()).toBe('SETTINGS.INBOXES.NEW_INBOX');
    expect(wrapper.findComponent(Layout).props()).toEqual({ noRecordsFound: false, isLoading: false });
  });

  it('hides admin actions from agents', async () => {
    env.isAdmin = false;
    const wrapper = await mountList();
    expect(wrapper.findAll('button')).toHaveLength(0);
  });

  it('shows the empty state while loading', async () => {
    env.inboxes = [];
    env.fetching = true;
    const wrapper = await mountList();
    expect(wrapper.findComponent(Layout).props()).toEqual({ noRecordsFound: true, isLoading: true });
    expect(wrapper.find('.header span').exists()).toBe(false);
  });

  it('searches by name or identifier', async () => {
    const wrapper = await mountList();
    await wrapper.findComponent(Header).vm.$emit('update:searchQuery', ' acme.com ');
    expect(rows(wrapper).map(r => r.find('span[title]').text())).toEqual(['Website', 'Mail']);
    await wrapper.findComponent(Header).vm.$emit('update:searchQuery', 'zzz');
    expect(wrapper.text()).toContain('INBOX_MGMT.NO_RESULTS');
    await wrapper.findComponent(Header).vm.$emit('update:searchQuery', '  ');
    expect(rows(wrapper)).toHaveLength(3);
  });

  it('deletes an inbox after confirmation', async () => {
    const wrapper = await mountList();
    await deleteButtons(wrapper)[1].trigger('click');
    const modal = wrapper.findComponent(ConfirmModal);
    expect(modal.props()).toMatchObject({
      confirmValue: 'Mail',
      message: 'INBOX_MGMT.DELETE.CONFIRM.MESSAGE Mail?',
      confirmText: 'INBOX_MGMT.DELETE.CONFIRM.YES Mail',
      rejectText: 'INBOX_MGMT.DELETE.CONFIRM.NO Mail',
    });
    expect(modal.props('confirmPlaceHolderText')).toContain('INBOX_MGMT.DELETE.CONFIRM.PLACE_HOLDER');
    await modal.vm.$emit('onConfirm');
    await flushPromises();
    expect(env.dispatch).toHaveBeenLastCalledWith('inboxes/delete', 3);
    expect(useAlert).toHaveBeenCalledWith('INBOX_MGMT.DELETE.API.SUCCESS_MESSAGE');
    expect(wrapper.findComponent(ConfirmModal).exists()).toBe(false);
  });

  it('reports delete failures and can be closed', async () => {
    env.dispatch.mockImplementation(action =>
      action === 'inboxes/delete' ? Promise.reject(new Error('x')) : undefined
    );
    const wrapper = await mountList();
    await deleteButtons(wrapper)[0].trigger('click');
    await wrapper.findComponent(ConfirmModal).vm.$emit('onConfirm');
    await flushPromises();
    expect(useAlert).toHaveBeenCalledWith('INBOX_MGMT.DELETE.API.ERROR_MESSAGE');
    await deleteButtons(wrapper)[0].trigger('click');
    await wrapper.findComponent(ConfirmModal).vm.$emit('onClose');
    expect(wrapper.findComponent(ConfirmModal).exists()).toBe(false);
  });

  it('refetches when the cached page is shown again', async () => {
    const wrapper = await mountList();
    await wrapper.setProps({ visible: false });
    await wrapper.setProps({ visible: true });
    expect(env.dispatch).toHaveBeenCalledTimes(2);
  });
});
