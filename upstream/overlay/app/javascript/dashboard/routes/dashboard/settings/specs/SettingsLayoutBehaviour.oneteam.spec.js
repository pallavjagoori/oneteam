/**
 * OneTeam behaviour spec for the legacy settings list layout.
 *
 * Covers the header and pre-body slots, the loading state (default and
 * custom), the no-records message, the body, and extra content.
 */
import { mount } from '@vue/test-utils';
import SettingsLayout from '../SettingsLayout.vue';

const WootLoadingState = {
  name: 'WootLoadingState',
  props: ['message'],
  template: '<p class="loading">{{ message }}</p>',
};

/**
 * Mounts the layout with every slot filled.
 *
 * @param {object} props Layout props.
 * @param {object} slots Extra slots.
 * @returns {import('@vue/test-utils').VueWrapper} The mounted wrapper.
 */
const mountLayout = (props, slots = {}) =>
  mount(SettingsLayout, {
    props,
    slots: {
      header: '<h1>Agents</h1>',
      preBody: '<p class="pre">Pre</p>',
      body: '<p class="body">Rows</p>',
      default: '<p class="extra">Extra</p>',
      ...slots,
    },
    global: { stubs: { WootLoadingState } },
  });

describe('SettingsLayout behaviour', () => {
  it('shows the body with header, pre-body and extra content', () => {
    const wrapper = mountLayout({});
    expect(wrapper.get('h1').text()).toBe('Agents');
    expect(wrapper.find('.pre').exists()).toBe(true);
    expect(wrapper.find('.body').exists()).toBe(true);
    expect(wrapper.find('.extra').exists()).toBe(true);
  });

  it('shows the default or a custom loading state', () => {
    const wrapper = mountLayout({ isLoading: true, loadingMessage: 'Loading' });
    expect(wrapper.get('.loading').text()).toBe('Loading');
    expect(wrapper.find('.body').exists()).toBe(false);
    const custom = mountLayout(
      { isLoading: true },
      { loading: '<p class="custom">Wait</p>' }
    );
    expect(custom.find('.custom').exists()).toBe(true);
    expect(custom.find('.loading').exists()).toBe(false);
  });

  it('shows the no-records message', () => {
    const wrapper = mountLayout({
      noRecordsFound: true,
      noRecordsMessage: 'No agents',
    });
    expect(wrapper.text()).toContain('No agents');
    expect(wrapper.find('.body').exists()).toBe(false);
  });
});
