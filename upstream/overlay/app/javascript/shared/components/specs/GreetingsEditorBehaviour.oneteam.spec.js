/**
 * OneTeam behaviour spec for the greetings message editor.
 *
 * Covers editing the greeting in the plain text area and in the rich
 * editor.
 */
import { mount } from '@vue/test-utils';
import GreetingsEditor from '../GreetingsEditor.vue';

/**
 * Builds a v-model stub.
 *
 * @param {string} name stub name
 * @returns {object}
 */
const field = name => ({
  name,
  props: ['modelValue'],
  emits: ['update:modelValue'],
  template: '<div />',
});

/**
 * Mounts the editor.
 *
 * @param {boolean} richtext whether to use the rich editor
 * @returns {import('@vue/test-utils').VueWrapper}
 */
const mountEditor = richtext =>
  mount(GreetingsEditor, {
    props: { modelValue: 'Hi', richtext },
    global: {
      stubs: {
        WootMessageEditor: field('WootMessageEditor'),
        ResizableTextArea: field('ResizableTextArea'),
      },
    },
  });

describe('GreetingsEditor behaviour', () => {
  it.each([
    [false, 'ResizableTextArea'],
    [true, 'WootMessageEditor'],
  ])('updates the greeting (rich text %s)', (richtext, name) => {
    const wrapper = mountEditor(richtext);
    const input = wrapper.findComponent({ name });
    expect(input.props('modelValue')).toBe('Hi');
    input.vm.$emit('update:modelValue', 'Hello');
    expect(wrapper.emitted('update:modelValue')).toEqual([['Hello']]);
  });
});
