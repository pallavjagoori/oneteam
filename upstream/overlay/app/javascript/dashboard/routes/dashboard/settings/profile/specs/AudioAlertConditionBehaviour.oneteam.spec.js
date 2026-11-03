/**
 * Covers the audio alert condition list, which forwards checkbox changes.
 */
import { mount } from '@vue/test-utils';
import AudioAlertCondition from '../AudioAlertCondition.vue';

describe('AudioAlertCondition', () => {
  it('renders each condition and forwards changes', async () => {
    const wrapper = mount(AudioAlertCondition, {
      props: {
        label: 'Alert when',
        items: [
          { id: 1, value: 'tab_hidden', label: 'Tab hidden', model: false },
        ],
      },
    });
    expect(wrapper.text()).toContain('Tab hidden');
    await wrapper.find('input').setValue(true);
    expect(wrapper.emitted('change')).toEqual([['tab_hidden', true]]);
  });
});
