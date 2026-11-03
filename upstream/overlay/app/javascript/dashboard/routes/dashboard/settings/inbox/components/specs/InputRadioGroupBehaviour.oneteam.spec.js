/**
 * Covers the inbox radio group: rendering items and calling the action
 * with the picked item marked checked.
 */
import { mount } from '@vue/test-utils';
import InputRadioGroup from '../InputRadioGroup.vue';

describe('InputRadioGroup', () => {
  it('calls the action with the picked item', async () => {
    const action = vi.fn();
    const wrapper = mount(InputRadioGroup, {
      props: {
        name: 'mode',
        label: 'Mode',
        items: [
          { id: 1, title: 'One', checked: true },
          { id: 2, title: 'Two', checked: false },
        ],
        action,
      },
    });
    expect(wrapper.find('.radio-group-label').text()).toBe('Mode');
    const inputs = wrapper.findAll('input');
    expect(inputs[0].element.checked).toBe(true);
    await inputs[1].trigger('change');
    expect(action).toHaveBeenCalledWith({ id: 2, title: 'Two', checked: true });
  });

  it('defaults to a no-op action', async () => {
    const wrapper = mount(InputRadioGroup, {
      props: { items: [{ id: 1, title: 'One' }] },
    });
    await wrapper.find('input').trigger('change');
    expect(wrapper.find('span').text()).toBe('One');
  });
});
