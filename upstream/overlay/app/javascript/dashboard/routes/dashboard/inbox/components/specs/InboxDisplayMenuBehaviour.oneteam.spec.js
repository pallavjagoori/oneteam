/**
 * OneTeam behaviour spec for the notification inbox display menu.
 *
 * Covers restoring the saved sort and display filters (and defaults),
 * opening and closing the sort menu (outside clicks too), picking a sort
 * order, toggling the snoozed and read display options, and saving each
 * change to the UI settings while emitting the filter.
 */
import { flushPromises, mount } from '@vue/test-utils';
import InboxDisplayMenu from '../InboxDisplayMenu.vue';

const env = vi.hoisted(() => ({}));

vi.mock('dashboard/composables/useUISettings', () => ({
  useUISettings: () => ({
    uiSettings: env.uiSettings,
    updateUISettings: env.update,
  }),
}));

const NextButton = {
  name: 'NextButton',
  props: ['label'],
  emits: ['click'],
  template:
    '<button class="sort" @click="$emit(\'click\', $event)">{{ label }}</button>',
};

const mountMenu = async uiSettings => {
  env.uiSettings = uiSettings;
  env.update = vi.fn();
  const wrapper = mount(InboxDisplayMenu, {
    global: {
      stubs: { NextButton },
      directives: {
        onClickaway: {
          mounted: (el, binding) => {
            env.clickaway = binding.value;
          },
        },
      },
      mocks: { $t: key => key },
    },
  });
  await flushPromises();
  return wrapper;
};
const sortButton = wrapper => wrapper.findComponent(NextButton);
const sortOptions = wrapper => wrapper.findAll('[role="button"]');

describe('InboxDisplayMenu behaviour', () => {
  it('defaults to newest first with nothing selected', async () => {
    const wrapper = await mountMenu({});
    expect(sortButton(wrapper).props('label')).toBe(
      'INBOX.DISPLAY_MENU.SORT_OPTIONS.NEWEST'
    );
    expect(
      wrapper.findAll('input[type="checkbox"]').map(i => i.element.checked)
    ).toEqual([false, false]);
  });

  it('restores saved filters', async () => {
    const wrapper = await mountMenu({
      inbox_filter_by: { status: 'snoozed', type: 'read', sort_by: 'asc' },
    });
    expect(sortButton(wrapper).props('label')).toBe(
      'INBOX.DISPLAY_MENU.SORT_OPTIONS.OLDEST'
    );
    expect(
      wrapper.findAll('input[type="checkbox"]').map(i => i.element.checked)
    ).toEqual([true, true]);
  });

  it('shows no label for an unknown saved sort', async () => {
    const wrapper = await mountMenu({ inbox_filter_by: { sort_by: 'random' } });
    expect(sortButton(wrapper).props('label')).toBe('');
  });

  it('opens the sort menu and picks a sort order', async () => {
    const wrapper = await mountMenu({});
    await sortButton(wrapper).trigger('click');
    const [newest, oldest] = sortOptions(wrapper);
    expect(newest.classes()).toContain('bg-n-brand/10');
    expect(newest.find('.i-lucide-check').exists()).toBe(true);
    expect(oldest.find('.text-n-slate-11').exists()).toBe(true);
    await oldest.trigger('click');
    expect(sortOptions(wrapper)).toHaveLength(0);
    expect(env.update).toHaveBeenCalledWith({
      inbox_filter_by: { status: '', type: '', sort_by: 'asc' },
    });
    expect(wrapper.emitted('filter')[0][0]).toMatchObject({ key: 'asc' });
  });

  it('toggles the sort menu and closes it on outside clicks', async () => {
    const wrapper = await mountMenu({});
    await sortButton(wrapper).trigger('click');
    await sortButton(wrapper).trigger('click');
    expect(sortOptions(wrapper)).toHaveLength(0);
    await sortButton(wrapper).trigger('click');
    env.clickaway();
    await wrapper.vm.$nextTick();
    expect(sortOptions(wrapper)).toHaveLength(0);
  });

  it('toggles display options and saves them', async () => {
    const wrapper = await mountMenu({});
    const [snoozed, read] = wrapper.findAll('input[type="checkbox"]');
    await snoozed.trigger('change');
    expect(env.update).toHaveBeenLastCalledWith({
      inbox_filter_by: { status: 'snoozed', type: '', sort_by: 'desc' },
    });
    await read.trigger('change');
    expect(env.update).toHaveBeenLastCalledWith({
      inbox_filter_by: { status: 'snoozed', type: 'read', sort_by: 'desc' },
    });
    await snoozed.trigger('change');
    expect(env.update).toHaveBeenLastCalledWith({
      inbox_filter_by: { status: '', type: 'read', sort_by: 'desc' },
    });
    expect(wrapper.emitted('filter')).toHaveLength(3);
  });

  it('falls back to newest when saving without a sort', async () => {
    const wrapper = await mountMenu({});
    wrapper.vm.activeSort = '';
    wrapper.vm.saveSelectedDisplayFilter();
    expect(env.update).toHaveBeenCalledWith({
      inbox_filter_by: { status: '', type: '', sort_by: 'desc' },
    });
  });
});
