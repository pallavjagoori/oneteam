/**
 * OneTeam behaviour spec for the editor's video embed popover.
 *
 * Complements the upstream spec: picking a tab from the tab bar or the
 * arrow keys, positioning from either edge, clearing the error while typing,
 * choosing a file from the picker (and ignoring an empty choice), and
 * dropping nothing.
 */
import { mount } from '@vue/test-utils';
import VideoEmbedInput from '../VideoEmbedInput.vue';

vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: key => key }) }));

const Input = {
  name: 'Input',
  props: ['modelValue', 'messageType'],
  emits: ['update:modelValue', 'enter', 'input'],
  template: '<input class="url" />',
};
const TabBar = {
  name: 'TabBar',
  props: ['tabs', 'initialActiveTab'],
  emits: ['tabChanged'],
  template: '<div />',
};

/**
 * Mounts the popover with stubbed inputs.
 *
 * @param {object} props Popover props.
 * @returns {import('@vue/test-utils').VueWrapper} The mounted wrapper.
 */
const mountPopover = (props = {}) =>
  mount(VideoEmbedInput, {
    props,
    global: { stubs: { Input, TabBar, Button: true, Icon: true } },
  });

describe('VideoEmbedInput behaviour', () => {
  it('positions itself from the left edge', () => {
    const wrapper = mountPopover({ position: { top: 10, left: 20 } });
    expect(wrapper.attributes('style')).toContain('top: 10px');
    expect(wrapper.attributes('style')).toContain('left: 20px');
  });

  it('positions itself from the right edge', () => {
    const wrapper = mountPopover({ position: { top: 5, right: 0 } });
    expect(wrapper.attributes('style')).toContain('right: 0px');
  });

  it('swaps tabs with the arrow keys outside the link field', async () => {
    const wrapper = mountPopover();
    await wrapper.get('.url').trigger('keydown', { key: 'ArrowRight' });
    expect(wrapper.find('input[type="file"]').exists()).toBe(false);
    await wrapper.trigger('keydown', { key: 'ArrowRight' });
    expect(wrapper.find('input[type="file"]').exists()).toBe(true);
    await wrapper.trigger('keydown', { key: 'ArrowLeft' });
    expect(wrapper.find('.url').exists()).toBe(true);
    await wrapper.trigger('keydown', { key: 'Escape' });
    expect(wrapper.emitted('cancel')).toHaveLength(1);
  });

  it('clears the error while typing', async () => {
    const wrapper = mountPopover();
    const input = wrapper.getComponent(Input);
    input.vm.$emit('update:modelValue', 'not a video');
    input.vm.$emit('enter');
    await wrapper.vm.$nextTick();
    expect(input.props('messageType')).toBe('error');
    input.vm.$emit('input');
    await wrapper.vm.$nextTick();
    expect(input.props('messageType')).toBe('info');
  });

  it('switches tabs from the tab bar and uploads a picked file', async () => {
    const wrapper = mountPopover();
    wrapper.getComponent(TabBar).vm.$emit('tabChanged', { id: 'upload' });
    await wrapper.vm.$nextTick();
    const fileInput = wrapper.get('input[type="file"]');
    const file = new File(['x'], 'a.mp4', { type: 'video/mp4' });
    Object.defineProperty(fileInput.element, 'files', {
      value: [file],
      configurable: true,
    });
    await fileInput.trigger('change');
    expect(wrapper.emitted('upload')).toEqual([[file]]);

    Object.defineProperty(fileInput.element, 'files', {
      value: [],
      configurable: true,
    });
    await fileInput.trigger('change');
    await wrapper.get('button[type="button"]').trigger('drop');
    expect(wrapper.emitted('upload')).toHaveLength(1);
  });
});
