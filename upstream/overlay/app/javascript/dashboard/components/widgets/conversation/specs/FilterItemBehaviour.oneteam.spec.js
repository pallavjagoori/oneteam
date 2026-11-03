/**
 * OneTeam behaviour spec for the conversation FilterItem select.
 *
 * Covers the option labels and dispatching the status or sort filter on
 * change.
 */
import { mount } from '@vue/test-utils';
import FilterItem from '../FilterItem.vue';

/**
 * Mounts FilterItem with a fake store.
 *
 * @param {string} type filter type
 * @returns {{ wrapper: object, dispatch: Function }}
 */
const mountFilter = type => {
  const dispatch = vi.fn();
  const wrapper = mount(FilterItem, {
    props: {
      selectedValue: 'open',
      items: ['open', 'resolved'],
      type,
      pathPrefix: 'CHAT_LIST.STATUS',
    },
    global: { mocks: { $t: key => key, $store: { dispatch } } },
  });
  return { wrapper, dispatch };
};

describe('FilterItem behaviour', () => {
  it('renders an option per item', () => {
    const { wrapper } = mountFilter('status');
    expect(wrapper.findAll('option').map(o => o.text())).toEqual([
      'CHAT_LIST.STATUS.open.TEXT',
      'CHAT_LIST.STATUS.resolved.TEXT',
    ]);
  });

  it('dispatches the status filter', async () => {
    const { wrapper, dispatch } = mountFilter('status');
    await wrapper.find('select').setValue('resolved');
    expect(dispatch).toHaveBeenCalledWith('setChatStatusFilter', 'resolved');
    expect(wrapper.emitted('onChangeFilter')).toEqual([['resolved', 'status']]);
  });

  it('dispatches the sort filter for other types', async () => {
    const { wrapper, dispatch } = mountFilter('sort');
    await wrapper.find('select').setValue('resolved');
    expect(dispatch).toHaveBeenCalledWith('setChatSortFilter', 'resolved');
  });
});
