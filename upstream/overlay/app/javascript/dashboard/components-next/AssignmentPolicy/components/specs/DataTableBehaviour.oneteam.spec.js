/**
 * OneTeam behaviour spec for the assignment policy DataTable.
 *
 * Covers the loading spinner, the empty state, rows with icons or
 * avatars and email or phone, and the navigate and delete events.
 */
import { mount } from '@vue/test-utils';
import DataTable from '../DataTable.vue';

/**
 * Mounts the table.
 *
 * @param {object} props component props
 * @returns {import('@vue/test-utils').VueWrapper}
 */
const mountTable = props =>
  mount(DataTable, {
    props,
    global: {
      stubs: {
        Spinner: { template: '<i class="spinner" />' },
        Avatar: { template: '<span class="avatar" />' },
        Icon: { props: ['icon'], template: '<i :class="icon" />' },
        Button: {
          emits: ['click'],
          template: '<button class="delete" @click="$emit(\'click\')" />',
        },
      },
    },
  });

describe('DataTable behaviour', () => {
  it('shows a spinner while fetching', () => {
    expect(mountTable({ isFetching: true }).find('.spinner').exists()).toBe(
      true
    );
  });

  it('shows the empty state message', () => {
    expect(mountTable({ emptyStateMessage: 'Nothing' }).text()).toBe('Nothing');
  });

  it('renders an empty list without a message', () => {
    expect(mountTable({}).find('.custom-dashed-border').exists()).toBe(false);
  });

  it('lists items and emits navigate and delete', async () => {
    const items = [
      { id: 1, name: 'Mail', icon: 'i-lucide-mail', email: 'a@x.co' },
      { id: 2, name: 'Phone', phoneNumber: '+100' },
    ];
    const wrapper = mountTable({ items });
    expect(wrapper.find('.i-lucide-mail').exists()).toBe(true);
    expect(wrapper.find('.avatar').exists()).toBe(true);
    expect(wrapper.text()).toContain('a@x.co');
    expect(wrapper.text()).toContain('+100');
    await wrapper.findAll('button.col-span-2')[1].trigger('click');
    expect(wrapper.emitted('navigate')).toEqual([[items[1]]]);
    await wrapper.findAll('.delete')[0].trigger('click');
    expect(wrapper.emitted('delete')).toEqual([[1]]);
  });
});
