/**
 * OneTeam behaviour spec for the data import ImportLogSection.
 *
 * Covers the count badge, toggling and downloading, the open and
 * closed states, the empty message and the table rows slot.
 */
import { mount } from '@vue/test-utils';
import ImportLogSection from '../ImportLogSection.vue';

/**
 * Mounts the section.
 *
 * @param {object} props component props
 * @returns {import('@vue/test-utils').VueWrapper}
 */
const mountSection = props =>
  mount(ImportLogSection, {
    props: { title: 'Errors', emptyMessage: 'None', ...props },
    slots: {
      row: '<template #row="{ items }"><tr v-for="item in items" :key="item.id" class="row" /></template>',
    },
    global: {
      stubs: {
        Icon: true,
        Button: {
          emits: ['click'],
          template: '<button class="download" @click="$emit(\'click\')" />',
        },
        BaseTable: {
          props: ['items'],
          template: '<table><slot name="row" :items="items" /></table>',
        },
      },
    },
  });

describe('ImportLogSection behaviour', () => {
  it('shows the empty message while closed', async () => {
    const wrapper = mountSection({});
    expect(wrapper.find('.tabular-nums').exists()).toBe(false);
    expect(wrapper.find('.grid-rows-\\[0fr\\]').exists()).toBe(true);
    expect(wrapper.text()).toContain('None');
    await wrapper.find('[aria-expanded]').trigger('click');
    expect(wrapper.emitted('toggle')).toHaveLength(1);
    expect(
      wrapper.find('button:not([aria-expanded])').attributes('disabled')
    ).toBeDefined();
  });

  it('shows the count and rows while open', async () => {
    const wrapper = mountSection({
      isOpen: true,
      count: 2,
      items: [{ id: 1 }, { id: 2 }],
    });
    expect(wrapper.find('.tabular-nums').text()).toBe('2');
    expect(wrapper.find('.grid-rows-\\[1fr\\]').exists()).toBe(true);
    expect(wrapper.findAll('.row')).toHaveLength(2);
    await wrapper.find('button:not([aria-expanded])').trigger('click');
    expect(wrapper.emitted('download')).toHaveLength(1);
  });
});
