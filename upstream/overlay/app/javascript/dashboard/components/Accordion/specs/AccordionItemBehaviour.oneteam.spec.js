/**
 * OneTeam behaviour spec for an accordion section.
 *
 * Covers the title and icon, toggling without bubbling, the open and
 * closed icons and body, and compact padding.
 */
import { mount } from '@vue/test-utils';
import AccordionItem from '../AccordionItem.vue';

const FluentIcon = { name: 'FluentIcon', props: ['icon'], template: '<i />' };
const EmojiOrIcon = {
  name: 'EmojiOrIcon',
  props: ['icon', 'emoji'],
  template: '<span />',
};

/**
 * Mounts the section inside a parent with a click listener.
 *
 * @param {object} props Section props.
 * @param {Function} parentClick Parent click listener.
 * @returns {import('@vue/test-utils').VueWrapper} The mounted wrapper.
 */
const mountItem = (props, parentClick = () => {}) =>
  mount(
    {
      components: { AccordionItem },
      props: ['itemProps'],
      methods: { parentClick },
      template:
        '<div @click="parentClick"><AccordionItem v-bind="itemProps"><p class="body">Body</p></AccordionItem></div>',
    },
    {
      props: { itemProps: { title: 'Details', ...props } },
      global: { stubs: { FluentIcon, EmojiOrIcon } },
    }
  );

describe('AccordionItem behaviour', () => {
  it('shows an open section and toggles without bubbling', async () => {
    const parentClick = vi.fn();
    const wrapper = mountItem({ icon: 'info', emoji: '👋' }, parentClick);
    const item = wrapper.getComponent(AccordionItem);
    expect(wrapper.text()).toContain('Details');
    expect(wrapper.getComponent(EmojiOrIcon).props()).toEqual({
      icon: 'info',
      emoji: '👋',
    });
    expect(wrapper.getComponent(FluentIcon).props('icon')).toBe('subtract');
    expect(wrapper.find('.body').exists()).toBe(true);
    expect(wrapper.find('.px-2.py-4').exists()).toBe(true);
    await wrapper.get('button').trigger('click');
    expect(item.emitted('toggle')).toHaveLength(1);
    expect(parentClick).not.toHaveBeenCalled();
  });

  it('shows a closed section and compact padding', () => {
    const closed = mountItem({ isOpen: false });
    expect(closed.getComponent(FluentIcon).props('icon')).toBe('add');
    expect(closed.find('.body').exists()).toBe(false);
    expect(mountItem({ compact: true }).find('.p-0').exists()).toBe(true);
  });
});
