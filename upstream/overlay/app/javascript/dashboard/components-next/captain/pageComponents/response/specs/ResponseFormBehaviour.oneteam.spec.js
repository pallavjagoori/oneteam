/**
 * OneTeam behaviour spec for the Captain ResponseForm.
 *
 * Covers validation errors, submitting the question and answer, cancel,
 * prefilling in edit mode and the loading state.
 */
import { computed, ref } from 'vue';
import { mount, flushPromises } from '@vue/test-utils';
import ResponseForm from '../ResponseForm.vue';

const uiFlags = ref({ creatingItem: false });

vi.mock('dashboard/composables/store', () => ({
  useMapGetter: () => computed(() => uiFlags.value),
}));

vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: key => key }) }));

const fieldStub = name => ({
  name,
  props: { modelValue: String, message: String, messageType: String },
  emits: ['update:modelValue'],
  template: `<div class="${name}" />`,
});
const InputStub = fieldStub('Input');
const EditorStub = fieldStub('Editor');

/**
 * Mounts the form.
 *
 * @param {object} props component props
 * @returns {import('@vue/test-utils').VueWrapper}
 */
const mountForm = props =>
  mount(ResponseForm, {
    props: { mode: 'create', ...props },
    global: {
      stubs: {
        Input: InputStub,
        Editor: EditorStub,
        Button: {
          props: { label: String, isLoading: Boolean, type: String },
          emits: ['click'],
          template:
            '<button :type="type" :data-label="label" @click="$emit(\'click\')" />',
        },
      },
    },
  });

describe('ResponseForm behaviour', () => {
  beforeEach(() => {
    uiFlags.value = { creatingItem: false };
  });

  it('shows errors and does not submit an empty form', async () => {
    const wrapper = mountForm({});
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    expect(wrapper.emitted('submit')).toBeUndefined();
    expect(wrapper.findComponent(InputStub).props()).toMatchObject({
      message: 'CAPTAIN.RESPONSES.FORM.QUESTION.ERROR',
      messageType: 'error',
    });
    expect(wrapper.findComponent(EditorStub).props('messageType')).toBe(
      'error'
    );
  });

  it('submits the question and answer', async () => {
    const wrapper = mountForm({});
    wrapper.findComponent(InputStub).vm.$emit('update:modelValue', 'Hours?');
    wrapper.findComponent(EditorStub).vm.$emit('update:modelValue', '9 to 5');
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    expect(wrapper.emitted('submit')).toEqual([
      [{ question: 'Hours?', answer: '9 to 5' }],
    ]);
    expect(wrapper.findComponent(InputStub).props('messageType')).toBe('info');
  });

  it('emits cancel', async () => {
    const wrapper = mountForm({});
    await wrapper.find('[data-label="CAPTAIN.FORM.CANCEL"]').trigger('click');
    expect(wrapper.emitted('cancel')).toHaveLength(1);
  });

  it('prefills in edit mode and shows loading', () => {
    uiFlags.value = { creatingItem: true };
    const wrapper = mountForm({
      mode: 'edit',
      response: { question: 'Q', answer: 'A' },
    });
    expect(wrapper.findComponent(InputStub).props('modelValue')).toBe('Q');
    expect(wrapper.find('[data-label="CAPTAIN.FORM.EDIT"]').exists()).toBe(
      true
    );
  });

  it('ignores a null response in edit mode', () => {
    const wrapper = mountForm({ mode: 'edit', response: null });
    expect(wrapper.findComponent(InputStub).props('modelValue')).toBe('');
    wrapper.vm.$.setupState.updateStateFromResponse(null);
  });
});
