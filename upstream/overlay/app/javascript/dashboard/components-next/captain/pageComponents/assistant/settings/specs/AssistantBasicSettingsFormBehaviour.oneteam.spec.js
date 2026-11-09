/**
 * OneTeam behaviour spec for the Captain assistant basic settings form.
 *
 * Covers loading the assistant into the form, field validation errors,
 * submitting the updated name, description, product name and feature
 * flags, and assistants without config.
 */
import { mount, flushPromises } from '@vue/test-utils';
import AssistantBasicSettingsForm from '../AssistantBasicSettingsForm.vue';

vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: key => key }) }));

const field = name => ({
  name,
  props: ['modelValue', 'message', 'messageType'],
  emits: ['update:modelValue'],
  template: '<div />',
});

/**
 * Mounts the form.
 *
 * @param {object} assistant assistant to edit
 * @returns {import('@vue/test-utils').VueWrapper}
 */
const mountForm = assistant =>
  mount(AssistantBasicSettingsForm, {
    props: { assistant },
    global: {
      stubs: {
        Input: field('Input'),
        Editor: field('Editor'),
        Button: {
          emits: ['click'],
          template: '<button @click="$emit(\'click\')" />',
        },
      },
    },
  });

describe('AssistantBasicSettingsForm behaviour', () => {
  it('loads the assistant and submits changes', async () => {
    const wrapper = mountForm({
      name: 'Ava',
      description: 'Helps',
      config: { product_name: 'Shop', feature_faq: true, temperature: 1 },
    });
    const [name, product] = wrapper.findAllComponents({ name: 'Input' });
    expect(name.props('modelValue')).toBe('Ava');
    expect(product.props('modelValue')).toBe('Shop');
    const boxes = wrapper.findAll('input[type="checkbox"]');
    expect(boxes.map(box => box.element.checked)).toEqual([
      true,
      false,
      false,
      false,
    ]);
    await boxes[1].setValue(true);
    await boxes[2].setValue(true);
    await boxes[3].setValue(true);
    name.vm.$emit('update:modelValue', 'Ava 2');
    await wrapper.find('button').trigger('click');
    await flushPromises();
    expect(wrapper.emitted('submit')).toEqual([
      [
        {
          name: 'Ava 2',
          description: 'Helps',
          config: {
            temperature: 1,
            product_name: 'Shop',
            feature_faq: true,
            feature_memory: true,
            feature_citation: true,
            feature_contact_attributes: true,
          },
        },
      ],
    ]);
  });

  it('shows errors and blocks submitting empty fields', async () => {
    const wrapper = mountForm({ name: '', description: '' });
    await wrapper.find('button').trigger('click');
    await flushPromises();
    expect(wrapper.emitted('submit')).toBeUndefined();
    const messages = [
      ...wrapper.findAllComponents({ name: 'Input' }),
      wrapper.findComponent({ name: 'Editor' }),
    ].map(input => input.props('messageType'));
    expect(messages).toEqual(['error', 'error', 'error']);
    await wrapper.setProps({ assistant: null });
    expect(wrapper.findComponent({ name: 'Input' }).props('modelValue')).toBe(
      ''
    );
  });
});
