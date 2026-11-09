/**
 * OneTeam behaviour spec for the virtualised conversation list.
 *
 * Covers rendering each conversation, expanded cards on large screens,
 * the context menu lock, and the loading, end-of-list and load-more
 * footers.
 */
/* eslint-disable vue/no-unused-properties, vue/require-default-prop */
import { defineComponent, inject, ref } from 'vue';
import { mount } from '@vue/test-utils';
import ConversationList from '../ConversationList.vue';

const env = vi.hoisted(() => ({}));

vi.mock('@vueuse/core', async importOriginal => ({
  ...(await importOriginal()),
  useBreakpoints: () => ({ greaterOrEqual: () => env.isLg }),
}));
vi.mock('virtua/vue', () => ({
  Virtualizer: {
    props: ['data'],
    template:
      '<div><template v-for="item in data" :key="item.id"><slot :item="item" /></template></div>',
  },
}));
vi.mock('dashboard/composables/chatlist/useChatListKeyboardEvents', () => ({
  useChatListKeyboardEvents: vi.fn(),
}));

const ConversationItem = defineComponent({
  name: 'ConversationItem',
  props: { source: Object, showExpanded: Boolean },
  setup() {
    return { toggle: inject('toggleContextMenu') };
  },
  template:
    '<div class="item" :data-expanded="showExpanded">{{ source.id }}</div>',
});

/**
 * Mounts the list.
 *
 * @param {object} props props overrides
 * @returns {import('@vue/test-utils').VueWrapper}
 */
const mountList = props =>
  mount(ConversationList, {
    props: { conversationList: [{ id: 1 }, { id: 2 }], ...props },
    global: {
      mocks: { $t: key => key },
      stubs: {
        ConversationItem,
        Spinner: { template: '<i class="spinner" />' },
        IntersectionObserver: {
          name: 'IntersectionObserver',
          props: ['options'],
          emits: ['observed'],
          template: '<span class="observer" />',
        },
      },
    },
  });

describe('ConversationList behaviour', () => {
  beforeEach(() => {
    env.isLg = ref(true);
  });

  it('renders items, expands on large screens and locks scroll for menus', async () => {
    const wrapper = mountList({ isOnExpandedLayout: true });
    const items = wrapper.findAllComponents({ name: 'ConversationItem' });
    expect(items).toHaveLength(2);
    expect(items[0].props('showExpanded')).toBe(true);

    env.isLg.value = false;
    await wrapper.vm.$nextTick();
    expect(items[0].props('showExpanded')).toBe(false);

    items[0].vm.toggle(true);
    await wrapper.vm.$nextTick();
    expect(wrapper.classes()).toContain('!overflow-hidden');
    expect(wrapper.vm.conversationListRef).toBe(wrapper.element);
  });

  it('loads more when the footer is observed', async () => {
    const wrapper = mountList();
    await wrapper.vm.$nextTick();
    const observer = wrapper.findComponent({ name: 'IntersectionObserver' });
    expect(observer.props('options')).toEqual({
      root: wrapper.element,
      rootMargin: '100px 0px 100px 0px',
    });
    observer.vm.$emit('observed');
    expect(wrapper.emitted('loadMore')).toHaveLength(1);
  });

  it('shows the spinner or the end of list message', () => {
    expect(mountList({ isLoading: true }).find('.spinner').exists()).toBe(true);
    const done = mountList({ showEndOfListMessage: true });
    expect(done.text()).toContain('CHAT_LIST.EOF');
    expect(done.find('.observer').exists()).toBe(false);
  });
});
