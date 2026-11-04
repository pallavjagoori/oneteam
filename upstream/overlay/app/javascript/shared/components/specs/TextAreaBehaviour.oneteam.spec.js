/**
 * OneTeam behaviour spec for the shared TextArea.
 *
 * Covers the label, the error styling and message, and the v-model.
 */
import { mount } from '@vue/test-utils';
import TextArea from '../TextArea.vue';

describe('TextArea behaviour', () => {
  it('renders without a label or error', () => {
    const wrapper = mount(TextArea, { props: { modelValue: 'hi' } });
    expect(wrapper.find('.mb-2').exists()).toBe(false);
    expect(wrapper.find('textarea').element.value).toBe('hi');
    expect(wrapper.find('textarea').classes()).toContain('border-n-weak');
  });

  it('shows the label and error and emits updates', async () => {
    const wrapper = mount(TextArea, {
      props: { modelValue: '', label: 'Note', error: 'Required' },
    });
    expect(wrapper.find('.mb-2').classes()).toContain('text-n-ruby-9');
    expect(wrapper.text()).toContain('Required');
    await wrapper.find('textarea').setValue('typed');
    expect(wrapper.emitted('update:modelValue')).toEqual([['typed']]);
  });
});
