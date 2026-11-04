/**
 * OneTeam behaviour spec for the tag input single mode limit.
 *
 * A single mode input hides its text field once it holds a tag, so the
 * limit inside addTag is reached through the component's setup state.
 */
import { mount } from '@vue/test-utils';
import TagInput from '../TagInput.vue';

vi.mock('@vueuse/components', () => ({ vOnClickOutside: {} }));

describe('TagInput single mode limit', () => {
  it('clears the draft instead of adding a second tag', async () => {
    const wrapper = mount(TagInput, {
      props: { mode: 'single', modelValue: ['first'] },
      global: { stubs: { InlineInput: true, DropdownMenu: true } },
    });
    const state = wrapper.vm.$.setupState;
    state.newTag = 'second';
    await state.addTag();
    expect(state.newTag).toBe('');
    expect(wrapper.emitted('add')).toBeUndefined();
    expect(state.tags).toEqual(['first']);
  });

  it('ignores dropdown picks when full or without a dropdown', async () => {
    const full = mount(TagInput, {
      props: { mode: 'single', modelValue: ['first'], showDropdown: true },
      global: { stubs: { InlineInput: true, DropdownMenu: true } },
    });
    await full.vm.$.setupState.handleDropdownAction({ label: 'x' });
    const closed = mount(TagInput, {
      props: { modelValue: [], showDropdown: false },
      global: { stubs: { InlineInput: true, DropdownMenu: true } },
    });
    await closed.vm.$.setupState.handleDropdownAction({ label: 'x' });
    expect(full.emitted('add')).toBeUndefined();
    expect(closed.emitted('add')).toBeUndefined();
    expect(closed.vm.$.setupState.tags).toEqual([]);
  });
});
