/**
 * OneTeam behaviour spec for the editor slash command menu.
 *
 * Covers hovering to move the selection, positioning from the left or
 * right, keyboard navigation with scrolling, ignored keys, and the
 * empty menu.
 */
import { mount } from '@vue/test-utils';
import SlashCommandMenu from '../SlashCommandMenu.vue';

vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: key => key }) }));

/**
 * Mounts the menu.
 *
 * @param {object} props props overrides
 * @returns {import('@vue/test-utils').VueWrapper}
 */
const mountMenu = props =>
  mount(SlashCommandMenu, {
    props: { enabledMenuOptions: ['h1', 'h2', 'strong'], ...props },
    attachTo: document.body,
    global: { stubs: { Icon: true } },
  });

describe('SlashCommandMenu behaviour', () => {
  beforeEach(() => {
    Element.prototype.scrollIntoView = vi.fn();
  });

  it('selects the hovered item and positions from the right', async () => {
    const wrapper = mountMenu({ position: { top: 4, right: 8 } });
    expect(wrapper.attributes('style')).toContain('right: 8px');
    const buttons = wrapper.findAll('button');
    await buttons[2].trigger('mouseover');
    wrapper.vm.handleKeyDown({ key: 'Enter' });
    expect(wrapper.emitted('selectAction')).toEqual([['strong']]);
    wrapper.unmount();
  });

  it('moves with the keyboard, scrolling the selected item into view', async () => {
    const wrapper = mountMenu({ position: { top: 4, left: 2 } });
    expect(wrapper.attributes('style')).toContain('left: 2px');
    expect(wrapper.vm.handleKeyDown({ key: 'ArrowUp' })).toBe(true);
    await wrapper.vm.$nextTick();
    expect(Element.prototype.scrollIntoView).toHaveBeenCalled();
    expect(wrapper.vm.handleKeyDown({ key: 'n', ctrlKey: true })).toBe(true);
    expect(wrapper.vm.handleKeyDown({ key: 'Tab' })).toBe(false);
    expect(wrapper.vm.handleKeyDown({ key: 'Enter', shiftKey: true })).toBe(
      false
    );
    wrapper.unmount();
  });

  it('renders nothing and ignores keys without matches', () => {
    const wrapper = mountMenu({ searchKey: 'zzz' });
    expect(wrapper.find('button').exists()).toBe(false);
    expect(wrapper.vm.handleKeyDown({ key: 'Enter' })).toBe(false);
    wrapper.unmount();
  });
});
