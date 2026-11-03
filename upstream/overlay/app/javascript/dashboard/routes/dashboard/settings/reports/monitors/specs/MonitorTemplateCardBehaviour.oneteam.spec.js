/**
 * OneTeam behaviour spec for a monitor template card.
 *
 * Covers the template details, the arrow and use action when the user
 * may create monitors, and the disabled card otherwise.
 */
import { mount } from '@vue/test-utils';
import MonitorTemplateCard from '../MonitorTemplateCard.vue';

vi.mock('vue-i18n', async importOriginal => ({
  ...(await importOriginal()),
  useI18n: () => ({ t: (key, args) => `${key}:${args?.name}` }),
}));

const EmojiIcon = {
  name: 'EmojiIcon',
  props: ['value', 'color'],
  template: '<i />',
};
const Icon = { name: 'Icon', props: ['icon'], template: '<i class="arrow" />' };

const template = {
  name: 'Slow replies',
  audience: 'Support leads',
  summary: 'Alerts when replies lag',
  icon: '🐢',
  icon_color: 'amber',
};

/**
 * Mounts the card.
 *
 * @param {object} props Extra props.
 * @returns {import('@vue/test-utils').VueWrapper} The mounted wrapper.
 */
const mountCard = props =>
  mount(MonitorTemplateCard, {
    props: { template, ...props },
    global: { stubs: { EmojiIcon, Icon } },
  });

describe('MonitorTemplateCard behaviour', () => {
  it('shows the template and uses it', async () => {
    const wrapper = mountCard({ canCreate: true });
    const button = wrapper.get('button');
    expect(button.attributes('aria-label')).toBe(
      'MONITORS.TEMPLATES.USE_NAMED:Slow replies'
    );
    expect(button.attributes('disabled')).toBeUndefined();
    expect(wrapper.getComponent(EmojiIcon).props()).toEqual({
      value: '🐢',
      color: 'amber',
    });
    expect(wrapper.text()).toContain('Support leads');
    expect(wrapper.text()).toContain('Alerts when replies lag');
    expect(wrapper.find('.arrow').exists()).toBe(true);
    await button.trigger('click');
    expect(wrapper.emitted('use')).toEqual([[template]]);
  });

  it('disables the card for users who cannot create monitors', () => {
    const wrapper = mountCard();
    expect(wrapper.get('button').attributes('disabled')).toBeDefined();
    expect(wrapper.find('.arrow').exists()).toBe(false);
  });
});
