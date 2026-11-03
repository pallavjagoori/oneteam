/**
 * OneTeam behaviour spec for the message signature editor.
 *
 * Covers loading the signature (and following prop changes, including a
 * missing value), saving a trimmed signature, and stripping inline images
 * with a warning.
 */
import { mount } from '@vue/test-utils';
import MessageSignature from '../MessageSignature.vue';
import { useAlert } from 'dashboard/composables';

vi.mock('dashboard/composables', () => ({ useAlert: vi.fn() }));
vi.mock('dashboard/helper/editorHelper', () => ({
  stripInlineBase64Images: content => ({
    sanitizedContent: content.replace('[img]', ''),
    hasInlineImages: content.includes('[img]'),
  }),
}));

const Editor = {
  name: 'WootMessageEditor',
  props: ['modelValue'],
  emits: ['update:modelValue'],
  template: '<div />',
};
const mountSignature = messageSignature =>
  mount(MessageSignature, {
    props: { messageSignature },
    global: {
      stubs: {
        WootMessageEditor: Editor,
        NextButton: { template: '<button />' },
      },
    },
  });

describe('MessageSignature behaviour', () => {
  it('loads, follows and saves the signature', async () => {
    const wrapper = mountSignature('Hi');
    const editor = wrapper.findComponent(Editor);
    expect(editor.props('modelValue')).toBe('Hi');
    await wrapper.setProps({ messageSignature: null });
    expect(editor.props('modelValue')).toBe('');
    await wrapper.find('form').trigger('submit');
    expect(wrapper.emitted('updateSignature')).toEqual([['']]);

    editor.vm.$emit('update:modelValue', '  Thanks [img] ');
    await wrapper.find('form').trigger('submit');
    expect(wrapper.emitted('updateSignature')[1]).toEqual(['Thanks']);
    expect(useAlert).toHaveBeenCalledWith(
      'PROFILE_SETTINGS.FORM.MESSAGE_SIGNATURE_SECTION.INLINE_IMAGE_WARNING'
    );
  });

  it('starts empty without a signature', () => {
    expect(mountSignature(null).findComponent(Editor).props('modelValue')).toBe(
      ''
    );
  });
});
