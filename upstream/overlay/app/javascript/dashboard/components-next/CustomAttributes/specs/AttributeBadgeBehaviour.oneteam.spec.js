/**
 * OneTeam behaviour spec for the custom attribute badge.
 *
 * Covers the pre-chat and resolution badges, falling back to resolution
 * for an unknown type, and the type validator.
 */
import { mount } from '@vue/test-utils';
import AttributeBadge from '../AttributeBadge.vue';

vi.mock('vue-i18n', async importOriginal => ({
  ...(await importOriginal()),
  useI18n: () => ({ t: key => key }),
}));

const Label = {
  name: 'Label',
  props: ['label', 'color'],
  template: '<span><slot name="icon" /></span>',
};
const Icon = { name: 'Icon', props: ['icon'], template: '<i />' };

/**
 * Mounts the badge.
 *
 * @param {object} props Badge props.
 * @returns {import('@vue/test-utils').VueWrapper} The mounted wrapper.
 */
const mountBadge = props =>
  mount(AttributeBadge, { props, global: { stubs: { Label, Icon } } });

describe('AttributeBadge behaviour', () => {
  it.each([
    [
      { type: 'pre-chat' },
      'ATTRIBUTES_MGMT.BADGES.PRE_CHAT',
      'i-lucide-message-circle',
    ],
    [{}, 'ATTRIBUTES_MGMT.BADGES.RESOLUTION', 'i-lucide-circle-check-big'],
    [
      { type: 'other' },
      'ATTRIBUTES_MGMT.BADGES.RESOLUTION',
      'i-lucide-circle-check-big',
    ],
  ])('labels %o', (props, label, icon) => {
    const wrapper = mountBadge(props);
    expect(wrapper.getComponent(Label).props()).toEqual({
      label,
      color: 'slate',
    });
    expect(wrapper.getComponent(Icon).props('icon')).toBe(icon);
  });

  it('validates the type', () => {
    const { validator } = AttributeBadge.props.type;
    expect(validator('pre-chat')).toBe(true);
    expect(validator('other')).toBe(false);
  });
});
