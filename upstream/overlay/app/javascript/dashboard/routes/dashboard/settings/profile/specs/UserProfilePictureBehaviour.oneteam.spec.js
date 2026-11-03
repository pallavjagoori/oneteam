/**
 * Covers the profile picture field, which forwards avatar upload and delete.
 */
import { mount } from '@vue/test-utils';
import UserProfilePicture from '../UserProfilePicture.vue';

const Avatar = {
  name: 'Avatar',
  props: ['src', 'name'],
  emits: ['upload', 'delete'],
  template: '<div />',
};

describe('UserProfilePicture', () => {
  it('forwards upload and delete', () => {
    const wrapper = mount(UserProfilePicture, {
      props: { src: 'https://cdn.example.test/me.png', name: 'Ann' },
      global: { stubs: { Avatar }, mocks: { $t: key => key } },
    });
    const avatar = wrapper.getComponent(Avatar);
    expect(avatar.props()).toEqual({
      src: 'https://cdn.example.test/me.png',
      name: 'Ann',
    });
    avatar.vm.$emit('upload', { file: 'x' });
    avatar.vm.$emit('delete');
    expect(wrapper.emitted('change')).toEqual([[{ file: 'x' }]]);
    expect(wrapper.emitted('delete')).toHaveLength(1);
  });
});
