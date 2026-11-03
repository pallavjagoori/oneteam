/**
 * OneTeam behaviour spec for the Captain AddNewRulesDialog popover.
 *
 * Covers opening the popover, ignoring blank rules, adding a trimmed
 * rule, cancelling and closing on outside click.
 */
import { mount } from '@vue/test-utils';
import AddNewRulesDialog from '../AddNewRulesDialog.vue';

const outside = vi.hoisted(() => ({ handler: null }));

vi.mock('@vueuse/components', () => ({
  vOnClickOutside: {
    mounted: (el, binding) => {
      outside.handler = binding.value;
    },
  },
}));

vi.mock('@vueuse/core', async importOriginal => {
  const { ref: vueRef } = await import('vue');
  return {
    ...(await importOriginal()),
    useToggle: () => {
      const state = vueRef(false);
      return [
        state,
        value => {
          state.value = value;
        },
      ];
    },
  };
});

const InlineInputStub = {
  name: 'InlineInput',
  props: { modelValue: String },
  emits: ['update:modelValue', 'keyup'],
  template: '<input class="inline" @keyup.enter="$emit(\'keyup\', $event)" />',
};

/**
 * Mounts the dialog with a v-model wired to setProps.
 *
 * @param {string} modelValue initial rule text
 * @returns {import('@vue/test-utils').VueWrapper}
 */
const mountDialog = modelValue => {
  const wrapper = mount(AddNewRulesDialog, {
    props: {
      modelValue,
      buttonLabel: 'Add rule',
      confirmLabel: 'Save',
      cancelLabel: 'Cancel',
      'onUpdate:modelValue': value => wrapper.setProps({ modelValue: value }),
    },
    global: {
      stubs: {
        InlineInput: InlineInputStub,
        Button: {
          props: { label: String },
          emits: ['click'],
          template: '<button :data-label="label" @click="$emit(\'click\')" />',
        },
      },
    },
  });
  return wrapper;
};

/**
 * Opens the popover.
 *
 * @param {import('@vue/test-utils').VueWrapper} wrapper mounted dialog
 */
const open = async wrapper => {
  await wrapper.find('[data-label="Add rule"]').trigger('click');
};

describe('AddNewRulesDialog behaviour', () => {
  it('ignores a blank rule', async () => {
    const wrapper = mountDialog('   ');
    await open(wrapper);
    await wrapper.find('[data-label="Save"]').trigger('click');
    expect(wrapper.emitted('add')).toBeUndefined();
    expect(wrapper.find('.inline').exists()).toBe(true);
  });

  it('adds a trimmed rule from enter, clears it and closes', async () => {
    const wrapper = mountDialog('');
    await open(wrapper);
    wrapper
      .findComponent(InlineInputStub)
      .vm.$emit('update:modelValue', '  Be kind  ');
    await wrapper.vm.$nextTick();
    await wrapper.find('.inline').trigger('keyup.enter');
    expect(wrapper.emitted('add')).toEqual([['Be kind']]);
    expect(wrapper.props('modelValue')).toBe('');
    expect(wrapper.find('.inline').exists()).toBe(false);
  });

  it('handles an undefined value', async () => {
    const wrapper = mountDialog(undefined);
    await open(wrapper);
    wrapper.vm.$.setupState.onClickAdd();
    expect(wrapper.emitted('add')).toBeUndefined();
  });

  it('closes on cancel and on outside click', async () => {
    const wrapper = mountDialog('x');
    await open(wrapper);
    await wrapper.find('[data-label="Cancel"]').trigger('click');
    expect(wrapper.find('.inline').exists()).toBe(false);
    await open(wrapper);
    outside.handler();
    await wrapper.vm.$nextTick();
    expect(wrapper.find('.inline').exists()).toBe(false);
  });
});
