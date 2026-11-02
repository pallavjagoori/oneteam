/**
 * OneTeam behaviour spec for the edit label dialog.
 *
 * Covers filling the form from the selected label, title validation
 * (required, too short, spaces), saving a lowercased title with
 * the colour, description and sidebar flag (alert, then close shortly
 * after), a failed save, the saving state and Cancel.
 *
 * Chatwoot quirk: getLabelTitleErrorMessage checks the vuelidate rule
 * objects (always truthy) rather than their results, so the title field
 * gets the error class but never an error message.
 */
import { flushPromises, mount } from '@vue/test-utils';
import { useAlert } from 'dashboard/composables';
import EditLabel from '../EditLabel.vue';

vi.mock('dashboard/composables', () => ({ useAlert: vi.fn() }));

const WootInput = {
  name: 'WootInput',
  props: ['modelValue', 'error', 'label'],
  emits: ['update:modelValue', 'input', 'blur'],
  template: '<div class="field" />',
};
const ColorPicker = {
  name: 'WootColorPicker',
  props: ['modelValue'],
  emits: ['update:modelValue'],
  template: '<div class="color" />',
};
const NextButton = {
  name: 'NextButton',
  props: ['label', 'type', 'disabled', 'isLoading'],
  emits: ['click'],
  template:
    '<button :type="type" @click="$emit(\'click\', $event)">{{ label }}</button>',
};

const label = {
  id: 3,
  title: 'billing',
  description: 'Money',
  show_on_sidebar: false,
  color: '#ff0000',
};

const mountDialog = (uiFlags = { isUpdating: false }) => {
  const dispatch = vi.fn().mockResolvedValue();
  const wrapper = mount(EditLabel, {
    props: { selectedResponse: label },
    global: {
      mocks: {
        $store: { getters: { 'labels/getUIFlags': uiFlags }, dispatch },
      },
      stubs: {
        WootModalHeader: {
          props: ['headerTitle'],
          template: '<h2>{{ headerTitle }}</h2>',
        },
        WootInput,
        WootColorPicker: ColorPicker,
        NextButton,
      },
    },
  });
  return { wrapper, dispatch };
};

const titleInput = wrapper => wrapper.findAllComponents(WootInput)[0];
const save = wrapper => wrapper.findAllComponents(NextButton)[1];

describe('EditLabel behaviour', () => {
  beforeEach(() => {
    useAlert.mockClear();
  });

  it('fills the form and flags an invalid title', async () => {
    const { wrapper } = mountDialog();
    await wrapper.vm.$nextTick();
    expect(wrapper.find('h2').text()).toBe('LABEL_MGMT.EDIT.TITLE - billing');
    const inputs = wrapper.findAllComponents(WootInput);
    expect(inputs.map(i => i.props('modelValue'))).toEqual([
      'billing',
      'Money',
    ]);
    expect(wrapper.findComponent(ColorPicker).props('modelValue')).toBe(
      '#ff0000'
    );
    expect(wrapper.find('input[type="checkbox"]').element.checked).toBe(false);
    expect(titleInput(wrapper).props('error')).toBe('');

    const touch = async value => {
      await titleInput(wrapper).vm.$emit('update:modelValue', value);
      await titleInput(wrapper).vm.$emit('input');
    };
    await touch('');
    expect(titleInput(wrapper).classes()).toContain('error');
    expect(titleInput(wrapper).props('error')).toBe('');
    expect(save(wrapper).props('disabled')).toBe(true);
    await touch('a');
    expect(save(wrapper).props('disabled')).toBe(true);
    await touch('two words');
    expect(save(wrapper).props('disabled')).toBe(true);
    await touch('fine');
    expect(titleInput(wrapper).classes()).not.toContain('error');
    expect(save(wrapper).props('disabled')).toBe(false);
    await titleInput(wrapper).vm.$emit('blur');
    await wrapper.findAllComponents(WootInput)[1].vm.$emit('input');
    await wrapper.findAllComponents(WootInput)[1].vm.$emit('blur');
    expect(wrapper.findAllComponents(WootInput)[1].classes()).not.toContain(
      'error'
    );
  });

  it('saves the label and closes shortly after', async () => {
    vi.useFakeTimers();
    const { wrapper, dispatch } = mountDialog();
    await titleInput(wrapper).vm.$emit('update:modelValue', 'VIP');
    await wrapper
      .findAllComponents(WootInput)[1]
      .vm.$emit('update:modelValue', 'Top');
    await wrapper
      .findComponent(ColorPicker)
      .vm.$emit('update:modelValue', '#00f');
    await wrapper.find('input[type="checkbox"]').setValue(true);
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    expect(dispatch).toHaveBeenCalledWith('labels/update', {
      id: 3,
      color: '#00f',
      description: 'Top',
      title: 'vip',
      show_on_sidebar: true,
    });
    expect(useAlert).toHaveBeenCalledWith(
      'LABEL_MGMT.EDIT.API.SUCCESS_MESSAGE'
    );
    expect(wrapper.emitted('close')).toBeUndefined();
    vi.advanceTimersByTime(10);
    expect(wrapper.emitted('close')).toHaveLength(1);
    vi.useRealTimers();
  });

  it('reports a failed save, shows saving and cancels', async () => {
    const { wrapper, dispatch } = mountDialog({ isUpdating: true });
    expect(save(wrapper).props()).toMatchObject({
      disabled: true,
      isLoading: true,
    });
    dispatch.mockRejectedValueOnce(new Error('taken'));
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    expect(useAlert).toHaveBeenCalledWith('LABEL_MGMT.EDIT.API.ERROR_MESSAGE');

    await wrapper.findAllComponents(NextButton)[0].trigger('click');
    expect(wrapper.emitted('close')).toHaveLength(1);
  });
});
