/**
 * OneTeam behaviour spec for the breadcrumb trail.
 *
 * Covers clickable earlier crumbs with chevrons between them, the last
 * crumb as plain text with an optional emoji, and the click payload.
 */
import { mount } from '@vue/test-utils';
import Breadcrumb from '../Breadcrumb.vue';

vi.mock('vue-i18n', async importOriginal => ({
  ...(await importOriginal()),
  useI18n: () => ({ t: key => key }),
}));

const EmojiIcon = {
  name: 'EmojiIcon',
  props: ['value', 'color'],
  template: '<i class="emoji" />',
};

/**
 * Mounts the breadcrumb for the given items.
 *
 * @param {Array} items Breadcrumb items.
 * @returns {import('@vue/test-utils').VueWrapper} The mounted wrapper.
 */
const mountCrumbs = items =>
  mount(Breadcrumb, {
    props: { items },
    global: {
      stubs: { EmojiIcon, Icon: { template: '<i class="chevron" />' } },
    },
  });

describe('Breadcrumb behaviour', () => {
  it('links earlier crumbs and shows the last one as text', async () => {
    const items = [
      { label: 'Help Center' },
      { label: 'Docs' },
      { label: 'Getting started', emoji: '🚀', iconColor: 'blue' },
    ];
    const wrapper = mountCrumbs(items);
    expect(wrapper.get('nav').attributes('aria-label')).toBe(
      'BREADCRUMB.ARIA_LABEL'
    );
    expect(wrapper.findAll('.chevron')).toHaveLength(2);
    const buttons = wrapper.findAll('button');
    expect(buttons.map(b => b.text())).toEqual(['Help Center', 'Docs']);
    await buttons[1].trigger('click');
    expect(wrapper.emitted('click')).toEqual([[items[1], 1]]);
    expect(wrapper.getComponent(EmojiIcon).props()).toEqual({
      value: '🚀',
      color: 'blue',
    });
    expect(wrapper.text()).toContain('Getting started');
  });

  it('shows a single crumb without an emoji', () => {
    const wrapper = mountCrumbs([{ label: 'Home' }]);
    expect(wrapper.find('button').exists()).toBe(false);
    expect(wrapper.find('.chevron').exists()).toBe(false);
    expect(wrapper.findComponent(EmojiIcon).exists()).toBe(false);
  });
});
