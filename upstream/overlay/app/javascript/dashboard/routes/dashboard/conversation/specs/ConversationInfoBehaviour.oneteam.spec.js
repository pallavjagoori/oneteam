/**
 * OneTeam behaviour spec for the conversation information panel.
 *
 * Covers which static attributes are shown, the initiated at time
 * (parsed, unparseable, missing), browser and platform names, and the
 * referer link.
 */
import { mount } from '@vue/test-utils';
import ConversationInfo from '../ConversationInfo.vue';

vi.mock('shared/composables/useExactTimestamp', () => ({
  useExactTimestamp: () => unix => `at ${unix}`,
}));

const CustomAttributes = {
  name: 'CustomAttributes',
  props: ['staticElements'],
  template:
    '<div><template v-for="element in staticElements" :key="element.key"><slot name="staticItem" :element="element" /></template></div>',
};
const ContactDetailsItem = {
  name: 'ContactDetailsItem',
  props: ['title', 'value'],
  template: '<section :data-title="title"><slot /></section>',
};

/**
 * Mounts the panel.
 *
 * @param {object} props component props
 * @returns {import('@vue/test-utils').VueWrapper}
 */
const mountInfo = props =>
  mount(ConversationInfo, {
    props,
    global: {
      mocks: { $t: key => key },
      stubs: { CustomAttributes, ContactDetailsItem },
    },
  });

/**
 * Lists the shown items as title and value pairs.
 *
 * @param {import('@vue/test-utils').VueWrapper} wrapper mounted panel
 * @returns {Array<Array<string>>}
 */
const items = wrapper =>
  wrapper
    .findAllComponents(ContactDetailsItem)
    .map(item => [item.props('title'), item.props('value')]);

describe('ConversationInfo behaviour', () => {
  it('shows every known attribute with a referer link', () => {
    const wrapper = mountInfo({
      conversationAttributes: {
        initiated_at: { timestamp: '2026-01-01T00:00:00Z' },
        browser_language: 'en',
        referer: 'https://shop.test',
        browser: {
          browser_name: 'Firefox',
          browser_version: '140',
          platform_name: 'Linux',
          platform_version: '6',
        },
      },
      contactAttributes: { created_at_ip: '10.0.0.1' },
    });
    expect(items(wrapper)).toEqual([
      ['CONTACT_PANEL.INITIATED_AT', 'at 1767225600'],
      ['CONTACT_PANEL.BROWSER_LANGUAGE', 'English'],
      ['CONTACT_PANEL.INITIATED_FROM', 'https://shop.test'],
      ['CONTACT_PANEL.BROWSER', 'Firefox 140'],
      ['CONTACT_PANEL.OS', 'Linux 6'],
      ['CONTACT_PANEL.IP_ADDRESS', '10.0.0.1'],
    ]);
    expect(wrapper.find('a').attributes('href')).toBe('https://shop.test');
  });

  it('keeps unparseable times and fills missing browser parts', () => {
    const wrapper = mountInfo({
      conversationAttributes: {
        initiated_at: { timestamp: 'sometime' },
        browser: {},
      },
    });
    expect(items(wrapper)).toEqual([
      ['CONTACT_PANEL.INITIATED_AT', 'sometime'],
      ['CONTACT_PANEL.BROWSER', ' '],
      ['CONTACT_PANEL.OS', ' '],
    ]);
  });

  it('shows nothing without attributes', () => {
    expect(items(mountInfo())).toEqual([]);
  });
});
