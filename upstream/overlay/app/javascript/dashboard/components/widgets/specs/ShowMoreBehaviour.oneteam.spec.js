/**
 * OneTeam behaviour spec for the "show more" text block.
 *
 * Covers truncating long text, expanding and collapsing it without
 * bubbling the click, and leaving short text alone.
 */
import { mount } from '@vue/test-utils';
import ShowMore from '../ShowMore.vue';

vi.mock('vue-i18n', async importOriginal => ({
  ...(await importOriginal()),
  useI18n: () => ({ t: key => key }),
}));

describe('ShowMore behaviour', () => {
  it('truncates long text and toggles it', async () => {
    const parentClick = vi.fn();
    const wrapper = mount(ShowMore, {
      props: { text: 'abcdefghij', limit: 4 },
    });
    wrapper.element.addEventListener('click', parentClick);
    expect(wrapper.text()).toContain('abcd...');
    const button = wrapper.get('button');
    expect(button.text()).toBe('COMPONENTS.SHOW_MORE_BLOCK.SHOW_MORE');
    await button.trigger('click');
    expect(wrapper.text()).toContain('abcdefghij');
    expect(button.text()).toBe('COMPONENTS.SHOW_MORE_BLOCK.SHOW_LESS');
    expect(parentClick).not.toHaveBeenCalled();
    await button.trigger('click');
    expect(wrapper.text()).toContain('abcd...');
  });

  it('leaves short text alone', () => {
    const wrapper = mount(ShowMore, { props: { text: 'short' } });
    expect(wrapper.text()).toBe('short');
    expect(wrapper.find('button').exists()).toBe(false);
  });
});
