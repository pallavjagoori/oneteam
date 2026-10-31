/**
 * OneTeam behaviour spec for the teams settings page.
 *
 * Covers the loading and empty states, the team count, admin-only
 * create, edit and delete actions, team icons (emoji or default),
 * searching by name and description (including no results), and the
 * delete confirmation (confirm with success or error, or close).
 */
import { computed, reactive } from 'vue';
import { flushPromises, mount } from '@vue/test-utils';
import { useAlert } from 'dashboard/composables';
import TeamsIndex from '../Index.vue';

const env = vi.hoisted(() => ({}));

vi.mock('dashboard/composables', () => ({ useAlert: vi.fn() }));
vi.mock('dashboard/composables/useAdmin', () => ({
  useAdmin: () => ({ isAdmin: computed(() => env.isAdmin) }),
}));
vi.mock('vue-i18n', async importOriginal => ({
  ...(await importOriginal()),
  useI18n: () => ({
    t: (key, params) => (params ? `${key}:${params.teamName}` : key),
  }),
}));
vi.mock('dashboard/composables/store', () => ({
  useStore: () => env.store,
  useMapGetter: name => computed(() => env.getters[name]),
  useStoreGetters: () =>
    new Proxy({}, { get: (_, name) => computed(() => env.getters[name]) }),
}));

const Layout = {
  name: 'SettingsLayout',
  props: ['isLoading', 'noRecordsFound'],
  template: '<div><slot name="header" /><slot name="body" /><slot /></div>',
};
const Header = {
  name: 'BaseSettingsHeader',
  props: ['searchQuery'],
  emits: ['update:searchQuery'],
  template: '<header><slot name="count" /><slot name="actions" /></header>',
};
const Link = {
  name: 'RouterLink',
  props: ['to'],
  template: '<a :data-to="to.name"><slot /></a>',
};
const Button = {
  name: 'Button',
  props: ['label', 'icon', 'isLoading'],
  emits: ['click'],
  template:
    '<button :data-icon="icon" @click="$emit(\'click\', $event)">{{ label }}</button>',
};
const EmojiIcon = {
  name: 'EmojiIcon',
  props: ['value', 'color'],
  template: '<i class="emoji" />',
};
const Icon = { name: 'Icon', props: ['icon'], template: '<i class="icon" />' };
const ConfirmModal = {
  name: 'WootConfirmDeleteModal',
  props: [
    'show',
    'title',
    'confirmText',
    'rejectText',
    'confirmValue',
    'confirmPlaceHolderText',
  ],
  emits: ['update:show', 'onConfirm', 'onClose'],
  template: '<div class="confirm" />',
};

const teams = [
  {
    id: 1,
    name: 'sales',
    description: 'Deals',
    icon: '💰',
    icon_color: 'gold',
  },
  { id: 2, name: 'support', description: 'Help desk' },
];

const mountPage = async ({
  records = teams,
  isAdmin = true,
  isFetching = false,
} = {}) => {
  env.isAdmin = isAdmin;
  env.store = { dispatch: vi.fn().mockResolvedValue() };
  env.getters = reactive({
    'teams/getTeams': records,
    'teams/getUIFlags': { isFetching },
  });
  const wrapper = mount(TeamsIndex, {
    global: {
      stubs: {
        SettingsLayout: Layout,
        BaseSettingsHeader: Header,
        RouterLink: Link,
        Button,
        EmojiIcon,
        Icon,
        WootConfirmDeleteModal: ConfirmModal,
      },
      directives: { tooltip: {} },
      mocks: { $t: (key, params) => (params ? `${key}:${params.n}` : key) },
    },
  });
  await flushPromises();
  return wrapper;
};
const rows = wrapper => wrapper.findAll('.py-4');
const search = async (wrapper, query) => {
  wrapper.findComponent(Header).vm.$emit('update:searchQuery', query);
  await flushPromises();
};
const binButton = (wrapper, index) =>
  wrapper.findAll('[data-icon="i-woot-bin"]')[index];

