/**
 * OneTeam behaviour spec for the inbox settings SingleSelectDropdown.
 *
 * Covers the label, the options, and calling the action on change.
 */
import { mount } from '@vue/test-utils';
import SingleSelectDropdown from '../SingleSelectDropdown.vue';

describe('SingleSelectDropdown behaviour', () => {
  it('renders options and calls the action with the new value', async () => {
    const action = vi.fn();
    const wrapper = mount(SingleSelectDropdown, {
      props: {
        label: 'Pick',
        selected: 'One',
        action,
        options: [
          { key: 1, value: 'One' },
          { key: 2, value: 'Two' },
        ],
      },
    });
    expect(wrapper.find('label').text()).toBe('Pick');
    expect(wrapper.findAll('option')).toHaveLength(2);
    await wrapper.find('select').setValue('Two');
    expect(action).toHaveBeenCalledWith('Two');
  });

  it('uses the default action', async () => {
    const wrapper = mount(SingleSelectDropdown, {
      props: { options: [{ key: 1, value: 'One' }] },
    });
    await wrapper.find('select').setValue('One');
    expect(wrapper.vm.value).toBe('One');
  });

  it('renders no options by default', () => {
    expect(mount(SingleSelectDropdown).findAll('option')).toHaveLength(0);
  });
});
