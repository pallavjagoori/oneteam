/**
 * OneTeam behaviour spec for the macro properties panel extras.
 *
 * Covers name updates (ignored when read only), the name error state,
 * read only visibility changes, and the save button.
 */
import { mount } from '@vue/test-utils';
import MacroProperties from '../MacroProperties.vue';

/**
 * Mounts the panel.
 *
 * @param {object} props props overrides
 * @param {boolean} hasError whether the name is invalid
 * @returns {import('@vue/test-utils').VueWrapper}
 */
const mountPanel = (props = {}, hasError = false) =>
  mount(MacroProperties, {
    props,
    global: {
      mocks: { $t: key => key },
      provide: { v$: { macro: { name: { $error: hasError } } } },
      stubs: {
        WootInput: {
          name: 'WootInput',
          props: ['error'],
          emits: ['update:modelValue'],
          template: '<input />',
        },
        NextButton: {
          name: 'NextButton',
          emits: ['click'],
          template: '<button class="save" @click="$emit(\'click\')" />',
        },
        Icon: true,
      },
    },
  });

describe('MacroProperties extras', () => {
  it('emits name updates and submits', async () => {
    const wrapper = mountPanel();
    wrapper
      .findComponent({ name: 'WootInput' })
      .vm.$emit('update:modelValue', 'New');
    await wrapper.find('.save').trigger('click');
    expect(wrapper.emitted('update:name')).toEqual([['New']]);
    expect(wrapper.emitted('submit')).toHaveLength(1);
    expect(
      wrapper.findComponent({ name: 'WootInput' }).props('error')
    ).toBeNull();
  });

  it('shows the name error', () => {
    const wrapper = mountPanel({}, true);
    expect(wrapper.findComponent({ name: 'WootInput' }).props('error')).toBe(
      'MACROS.ADD.FORM.NAME.ERROR'
    );
  });

  it('ignores edits when read only', () => {
    const wrapper = mountPanel({ readOnly: true });
    wrapper
      .findComponent({ name: 'WootInput' })
      .vm.$emit('update:modelValue', 'New');
    wrapper.vm.onUpdateVisibility('personal');
    expect(wrapper.emitted('update:name')).toBeUndefined();
    expect(wrapper.emitted('update:visibility')).toBeUndefined();
  });
});
