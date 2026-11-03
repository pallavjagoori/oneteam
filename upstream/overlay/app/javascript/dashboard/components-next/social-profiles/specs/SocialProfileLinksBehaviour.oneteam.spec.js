/**
 * OneTeam behaviour spec for the contact social profile links.
 *
 * Covers linking known networks from handles or URLs with their icons,
 * a generic icon for other networks given a full URL, dropping unsafe or
 * empty links, and rendering nothing without profiles.
 */
import { mount } from '@vue/test-utils';
import SocialProfileLinks from '../SocialProfileLinks.vue';

const Icon = { name: 'Icon', props: ['icon'], template: '<i />' };

/**
 * Mounts the links for the given profiles.
 *
 * @param {object} profiles Social profiles by network.
 * @returns {import('@vue/test-utils').VueWrapper} The mounted wrapper.
 */
const mountLinks = profiles =>
  mount(SocialProfileLinks, {
    props: profiles ? { profiles } : {},
    global: { stubs: { Icon }, directives: { tooltip: {} } },
  });

describe('SocialProfileLinks behaviour', () => {
  it('links known and custom networks and drops unsafe ones', () => {
    const wrapper = mountLinks({
      github: 'octocat',
      mastodon: 'https://social.test/@me',
      facebook: '',
      other: 'handle-only',
    });
    const links = wrapper.findAll('a');
    expect(links.map(a => a.attributes('href'))).toEqual([
      'https://github.com/octocat',
      'https://social.test/@me',
    ]);
    expect(wrapper.findAllComponents(Icon).map(i => i.props('icon'))).toEqual([
      'i-ri-github-fill',
      'i-lucide-link',
    ]);
  });

  it('renders nothing without profiles', () => {
    expect(mountLinks().find('div').exists()).toBe(false);
  });
});