describe('TeamsIndex behaviour', () => {
  it('shows the loading and empty states', async () => {
    const wrapper = await mountPage({ records: [], isFetching: true });
    expect(wrapper.findComponent(Layout).props()).toEqual({
      isLoading: true,
      noRecordsFound: true,
    });
    expect(wrapper.text()).not.toContain('TEAMS_SETTINGS.COUNT');
  });

  it('lists teams with icons, count and admin actions', async () => {
    const wrapper = await mountPage();
    expect(wrapper.text()).toContain('TEAMS_SETTINGS.COUNT:2');
    expect(rows(wrapper).map(r => r.find('.capitalize').text())).toEqual([
      'sales',
      'support',
    ]);
    expect(wrapper.findComponent(EmojiIcon).props()).toEqual({
      value: '💰',
      color: 'gold',
    });
    expect(wrapper.findAllComponents(Icon)).toHaveLength(1);
    expect(wrapper.find('[data-to="settings_teams_new"]').exists()).toBe(true);
    expect(wrapper.findAll('[data-icon="i-woot-settings"]')).toHaveLength(2);
    expect(wrapper.findAll('[data-icon="i-woot-bin"]')).toHaveLength(2);
  });

  it('hides admin actions from agents', async () => {
    const wrapper = await mountPage({ isAdmin: false });
    expect(wrapper.find('[data-to="settings_teams_new"]').exists()).toBe(false);
    expect(wrapper.findAll('[data-icon]')).toHaveLength(0);
  });

  it('searches teams and shows no results', async () => {
    const wrapper = await mountPage();
    await search(wrapper, 'help');
    expect(rows(wrapper).map(r => r.find('.capitalize').text())).toEqual([
      'support',
    ]);
    await search(wrapper, '   ');
    expect(rows(wrapper)).toHaveLength(2);
    await search(wrapper, 'zzz');
    expect(wrapper.text()).toContain('TEAMS_SETTINGS.NO_RESULTS');
  });

  it('confirms and deletes a team', async () => {
    const wrapper = await mountPage();
    await binButton(wrapper, 1).trigger('click');
    const modal = wrapper.findComponent(ConfirmModal);
    expect(modal.props()).toMatchObject({
      title: 'TEAMS_SETTINGS.DELETE.CONFIRM.TITLE:support',
      confirmText: 'TEAMS_SETTINGS.DELETE.CONFIRM.YES support',
      rejectText: 'TEAMS_SETTINGS.DELETE.CONFIRM.NO',
      confirmValue: 'support',
      confirmPlaceHolderText:
        'TEAMS_SETTINGS.DELETE.CONFIRM.PLACE_HOLDER:support',
    });
    modal.vm.$emit('onConfirm');
    await flushPromises();
    expect(env.store.dispatch).toHaveBeenCalledWith('teams/delete', 2);
    expect(useAlert).toHaveBeenCalledWith(
      'TEAMS_SETTINGS.DELETE.API.SUCCESS_MESSAGE'
    );
    expect(wrapper.findComponent(ConfirmModal).exists()).toBe(false);
    expect(binButton(wrapper, 1).exists()).toBe(true);
  });

  it('alerts when deleting fails', async () => {
    const wrapper = await mountPage();
    env.store.dispatch.mockRejectedValue(new Error('nope'));
    await binButton(wrapper, 0).trigger('click');
    wrapper.findComponent(ConfirmModal).vm.$emit('onConfirm');
    await flushPromises();
    expect(useAlert).toHaveBeenCalledWith(
      'TEAMS_SETTINGS.DELETE.API.ERROR_MESSAGE'
    );
  });

  it('closes the confirmation without deleting', async () => {
    const wrapper = await mountPage();
    await binButton(wrapper, 0).trigger('click');
    wrapper.findComponent(ConfirmModal).vm.$emit('onClose');
    await flushPromises();
    expect(wrapper.findComponent(ConfirmModal).exists()).toBe(false);
    await binButton(wrapper, 0).trigger('click');
    wrapper.findComponent(ConfirmModal).vm.$emit('update:show', false);
    await flushPromises();
    expect(wrapper.findComponent(ConfirmModal).exists()).toBe(false);
    expect(env.store.dispatch).not.toHaveBeenCalled();
  });
});
