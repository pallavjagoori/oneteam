/**
 * OneTeam behaviour spec for the deprecated ui/Banner component.
 *
 * Covers the button classes, colour mapping, link rendering and the
 * primary and close button events.
 */
import { mount } from '@vue/test-utils';
import Banner from '../Banner.vue';

const NextButtonStub = {
  name: 'NextButton',
  props: { color: String, label: String },
  emits: ['click'],
  template: '<button @click="$emit(\'click\', $event)">{{ label }}</button>',
};

/**
 * Mounts Banner with a NextButton stub.
 *
 * @param {object} props component props
 * @returns {import('@vue/test-utils').VueWrapper}
 */
const mountBanner = props =>
  mount(Banner, {
    props: { bannerMessage: 'Heads up', ...props },
    global: {
      mocks: { $t: key => key },
      stubs: { NextButton: NextButtonStub },
    },
  });

describe('ui Banner behaviour', () => {
  it('renders the message without buttons or a link by default', () => {
    const wrapper = mountBanner({});
    expect(wrapper.text()).toContain('Heads up');
    expect(wrapper.find('a').exists()).toBe(false);
    expect(wrapper.classes()).not.toContain('has-button');
    expect(wrapper.vm.getButtonColor).toBe('blue');
  });

  it('renders the link when hrefLink is set', () => {
    const wrapper = mountBanner({ hrefLink: '/x', hrefLinkText: 'More' });
    expect(wrapper.find('a').attributes('href')).toBe('/x');
    expect(wrapper.find('a').text()).toBe('More');
  });

  it('maps the colour scheme and emits the primary action', async () => {
    const wrapper = mountBanner({
      colorScheme: 'alert',
      hasActionButton: true,
      actionButtonLabel: 'Fix',
    });
    expect(wrapper.classes()).toEqual(
      expect.arrayContaining(['alert', 'has-button'])
    );
    const button = wrapper.findComponent(NextButtonStub);
    expect(button.props('color')).toBe('ruby');
    await button.trigger('click');
    expect(wrapper.emitted('primaryAction')).toHaveLength(1);
  });

  it('emits close from the close button', async () => {
    const wrapper = mountBanner({
      colorScheme: 'warning',
      hasCloseButton: true,
    });
    expect(wrapper.classes()).toContain('has-button');
    expect(wrapper.vm.getButtonColor).toBe('amber');
    await wrapper.findComponent(NextButtonStub).trigger('click');
    expect(wrapper.emitted('close')).toHaveLength(1);
  });
});
