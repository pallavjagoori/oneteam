/**
 * OneTeam behaviour spec for the next-gen rich text field wrapper.
 *
 * Covers passing settings through to the editor, the label, the
 * character count and trimming text past the limit (not when there is
 * an actions slot or no count), the focus, error and disabled styles,
 * ignoring input, focus and blur while disabled, the info, error and
 * success messages, and forwarding Copilot actions.
 */
import { mount } from '@vue/test-utils';
import Editor from '../Editor.vue';

const WootEditor = {
  name: 'WootEditor',
  props: [
    'editorId',
    'modelValue',
    'placeholder',
    'disabled',
    'enableCannedResponses',
    'channelType',
  ],
  emits: ['input', 'focus', 'blur', 'executeCopilotAction'],
  template: '<div class="woot-editor" />',
};

const mountEditor = (props = {}, slots = {}) => {
  const wrapper = mount(Editor, {
    props: {
      modelValue: 'Hello',
      'onUpdate:modelValue': value => wrapper.setProps({ modelValue: value }),
      ...props,
    },
    slots,
    global: { stubs: { WootEditor } },
  });
  return wrapper;
};

const inner = wrapper => wrapper.findComponent(WootEditor);
const box = wrapper => wrapper.find('.editor-wrapper');

describe('next Editor behaviour', () => {
  it('passes settings through and counts characters', async () => {
    const wrapper = mountEditor({
      label: 'Reply',
      editorKey: 'reply',
      placeholder: 'Type',
      channelType: 'Channel::Email',
      maxLength: 10,
    });
    expect(wrapper.find('label').text()).toBe('Reply');
    expect(inner(wrapper).props()).toMatchObject({
      editorId: 'reply',
      modelValue: 'Hello',
      placeholder: 'Type',
      disabled: false,
      enableCannedResponses: true,
      channelType: 'Channel::Email',
    });
    expect(wrapper.find('.tabular-nums').text()).toBe('5 / 10');

    await inner(wrapper).vm.$emit('input', 'Hello you');
    expect(wrapper.find('.tabular-nums').text()).toBe('9 / 10');

    // The watcher truncates, then fires once more on the truncated value
    // because a value at the limit (>=) is "truncated" again to itself.
    await inner(wrapper).vm.$emit('input', 'Hello there, friend');
    expect(wrapper.emitted('update:modelValue').map(([v]) => v)).toEqual([
      'Hello you',
      'Hello there, friend',
      'Hello ther',
      'Hello ther',
    ]);
    expect(wrapper.find('.tabular-nums').text()).toBe('10 / 10');

    await inner(wrapper).vm.$emit('executeCopilotAction', 'improve', 'text');
    expect(wrapper.emitted('executeCopilotAction')[0]).toEqual([
      'improve',
      'text',
    ]);
  });

  it('keeps long text with an actions slot or without a count', async () => {
    const withActions = mountEditor(
      { maxLength: 3 },
      { actions: '<button class="act" />' }
    );
    expect(withActions.find('.act').exists()).toBe(true);
    expect(withActions.find('.tabular-nums').exists()).toBe(false);
    await inner(withActions).vm.$emit('input', 'Longer');
    expect(withActions.emitted('update:modelValue')).toEqual([['Longer']]);

    const noCount = mountEditor({ maxLength: 3, showCharacterCount: false });
    expect(noCount.find('.justify-end').exists()).toBe(false);
    await inner(noCount).vm.$emit('input', 'Longer');
    expect(noCount.emitted('update:modelValue')).toEqual([['Longer']]);
  });

  it('styles focus and error states and shows messages', async () => {
    const wrapper = mountEditor({ message: 'Required', messageType: 'error' });
    expect(box(wrapper).classes()).toContain('border-n-ruby-8');
    expect(wrapper.find('p').classes()).toContain('text-n-ruby-9');
    await inner(wrapper).vm.$emit('focus');
    expect(box(wrapper).classes()).toContain('border-n-brand');
    expect(box(wrapper).classes()).not.toContain('border-n-ruby-8');
    await inner(wrapper).vm.$emit('blur');
    expect(box(wrapper).classes()).not.toContain('border-n-brand');

    expect(
      mountEditor({ message: 'Saved', messageType: 'success' })
        .find('p')
        .classes()
    ).toContain('text-n-teal-10');
    const info = mountEditor({ message: 'Tip' });
    expect(info.find('p').classes()).toContain('text-n-slate-11');
    expect(box(info).classes()).toContain('border-n-weak');
    expect(mountEditor().find('p').exists()).toBe(false);
    expect(mountEditor().find('label').exists()).toBe(false);
  });

  it('ignores input, focus and blur while disabled', async () => {
    const wrapper = mountEditor({ disabled: true });
    expect(box(wrapper).classes()).toContain('cursor-not-allowed');
    await inner(wrapper).vm.$emit('input', 'Nope');
    await inner(wrapper).vm.$emit('focus');
    expect(wrapper.emitted('update:modelValue')).toBeUndefined();
    expect(box(wrapper).classes()).not.toContain('border-n-brand');
    await inner(wrapper).vm.$emit('blur');
  });
});
