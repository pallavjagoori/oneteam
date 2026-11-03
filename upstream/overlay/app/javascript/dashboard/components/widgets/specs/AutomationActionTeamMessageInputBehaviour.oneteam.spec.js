/**
 * OneTeam behaviour spec for AutomationActionTeamMessageInput.
 *
 * Covers seeding from the model value (or nothing) and emitting team ids
 * and the message on change.
 */
import { mount } from '@vue/test-utils';
import AutomationActionTeamMessageInput from '../AutomationActionTeamMessageInput.vue';

const MultiSelectStub = {
  name: 'MultiSelect',
  props: { modelValue: Array },
  emits: ['update:modelValue'],
  template: '<div class="multi" />',
};

/**
 * Mounts the input.
 *
 * @param {object|null} modelValue initial model value
 * @returns {import('@vue/test-utils').VueWrapper}
 */
const mountInput = modelValue =>
  mount(AutomationActionTeamMessageInput, {
    props: { teams: [{ id: 1 }, { id: 2 }], modelValue },
    global: {
      mocks: { $t: key => key },
      stubs: { MultiSelect: MultiSelectStub },
    },
  });

describe('AutomationActionTeamMessageInput behaviour', () => {
  it('seeds the teams and message from the model value', async () => {
    const wrapper = mountInput({ team_ids: [{ id: 1 }], message: 'Hi' });
    await wrapper.vm.$nextTick();
    expect(wrapper.findComponent(MultiSelectStub).props('modelValue')).toEqual([
      { id: 1 },
    ]);
    expect(wrapper.find('textarea').element.value).toBe('Hi');
  });

  it('starts empty without a model value', () => {
    const wrapper = mountInput(null);
    expect(wrapper.vm.selectedTeams).toEqual([]);
    expect(wrapper.vm.message).toBe('');
  });

  it('emits team ids and the message on change', async () => {
    const wrapper = mountInput({});
    wrapper
      .findComponent(MultiSelectStub)
      .vm.$emit('update:modelValue', [{ id: 2 }]);
    await wrapper.find('textarea').setValue('Escalate');
    const emitted = wrapper.emitted('update:modelValue');
    expect(emitted[0]).toEqual([{ team_ids: [2], message: '' }]);
    expect(emitted[emitted.length - 1]).toEqual([
      { team_ids: [2], message: 'Escalate' },
    ]);
  });
});
