/**
 * Covers the lock-to-single-conversation choice cards.
 */
import { mount } from '@vue/test-utils';
import LockToSingleConversationPreview from '../LockToSingleConversationPreview.vue';

const RadioCard = {
  name: 'RadioCard',
  props: ['id', 'isActive'],
  emits: ['select'],
  template: '<div class="card" :data-active="isActive" />',
};

describe('LockToSingleConversationPreview', () => {
  it('marks the current choice and emits the picked one', () => {
    const wrapper = mount(LockToSingleConversationPreview, {
      props: { lockToSingleConversation: true },
      global: { stubs: { RadioCard }, mocks: { $t: key => key } },
    });
    const [disabled, enabled] = wrapper.findAllComponents(RadioCard);
    expect(disabled.props('isActive')).toBe(false);
    expect(enabled.props('isActive')).toBe(true);
    disabled.vm.$emit('select');
    enabled.vm.$emit('select');
    expect(wrapper.emitted('update')).toEqual([[false], [true]]);
  });
});
