/**
 * OneTeam behaviour spec for the duplicate Instagram inbox banner.
 */
import { mount } from '@vue/test-utils';
import DuplicateInboxBanner from '../DuplicateInboxBanner.vue';

const Banner = {
  name: 'Banner',
  props: ['color'],
  template: '<div class="banner"><slot /></div>',
};

describe('DuplicateInboxBanner behaviour', () => {
  it('shows the warning in an amber banner', () => {
    const wrapper = mount(DuplicateInboxBanner, {
      props: { content: 'Already connected' },
      global: { stubs: { Banner, Icon: true } },
    });
    expect(wrapper.getComponent(Banner).props('color')).toBe('amber');
    expect(wrapper.text()).toBe('Already connected');
  });
});
