/**
 * OneTeam behaviour spec for the add label dialog.
 *
 * Covers the random starting colour and lowercased prefilled title,
 * title validation (the error class and the disabled create button),
 * touching fields on input and blur, creating a label with a lowercased
 * title, colour, description and sidebar flag (alert and close), the
 * server's error message or the fallback, the saving state and Cancel.
 */
import { flushPromises, mount } from '@vue/test-utils';
import { useAlert } from 'dashboard/composables';
import AddLabel from '../AddLabel.vue';

vi.mock('dashboard/composables', () => ({ useAlert: vi.fn() }));
vi.mock('dashboard/helper/labelColor', () => ({
  getRandomColor: () => '#123456',
}));

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

const mountDialog = (prefillTitle = '', uiFlags = { isCreating: false }) => {
  const dispatch = vi.fn().mockResolvedValue();
  const wrapper = mount(AddLabel, {
    props: { prefillTitle },
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

const inputs = wrapper => wrapper.findAllComponents(WootInput);
const create = wrapper => wrapper.findAllComponents(NextButton)[1];
const submit = async wrapper => {
  await wrapper.find('form').trigger('submit');
  await flushPromises();
};

describe('AddLabel behaviour', () => {
  beforeEach(() => {
    useAlert.mockClear();
  });

  it('starts from the prefilled title and creates the label', async () => {
    const { wrapper, dispatch } = mountDialog('Billing');
    await wrapper.vm.$nextTick();
    expect(wrapper.find('h2').text()).toBe('LABEL_MGMT.ADD.TITLE');
    expect(inputs(wrapper)[0].props('modelValue')).toBe('billing');
    expect(wrapper.findComponent(ColorPicker).props('modelValue')).toBe(
      '#123456'
    );
    expect(create(wrapper).props('disabled')).toBe(false);

    await inputs(wrapper)[0].vm.$emit('update:modelValue', 'VIP');
    await inputs(wrapper)[1].vm.$emit('update:modelValue', 'Top customers');
    await inputs(wrapper)[1].vm.$emit('input');
    await inputs(wrapper)[1].vm.$emit('blur');
    await wrapper
      .findComponent(ColorPicker)
      .vm.$emit('update:modelValue', '#ff0000');
    await wrapper.find('input[type="checkbox"]').setValue(false);
    await submit(wrapper);
    expect(dispatch).toHaveBeenCalledWith('labels/create', {
      color: '#ff0000',
      description: 'Top customers',
      title: 'vip',
      show_on_sidebar: false,
    });
    expect(useAlert).toHaveBeenCalledWith('LABEL_MGMT.ADD.API.SUCCESS_MESSAGE');
    expect(wrapper.emitted('close')).toHaveLength(1);
  });

  it('flags an invalid title', async () => {
    const { wrapper } = mountDialog();
    expect(create(wrapper).props('disabled')).toBe(true);
    await inputs(wrapper)[0].vm.$emit('update:modelValue', 'two words');
    await inputs(wrapper)[0].vm.$emit('input');
    await inputs(wrapper)[0].vm.$emit('blur');
    expect(inputs(wrapper)[0].classes()).toContain('error');
    expect(create(wrapper).props('disabled')).toBe(true);
  });

  it('reports a failed save', async () => {
    const { wrapper, dispatch } = mountDialog('vip');
    dispatch.mockRejectedValueOnce(new Error('Title taken'));
    await submit(wrapper);
    expect(useAlert).toHaveBeenCalledWith('Title taken');
    dispatch.mockRejectedValueOnce({});
    await submit(wrapper);
    expect(useAlert).toHaveBeenCalledWith('LABEL_MGMT.ADD.API.ERROR_MESSAGE');
    expect(wrapper.emitted('close')).toBeUndefined();
  });

  it('shows the saving state and cancels', async () => {
    const { wrapper } = mountDialog('vip', { isCreating: true });
    expect(create(wrapper).props()).toMatchObject({
      disabled: true,
      isLoading: true,
    });
    await wrapper.findAllComponents(NextButton)[0].trigger('click');
    expect(wrapper.emitted('close')).toHaveLength(1);
  });
});
