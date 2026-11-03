/**
 * OneTeam behaviour spec for ToggleCopilotAssistant.
 *
 * Covers the trigger label, the active check mark and choosing an
 * assistant.
 */
import { mount } from '@vue/test-utils';
import ToggleCopilotAssistant from '../ToggleCopilotAssistant.vue';

vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: key => key }) }));

const ButtonStub = {
  name: 'NextButton',
  props: { label: String },
  emits: ['click'],
  template:
    '<button class="trigger" @click="$emit(\'click\')">{{ label }}</button>',
};

const assistants = [
  { id: 1, name: 'Alpha', description: 'First' },
  { id: 2, name: 'Beta', description: 'Second' },
];

/**
 * Mounts the toggle with dropdown stubs.
 *
 * @param {object|null} activeAssistant active assistant
 * @returns {import('@vue/test-utils').VueWrapper}
 */
const mountToggle = activeAssistant =>
  mount(ToggleCopilotAssistant, {
    props: { assistants, activeAssistant },
    global: {
      stubs: {
        Button: ButtonStub,
        DropdownContainer: {
          template:
            '<div><slot name="trigger" :toggle="() => {}" :is-open="true" /><slot /></div>',
        },
        DropdownBody: { template: '<div><slot /></div>' },
        DropdownSection: { template: '<div><slot /></div>' },
        DropdownItem: {
          emits: ['click'],
          template:
            '<div class="item" @click="$emit(\'click\')"><slot name="label" /></div>',
        },
      },
    },
  });

describe('ToggleCopilotAssistant behaviour', () => {
  it('shows the active assistant and its check mark', async () => {
    const wrapper = mountToggle(assistants[1]);
    await wrapper.find('.trigger').trigger('click');
    expect(wrapper.find('.trigger').text()).toBe('Beta');
    expect(wrapper.findAll('.i-lucide-check')).toHaveLength(1);
  });

  it('falls back to the select label without an active assistant', () => {
    const wrapper = mountToggle(null);
    expect(wrapper.find('.trigger').text()).toBe(
      'CAPTAIN.COPILOT.SELECT_ASSISTANT'
    );
    expect(wrapper.find('.i-lucide-check').exists()).toBe(false);
  });

  it('emits the chosen assistant', async () => {
    const wrapper = mountToggle(assistants[0]);
    await wrapper.findAll('.item')[1].trigger('click');
    expect(wrapper.emitted('setAssistant')).toEqual([[assistants[1]]]);
  });
});
