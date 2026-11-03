/**
 * OneTeam behaviour spec for the notification inbox empty state.
 *
 * Covers the spinner while loading, the default note and a custom
 * message.
 */
import { mount } from '@vue/test-utils';
import InboxEmptyState from '../InboxEmptyState.vue';

/**
 * Mounts the empty state with the given loading flag and props.
 *
 * @param {boolean} isFetching Whether notifications are loading.
 * @param {object} props Component props.
 * @returns {import('@vue/test-utils').VueWrapper} The mounted wrapper.
 */
const mountState = (isFetching, props = {}) =>
  mount(InboxEmptyState, {
    props,
    global: {
      stubs: {
        Spinner: { template: '<i class="spinner" />' },
        FluentIcon: true,
      },
      mocks: {
        $t: key => key,
        $store: { getters: { 'notifications/getUIFlags': { isFetching } } },
      },
    },
  });

describe('InboxEmptyState behaviour', () => {
  it('shows a spinner while loading', () => {
    expect(mountState(true).find('.spinner').exists()).toBe(true);
  });

  it('shows the default note or a custom message', () => {
    expect(mountState(false).text()).toBe('INBOX.LIST.NOTE');
    expect(
      mountState(false, { emptyStateMessage: 'Nothing here' }).text()
    ).toBe('Nothing here');
  });
});
