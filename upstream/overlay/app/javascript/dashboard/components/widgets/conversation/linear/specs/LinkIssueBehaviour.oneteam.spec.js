/**
 * OneTeam behaviour spec for linking a conversation to a Linear issue.
 *
 * Covers opening and closing the issue picker (outside clicks too),
 * searching issues (empty queries, results, API error message and
 * fallback), picking an issue, linking it (success with tracking and
 * close, failure with the API message), and cancelling.
 */
import { flushPromises, mount } from '@vue/test-utils';
import LinearAPI from 'dashboard/api/integrations/linear';
import { useAlert, useTrack } from 'dashboard/composables';
import { LINEAR_EVENTS } from 'dashboard/helper/AnalyticsHelper/events';
import LinkIssue from '../LinkIssue.vue';

const { env, FilterButton, FilterList } = vi.hoisted(() => ({
  env: {},
  FilterButton: {
    name: 'DropdownButton',
    props: ['buttonText'],
    emits: ['click'],
    template:
      '<div><button class="picker" @click="$emit(\'click\')">{{ buttonText }}</button><slot name="dropdown" /></div>',
  },
  FilterList: {
    name: 'DropdownList',
    props: ['listItems', 'activeFilterId', 'isLoading'],
    emits: ['onSearch', 'select'],
    template: '<ul class="list" />',
  },
}));

vi.mock('dashboard/composables', () => ({
  useAlert: vi.fn(),
  useTrack: vi.fn(),
}));
vi.mock('dashboard/api/integrations/linear', () => ({
  default: { searchIssues: vi.fn(), link_issue: vi.fn() },
}));
vi.mock('dashboard/components/ui/Dropdown/DropdownButton.vue', () => ({
  default: FilterButton,
}));
vi.mock('dashboard/components/ui/Dropdown/DropdownList.vue', () => ({
  default: FilterList,
}));
vi.mock('vue-i18n', async importOriginal => ({
  ...(await importOriginal()),
  useI18n: () => ({ t: key => key }),
}));

const Button = {
  name: 'Button',
  props: ['label', 'disabled', 'isLoading'],
  emits: ['click'],
  template:
    '<button :disabled="disabled" @click="$emit(\'click\', $event)">{{ label }}</button>',
};

const apiError = message => ({
  response: { data: { error: { errors: message ? [{ message }] : [] } } },
});

const mountLink = async () => {
  const wrapper = mount(LinkIssue, {
    props: { conversationId: 12, title: 'Login bug' },
    global: {
      stubs: { Button },
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
const list = wrapper => wrapper.findComponent(FilterList);
const linkButton = wrapper =>
  wrapper
    .findAllComponents(Button)
    .find(b => b.props('label') === 'INTEGRATION_SETTINGS.LINEAR.LINK.TITLE');
const openAndSearch = async (wrapper, query) => {
  await wrapper.find('.picker').trigger('click');
  list(wrapper).vm.$emit('onSearch', query);
  await flushPromises();
};

describe('LinkIssue behaviour', () => {
  it('starts with no issue selected and linking disabled', async () => {
    const wrapper = await mountLink();
    expect(wrapper.find('.picker').text()).toBe(
      'INTEGRATION_SETTINGS.LINEAR.LINK.SELECT'
    );
    expect(linkButton(wrapper).props('disabled')).toBe(true);
    expect(wrapper.classes()).toContain('gap-2');
  });

  it('opens the picker and closes it on outside clicks', async () => {
    const wrapper = await mountLink();
    await wrapper.find('.picker').trigger('click');
    expect(wrapper.classes()).toContain('h-[256px]');
    expect(list(wrapper).props('listItems')).toEqual([]);
    env.clickaway();
    await flushPromises();
    expect(list(wrapper).exists()).toBe(false);
  });

  it('searches issues and ignores empty queries', async () => {
    LinearAPI.searchIssues.mockResolvedValue({
      data: [{ identifier: 'ENG-1', title: 'Crash', state: { color: '#f00' } }],
    });
    const wrapper = await mountLink();
    await openAndSearch(wrapper, '');
    expect(LinearAPI.searchIssues).not.toHaveBeenCalled();
    list(wrapper).vm.$emit('onSearch', 'crash');
    await flushPromises();
    expect(LinearAPI.searchIssues).toHaveBeenCalledWith('crash');
    expect(list(wrapper).props('listItems')).toEqual([
      { id: 'ENG-1', name: 'ENG-1 Crash', icon: 'status', iconColor: '#f00' },
    ]);
    expect(list(wrapper).props('isLoading')).toBe(false);
  });

  it('alerts when searching fails', async () => {
    const wrapper = await mountLink();
    LinearAPI.searchIssues.mockRejectedValueOnce(apiError('Rate limited'));
    await openAndSearch(wrapper, 'x');
    expect(useAlert).toHaveBeenCalledWith('Rate limited');
    LinearAPI.searchIssues.mockRejectedValueOnce(apiError());
    list(wrapper).vm.$emit('onSearch', 'y');
    await flushPromises();
    expect(useAlert).toHaveBeenCalledWith(
      'INTEGRATION_SETTINGS.LINEAR.LINK.ERROR'
    );
  });

  it('picks an issue and links it', async () => {
    LinearAPI.link_issue.mockResolvedValue();
    const wrapper = await mountLink();
    await wrapper.find('.picker').trigger('click');
    list(wrapper).vm.$emit('select', { id: 'ENG-2', name: 'ENG-2 Slow' });
    await flushPromises();
    expect(list(wrapper).exists()).toBe(false);
    expect(wrapper.find('.picker').text()).toBe('ENG-2 Slow');
    expect(linkButton(wrapper).props('disabled')).toBe(false);
    await linkButton(wrapper).trigger('click');
    await flushPromises();
    expect(LinearAPI.link_issue).toHaveBeenCalledWith(12, 'ENG-2', 'Login bug');
    expect(useAlert).toHaveBeenCalledWith(
      'INTEGRATION_SETTINGS.LINEAR.LINK.LINK_SUCCESS'
    );
    expect(useTrack).toHaveBeenCalledWith(LINEAR_EVENTS.LINK_ISSUE);
    expect(wrapper.emitted('close')).toHaveLength(1);
  });

  it('alerts when linking fails', async () => {
    LinearAPI.link_issue.mockRejectedValue(apiError());
    const wrapper = await mountLink();
    await wrapper.find('.picker').trigger('click');
    list(wrapper).vm.$emit('select', { id: 'ENG-2', name: 'ENG-2 Slow' });
    await flushPromises();
    await linkButton(wrapper).trigger('click');
    await flushPromises();
    expect(useAlert).toHaveBeenCalledWith(
      'INTEGRATION_SETTINGS.LINEAR.LINK.LINK_ERROR'
    );
    expect(wrapper.emitted('close')).toBeUndefined();
  });

  it('cancels', async () => {
    const wrapper = await mountLink();
    await wrapper
      .findAllComponents(Button)
      .find(b => b.props('label').endsWith('CANCEL'))
      .trigger('click');
    expect(wrapper.emitted('close')).toHaveLength(1);
  });
});
