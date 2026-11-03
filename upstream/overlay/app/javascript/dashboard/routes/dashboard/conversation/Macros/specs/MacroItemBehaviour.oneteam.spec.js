/**
 * OneTeam behaviour spec for a macro row in the conversation sidebar.
 *
 * Covers the macro name, toggling and click-away closing of the preview
 * (which also switches off the drag handle), and running the macro with
 * its loading state.
 */
import { mount } from '@vue/test-utils';
import MacroItem from '../MacroItem.vue';

const NextButton = {
  name: 'NextButton',
  props: { icon: String, isLoading: Boolean, disabled: Boolean },
  emits: ['click'],
  template: '<button :data-icon="icon" @click="$emit(\'click\')" />',
};
const MacroPreview = {
  name: 'MacroPreview',
  props: ['macro'],
  template: '<div class="preview" />',
};

/**
 * Mounts the row, capturing the click-away handler.
 *
 * @param {object} props Row props.
 * @returns {{ wrapper: import('@vue/test-utils').VueWrapper, clickaway: { fn: Function } }}
 *   The wrapper and the captured handler.
 */
const mountItem = props => {
  const clickaway = {};
  const wrapper = mount(MacroItem, {
    props: { macro: { id: 1, name: 'Close & tag' }, ...props },
    global: {
      stubs: { NextButton, MacroPreview, transition: false },
      directives: {
        tooltip: {},
        onClickaway: (el, binding) => {
          clickaway.fn = binding.value;
        },
      },
      mocks: { $t: key => key },
    },
  });
  return { wrapper, clickaway };
};

describe('MacroItem behaviour', () => {
  it('toggles the preview and closes it on click away', async () => {
    const { wrapper, clickaway } = mountItem();
    expect(wrapper.text()).toContain('Close & tag');
    expect(wrapper.classes()).toContain('drag-handle');
    const info = wrapper.get('[data-icon="i-lucide-info"]');
    await info.trigger('click');
    expect(wrapper.getComponent(MacroPreview).props('macro').id).toBe(1);
    expect(wrapper.classes()).toContain('cursor-default');
    await info.trigger('click');
    expect(wrapper.findComponent(MacroPreview).exists()).toBe(false);
    await info.trigger('click');
    clickaway.fn();
    await wrapper.vm.$nextTick();
    expect(wrapper.findComponent(MacroPreview).exists()).toBe(false);
  });

  it('runs the macro and shows it executing', async () => {
    const { wrapper } = mountItem({ isExecuting: true });
    const play = wrapper
      .findAllComponents(NextButton)
      .find(b => b.props('icon') === 'i-lucide-play');
    expect(play.props()).toMatchObject({ isLoading: true, disabled: true });
    await play.trigger('click');
    expect(wrapper.emitted('execute')).toHaveLength(1);
  });
});
