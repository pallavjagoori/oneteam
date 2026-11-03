/**
 * OneTeam behaviour spec for the article search Header.
 *
 * Covers focusing the input on mount, emitting searches, closing from
 * the button or Escape, and refocusing with the slash shortcut.
 */
import { mount } from '@vue/test-utils';
import Header from '../Header.vue';

const env = vi.hoisted(() => ({ events: null }));

vi.mock('dashboard/composables/useKeyboardEvents', () => ({
  useKeyboardEvents: events => {
    env.events = events;
  },
}));

/**
 * Mounts the header attached to the document so focus works.
 *
 * @returns {import('@vue/test-utils').VueWrapper}
 */
const mountHeader = () =>
  mount(Header, {
    attachTo: document.body,
    props: { title: 'Docs' },
    global: {
      mocks: { $t: key => key },
      stubs: {
        FluentIcon: true,
        Button: {
          emits: ['click'],
          template: '<button @click="$emit(\'click\')" />',
        },
      },
    },
  });

describe('ArticleSearch Header behaviour', () => {
  it('focuses the input and emits searches', async () => {
    const wrapper = mountHeader();
    const input = wrapper.find('input');
    expect(document.activeElement).toBe(input.element);
    input.element.value = 'billing';
    await input.trigger('input');
    expect(wrapper.emitted('search')).toEqual([['billing']]);
    wrapper.unmount();
  });

  it('closes from the button and the Escape key', async () => {
    const wrapper = mountHeader();
    await wrapper.find('button').trigger('click');
    env.events.Escape.action();
    expect(wrapper.emitted('close')).toHaveLength(2);
    wrapper.unmount();
  });

  it('refocuses the input with the slash shortcut', () => {
    const wrapper = mountHeader();
    wrapper.find('input').element.blur();
    const preventDefault = vi.fn();
    env.events.Slash.action({ preventDefault });
    expect(preventDefault).toHaveBeenCalled();
    expect(document.activeElement).toBe(wrapper.find('input').element);
    wrapper.unmount();
  });
});
