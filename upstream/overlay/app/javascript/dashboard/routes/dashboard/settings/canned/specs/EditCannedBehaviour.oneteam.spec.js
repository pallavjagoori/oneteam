/**
 * OneTeam behaviour spec for the "edit canned response" modal.
 *
 * Covers the title with the original short code, prefilled fields,
 * short code and content validation (error styling and the disabled
 * save button), saving (loading state, success alert, form reset and the
 * delayed close), failures with and without a server message, the
 * legacy setPageName helper and cancelling.
 */
import { flushPromises, mount } from '@vue/test-utils';
import EditCanned from '../EditCanned.vue';

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
const WootModalHeader = {
  name: 'WootModalHeader',
  props: ['headerTitle'],
  template: '<h2>{{ headerTitle }}</h2>',
};

const mountEdit = (props = {}, dispatch = vi.fn(() => Promise.resolve())) => {
  const onClose = vi.fn();
  const wrapper = mount(EditCanned, {
    props: { id: 4, edshortCode: 'hi', edcontent: 'Hello there', onClose, ...props },
    global: {
      stubs: { NextButton, Modal, WootMessageEditor, WootModalHeader },
      mocks: { $t: key => key, $store: { dispatch } },
    },
  });
  return { wrapper, onClose, dispatch };
};
const submit = wrapper => wrapper.find('button[type="submit"]');
const editor = wrapper => wrapper.findComponent(WootMessageEditor);

describe('Edit canned response behaviour', () => {
  beforeEach(() => {
    env.alert = vi.fn();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('prefills the form and validates both fields', async () => {
    const { wrapper } = mountEdit();
    expect(wrapper.find('h2').text()).toBe('CANNED_MGMT.EDIT.TITLE - hi');
    expect(wrapper.find('input').element.value).toBe('hi');
    expect(editor(wrapper).props('modelValue')).toBe('Hello there');
    expect(submit(wrapper).attributes('disabled')).toBeUndefined();

    await wrapper.find('input').setValue('h');
    expect(wrapper.findAll('label')[0].classes()).toContain('error');
    expect(submit(wrapper).attributes('disabled')).toBeDefined();

    editor(wrapper).vm.$emit('update:modelValue', '');
    editor(wrapper).vm.$emit('blur');
    await wrapper.vm.$nextTick();
    expect(wrapper.findAll('label')[1].classes()).toContain('error');
    expect(editor(wrapper).classes()).toContain('editor_warning');

    wrapper.vm.setPageName({ name: 'From page' });
    await wrapper.vm.$nextTick();
    expect(editor(wrapper).props('modelValue')).toBe('From page');
  });

  it('saves, resets the form and closes shortly after', async () => {
    vi.useFakeTimers();
    let resolve;
    const dispatch = vi.fn(
      () =>
        new Promise(r => {
          resolve = r;
        })
    );
    const { wrapper, onClose } = mountEdit({}, dispatch);
    await wrapper.find('input').setValue('hey');
    await wrapper.find('form').trigger('submit');
    expect(dispatch).toHaveBeenCalledWith('updateCannedResponse', {
      id: 4,
      short_code: 'hey',
      content: 'Hello there',
    });
    expect(submit(wrapper).attributes('data-loading')).toBe('true');
    expect(submit(wrapper).attributes('disabled')).toBeDefined();
    resolve();
    await flushPromises();
    expect(env.alert).toHaveBeenCalledWith('CANNED_MGMT.EDIT.API.SUCCESS_MESSAGE');
    expect(wrapper.find('input').element.value).toBe('');
    expect(wrapper.findAll('label')[0].classes()).not.toContain('error');
    expect(onClose).not.toHaveBeenCalled();
    vi.advanceTimersByTime(10);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('shows the server error or a fallback when saving fails', async () => {
    const dispatch = vi
      .fn()
      .mockRejectedValueOnce(new Error('Short code taken'))
      .mockRejectedValueOnce({});
    const { wrapper } = mountEdit({}, dispatch);
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    expect(env.alert.mock.calls).toEqual([
      ['Short code taken'],
      ['CANNED_MGMT.EDIT.API.ERROR_MESSAGE'],
    ]);
    expect(submit(wrapper).attributes('data-loading')).toBe('false');
  });

  it('closes from the cancel button', async () => {
    const { wrapper, onClose } = mountEdit();
    await wrapper.find('button[type="reset"]').trigger('click');
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
