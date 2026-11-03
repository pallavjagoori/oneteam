/**
 * OneTeam behaviour spec for the Captain assistant form.
 *
 * Covers validation errors on an empty create, submitting the name,
 * description, product name and feature switches, cancelling, the busy
 * submit button, and prefilling (with default feature flags) in edit mode.
 */
import { ref } from 'vue';
import { mount, flushPromises } from '@vue/test-utils';
import AssistantForm from '../AssistantForm.vue';

const flags = ref({});

vi.mock('dashboard/composables/store', () => ({
  useMapGetter: () => flags,
}));

const field = name => ({
  name,
  props: ['modelValue', 'message', 'messageType'],
  emits: ['update:modelValue'],
  template: '<i />',
});
const Button = {
  name: 'Button',
  props: ['label', 'type', 'isLoading'],
  emits: ['click'],
  template:
    '<button :type="type" @click="$emit(\'click\')">{{ label }}</button>',
};

const mountForm = props =>
  mount(AssistantForm, {
    props,
    global: {
      stubs: { Input: field('Input'), Editor: field('Editor'), Button },
    },
  });

describe('AssistantForm behaviour', () => {
  beforeEach(() => {
    flags.value = {};
  });

  it('validates and submits a new assistant', async () => {
    const wrapper = mountForm({ mode: 'create' });
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    expect(wrapper.emitted('submit')).toBeUndefined();
    const [name, product] = wrapper.findAllComponents({ name: 'Input' });
    const editor = wrapper.findComponent({ name: 'Editor' });
    expect(name.props()).toMatchObject({
      message: 'CAPTAIN.ASSISTANTS.FORM.NAME.ERROR',
      messageType: 'error',
    });
    expect(editor.props('messageType')).toBe('error');
    expect(product.props('messageType')).toBe('error');

    name.vm.$emit('update:modelValue', 'Ava');
    editor.vm.$emit('update:modelValue', 'Helps');
    product.vm.$emit('update:modelValue', 'Acme');
    const boxes = wrapper.findAll('input[type="checkbox"]');
    await boxes[0].setValue(true);
    await boxes[2].setValue(true);
    expect(name.props('messageType')).toBe('info');
    expect(wrapper.find('button[type="submit"]').text()).toBe(
      'CAPTAIN.FORM.CREATE'
    );
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    expect(wrapper.emitted('submit')).toEqual([
      [
        {
          name: 'Ava',
          description: 'Helps',
          config: {
            product_name: 'Acme',
            feature_faq: true,
            feature_memory: false,
            feature_citation: true,
          },
        },
      ],
    ]);

    await wrapper.find('button[type="button"]').trigger('click');
    expect(wrapper.emitted('cancel')).toHaveLength(1);
  });

  it('prefills in edit mode and shows a busy button', async () => {
    flags.value = { creatingItem: true };
    const wrapper = mountForm({
      mode: 'edit',
      assistant: {
        name: 'Ava',
        description: 'Helps',
        config: { product_name: 'Acme', feature_memory: true },
      },
    });
    expect(wrapper.findComponent({ name: 'Input' }).props('modelValue')).toBe(
      'Ava'
    );
    const boxes = wrapper.findAll('input[type="checkbox"]');
    expect(boxes.map(box => box.element.checked)).toEqual([false, true, false]);
    const submit = wrapper.findAllComponents(Button)[1];
    expect(submit.props('isLoading')).toBe(true);
    expect(submit.text()).toBe('CAPTAIN.FORM.EDIT');

    await wrapper.setProps({
      assistant: {
        name: 'Ava',
        config: { feature_faq: true, feature_citation: true },
      },
    });
    expect(boxes.map(box => box.element.checked)).toEqual([true, false, true]);
    await wrapper.setProps({ assistant: null });
    expect(wrapper.findComponent({ name: 'Input' }).props('modelValue')).toBe(
      'Ava'
    );
    wrapper.vm.updateStateFromAssistant(null);
    expect(wrapper.vm.state.name).toBe('Ava');
  });
});
