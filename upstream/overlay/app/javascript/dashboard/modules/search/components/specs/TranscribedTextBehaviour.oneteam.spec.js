/**
 * OneTeam behaviour spec for the search transcript snippet.
 *
 * Covers the read more and read less toggles driven by
 * useExpandableContent.
 */
import { ref } from 'vue';
import { mount } from '@vue/test-utils';
import TranscribedText from '../TranscribedText.vue';

const env = vi.hoisted(() => ({ state: null, toggle: vi.fn() }));

vi.mock('shared/composables/useExpandableContent', () => ({
  useExpandableContent: () => ({
    contentElement: ref(null),
    showReadMore: env.state.more,
    showReadLess: env.state.less,
    toggleExpanded: env.toggle,
  }),
}));

/**
 * Mounts the snippet with the given expand state.
 *
 * @param {boolean} more - Whether "read more" shows.
 * @param {boolean} less - Whether "read less" shows.
 * @returns {import('@vue/test-utils').VueWrapper} The mounted wrapper.
 */
const mountText = (more, less) => {
  env.state = { more: ref(more), less: ref(less) };
  return mount(TranscribedText, {
    props: { text: 'Hello from the call' },
    global: { mocks: { $t: key => key } },
  });
};

describe('TranscribedText behaviour', () => {
  it('expands from read more', async () => {
    const wrapper = mountText(true, false);
    expect(wrapper.find('.line-clamp-1').exists()).toBe(true);
    expect(wrapper.find('.grid-cols-\\[1fr_auto\\]').exists()).toBe(true);
    await wrapper.find('button').trigger('click');
    expect(env.toggle).toHaveBeenCalledWith(true);
  });

  it('collapses from read less', async () => {
    const wrapper = mountText(false, true);
    expect(wrapper.find('.grid-cols-1').exists()).toBe(true);
    expect(wrapper.find('button').text()).toBe('SEARCH.READ_LESS');
    await wrapper.find('button').trigger('click');
    expect(env.toggle).toHaveBeenCalledWith(false);
  });
});
