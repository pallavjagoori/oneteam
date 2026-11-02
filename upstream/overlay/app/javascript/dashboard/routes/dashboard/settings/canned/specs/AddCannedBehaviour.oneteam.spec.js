/**
 * OneTeam behaviour spec for the "add canned response" modal.
 *
 * Covers prefilling the content (for example from a message), short code
 * and content validation (error styling and the disabled save button),
 * saving (loading state, success alert, form reset and close), failures
 * with and without a message, the default close handler and cancelling.
 */
import { flushPromises, mount } from '@vue/test-utils';
import AddCanned from '../AddCanned.vue';

const env = vi.hoisted(() => ({ alert: null }));

vi.mock('dashboard/composables', () => ({
  useAlert: (...args) => env.alert(...args),
}));

const NextButton = {
  name: 'NextButton',
  props: ['label', 'disabled', 'isLoading', 'type'],
  emits: ['click'],
  template:
    '<button :type="type" :disabled="disabled" :data-loading="isLoading" @click="$emit(\'click\', $event)">{{ label }}</button>',
};
const Modal = {
  name: 'Modal',
  props: ['show', 'onClose'],
  template: '<div class="modal"><slot /></div>',
};
const WootMessageEditor = {
  name: 'WootMessageEditor',
  props: ['modelValue'],
  emits: ['update:modelValue', 'blur'],
  template: '<div class="editor" />',
};

const mountAdd = (props = {}, dispatch = vi.fn(() => Promise.resolve())) => {
  const onClose = vi.fn();
  const wrapper = mount(AddCanned, {
    props: { onClose, ...props },
    global: {
      stubs: {
        NextButton,
        Modal,
        WootMessageEditor,
        WootModalHeader: { template: '<h2 />' },
      },
      mocks: { $store: { dispatch } },
    },
  });
  return { wrapper, onClose, dispatch };
};
const submit = wrapper => wrapper.find('button[type="submit"]');
const editor = wrapper => wrapper.findComponent(WootMessageEditor);

describe('Add canned response behaviour', () => {
  beforeEach(() => {
    env.alert = vi.fn();
  });

  it('prefills the content and validates both fields', async () => {
    const { wrapper } = mountAdd({ responseContent: 'Thanks!' });
    expect(editor(wrapper).props('modelValue')).toBe('Thanks!');
    expect(submit(wrapper).attributes('disabled')).toBeDefined();

    await wrapper.find('input').setValue('h');
    await wrapper.find('input').trigger('blur');
    expect(wrapper.findAll('label')[0].classes()).toContain('error');
    await wrapper.find('input').setValue('hi');
    expect(submit(wrapper).attributes('disabled')).toBeUndefined();

    editor(wrapper).vm.$emit('update:modelValue', '');
    editor(wrapper).vm.$emit('blur');
    await wrapper.vm.$nextTick();
    expect(wrapper.findAll('label')[1].classes()).toContain('error');
    expect(editor(wrapper).classes()).toContain('editor_warning');
  });

  it('saves, resets and closes', async () => {
    let finish;
    const dispatch = vi.fn(
      () =>
        new Promise(resolve => {
          finish = resolve;
        })
    );
    const { wrapper, onClose } = mountAdd({}, dispatch);
    expect(editor(wrapper).props('modelValue')).toBe('');
    await wrapper.find('input').setValue('thanks');
    editor(wrapper).vm.$emit('update:modelValue', 'Thank you!');
    await wrapper.find('form').trigger('submit');
    expect(dispatch).toHaveBeenCalledWith('createCannedResponse', {
      short_code: 'thanks',
      content: 'Thank you!',
    });
    expect(submit(wrapper).attributes('data-loading')).toBe('true');

    finish();
    await flushPromises();
    expect(env.alert).toHaveBeenCalledWith(
      'CANNED_MGMT.ADD.API.SUCCESS_MESSAGE'
    );
    expect(wrapper.find('input').element.value).toBe('');
    expect(submit(wrapper).attributes('data-loading')).toBe('false');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('reports failures', async () => {
    const dispatch = vi
      .fn()
      .mockRejectedValueOnce(new Error('Short code taken'))
      .mockRejectedValueOnce({});
    const { wrapper, onClose } = mountAdd({}, dispatch);
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    expect(env.alert).toHaveBeenLastCalledWith('Short code taken');
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    expect(env.alert).toHaveBeenLastCalledWith(
      'CANNED_MGMT.ADD.API.ERROR_MESSAGE'
    );
    expect(onClose).not.toHaveBeenCalled();
  });

  it('cancels, with a default close handler', async () => {
    const { wrapper, onClose } = mountAdd();
    await wrapper.find('button[type="reset"]').trigger('click');
    expect(onClose).toHaveBeenCalled();

    const fallback = mount(AddCanned, {
      global: {
        stubs: { NextButton, Modal, WootMessageEditor, WootModalHeader: true },
        mocks: { $store: { dispatch: vi.fn() } },
      },
    });
    await fallback.find('button[type="reset"]').trigger('click');
    expect(fallback.findComponent(Modal).props('show')).toBe(true);
  });
});
