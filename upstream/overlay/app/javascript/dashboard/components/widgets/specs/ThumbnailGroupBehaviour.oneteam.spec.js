/**
 * OneTeam behaviour spec for the stacked avatar group.
 *
 * Covers one avatar per user with its name, normal and tight overlap,
 * and the optional "more" count.
 */
import { mount } from '@vue/test-utils';
import ThumbnailGroup from '../ThumbnailGroup.vue';

const Avatar = {
  name: 'Avatar',
  props: ['name', 'size'],
  template: '<i />',
};
const mountGroup = props =>
  mount(ThumbnailGroup, {
    props: {
      usersList: [
        { id: 1, name: 'Ann' },
        { id: 2, name: 'Bo' },
      ],
      ...props,
    },
    global: { stubs: { Avatar }, directives: { tooltip: {} } },
  });

describe('ThumbnailGroup behaviour', () => {
  it('stacks avatars with a normal gap and no count', () => {
    const wrapper = mountGroup();
    const avatars = wrapper.findAllComponents(Avatar);
    expect(avatars.map(avatar => avatar.props('name'))).toEqual(['Ann', 'Bo']);
    expect(avatars[0].props('size')).toBe(24);
    expect(avatars[0].classes()).toContain('ltr:[&:not(:first-child)]:-ml-1');
    expect(wrapper.find('span').exists()).toBe(false);
  });

  it('stacks tightly with a more count', () => {
    const wrapper = mountGroup({
      gap: 'tight',
      showMoreThumbnailsCount: true,
      moreThumbnailsText: '+3',
    });
    expect(wrapper.findComponent(Avatar).classes()).toContain(
      'ltr:[&:not(:first-child)]:-ml-2'
    );
    const more = wrapper.find('span');
    expect(more.text()).toBe('+3');
    expect(more.classes()).toContain('ltr:-ml-2');
    expect(
      mountGroup({ showMoreThumbnailsCount: true }).find('span').classes()
    ).toContain('ltr:-ml-1');
  });
});
