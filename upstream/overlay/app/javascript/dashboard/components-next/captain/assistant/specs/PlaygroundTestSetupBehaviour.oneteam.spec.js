/**
 * OneTeam behaviour spec for the Captain playground test setup panel.
 *
 * Complements Chatwoot's own spec with the loading spinner and load
 * error, temporary scenarios (remove, collapse and expand, save), saved
 * scenarios with disabled labels and descriptions, temporary and saved
 * guidelines and guardrails (add, remove, save, toggle, empty states),
 * the non-admin layouts, and the saved rule title outside rule tabs.
 */
import { reactive } from 'vue';
import { shallowMount } from '@vue/test-utils';
import PlaygroundTestSetup from '../PlaygroundTestSetup.vue';

vi.mock('vue-i18n', async importOriginal => ({
  ...(await importOriginal()),
  useI18n: () => ({ t: key => key }),
}));

const Button = {
  name: 'Button',
  props: ['icon', 'label', 'disabled'],
  emits: ['click'],
  template:
    '<button :class="icon" :data-label="label" @click="$emit(\'click\')" />',
};
const Checkbox = {
  name: 'Checkbox',
  props: ['modelValue'],
  emits: ['update:modelValue'],
  template: '<input type="checkbox" />',
};
const TabBar = {
  name: 'TabBar',
  props: ['tabs'],
  emits: ['tabChanged'],
  template: '<nav />',
};
const Accordion = {
  name: 'Accordion',
  props: ['title'],
  template: '<div class="accordion" :title="title"><slot /></div>',
};
const Label = {
  name: 'Label',
  props: ['label'],
  template: '<b class="label">{{ label }}</b>',
};

const makeSession = overrides =>
  reactive({
    isInitializing: false,
    loadError: '',
    isAdmin: true,
    knowledgeText: '',
    isKnowledgeIncluded: true,
    isSavingKnowledge: false,
    isKnowledgeAlreadySaved: false,
    knowledgeStats: { documents: 0, faqs: 0 },
    temporaryScenarios: [],
    savedScenarios: [],
    includedScenarioIds: [],
    temporaryGuidelines: [],
    savedGuidelines: [],
    temporaryGuardrails: [],
    savedGuardrails: [],
    scenarioIsValid: () => true,
    isRuleTypeSaving: () => false,
    addTemporaryScenario: vi.fn(),
    removeTemporaryScenario: vi.fn(),
    saveTemporaryScenario: vi.fn(),
    toggleScenario: vi.fn(),
    addTemporaryRule: vi.fn(),
    removeTemporaryRule: vi.fn(),
    saveTemporaryRule: vi.fn(),
    setKnowledgeText: vi.fn(),
    setKnowledgeIncluded: vi.fn(),
    saveKnowledgeAsDocument: vi.fn(),
    ...overrides,
  });

const mountSetup = session =>
  shallowMount(PlaygroundTestSetup, {
    props: { session },
    global: { stubs: { Button, Checkbox, TabBar, Accordion, Label } },
  });

const openTab = async (wrapper, id) => {
  await wrapper.findComponent(TabBar).vm.$emit('tabChanged', { id });
};

describe('PlaygroundTestSetup behaviour', () => {
  it('shows the spinner and load errors', () => {
    const loading = mountSetup(makeSession({ isInitializing: true }));
    expect(loading.findComponent(TabBar).exists()).toBe(false);
    const failed = mountSetup(makeSession({ loadError: 'Down' }));
    expect(failed.find('[role="alert"]').text()).toBe('Down');
    expect(failed.vm.savedRuleTitle).toBe('');
  });

  it('manages temporary and saved scenarios', async () => {
    const temp = {
      clientId: 'c1',
      title: 'T',
      description: '',
      instruction: '',
      included: true,
    };
    const session = makeSession({
      temporaryScenarios: [temp],
      savedScenarios: [
        { id: 1, title: 'On', enabled: true, description: 'Desc' },
        { id: 2, title: 'Off', enabled: false },
      ],
      includedScenarioIds: [1],
    });
    const wrapper = mountSetup(session);
    await openTab(wrapper, 'scenarios');
    await wrapper.find('.i-lucide-trash-2').trigger('click');
    expect(session.removeTemporaryScenario).toHaveBeenCalledWith('c1');

    await wrapper.find('.i-lucide-chevron-up').trigger('click');
    expect(wrapper.find('#temporary-scenario-c1').exists()).toBe(false);
    await wrapper.find('.i-lucide-chevron-down').trigger('click');
    expect(wrapper.find('#temporary-scenario-c1').exists()).toBe(true);

    await wrapper
      .find('[data-label="CAPTAIN.PLAYGROUND.SETUP.SCENARIOS.ADD_PERMANENTLY"]')
      .trigger('click');
    expect(session.saveTemporaryScenario).toHaveBeenCalledWith(temp);

    const saved = wrapper.find('.accordion').findAllComponents(Checkbox);
    expect(saved.map(box => box.props('modelValue'))).toEqual([true, false]);
    await saved[1].vm.$emit('update:modelValue', true);
    expect(session.toggleScenario).toHaveBeenCalledWith(2);
    expect(wrapper.text()).toContain('Desc');
    expect(wrapper.findAll('.label').map(label => label.text())).toContain(
      'CAPTAIN.PLAYGROUND.SETUP.SCENARIOS.DISABLED'
    );
  });

  it('manages guidelines and guardrails', async () => {
    const guideline = { clientId: 'g1', content: 'Be kind', included: true };
    const savedRule = { key: 's1', content: 'Saved', included: false };
    const session = makeSession({
      temporaryGuidelines: [guideline],
      savedGuidelines: [savedRule],
    });
    const wrapper = mountSetup(session);
    await openTab(wrapper, 'guidelines');
    await wrapper
      .findComponent({ name: 'AddNewRulesInput' })
      .vm.$emit('add', 'New rule');
    expect(session.addTemporaryRule).toHaveBeenCalledWith(
      'guideline',
      'New rule'
    );
    await wrapper.find('.i-lucide-trash-2').trigger('click');
    expect(session.removeTemporaryRule).toHaveBeenCalledWith('guideline', 'g1');
    await wrapper
      .find(
        '[data-label="CAPTAIN.PLAYGROUND.SETUP.GUIDELINES.ADD_PERMANENTLY"]'
      )
      .trigger('click');
    expect(session.saveTemporaryRule).toHaveBeenCalledWith(
      'guideline',
      guideline
    );

    const savedBox = wrapper.find('.accordion').findComponent(Checkbox);
    await savedBox.vm.$emit('update:modelValue', true);
    expect(session.savedGuidelines[0].included).toBe(true);

    await openTab(wrapper, 'guardrails');
    expect(wrapper.find('.accordion').attributes('title')).toBe(
      'CAPTAIN.PLAYGROUND.SETUP.GUARDRAILS.SAVED_SUMMARY'
    );
    expect(wrapper.text()).toContain(
      'CAPTAIN.PLAYGROUND.SETUP.GUARDRAILS.EMPTY'
    );
  });

  it('hides permanent saves from non-admins', async () => {
    const session = makeSession({
      isAdmin: false,
      temporaryScenarios: [
        { clientId: 'c', title: '', description: '', instruction: '' },
      ],
      temporaryGuardrails: [{ clientId: 'r', content: 'x', included: true }],
    });
    const wrapper = mountSetup(session);
    expect(wrapper.find('[data-label*="ADD_PERMANENTLY"]').exists()).toBe(
      false
    );
    await openTab(wrapper, 'scenarios');
    expect(wrapper.find('[data-label*="ADD_PERMANENTLY"]').exists()).toBe(
      false
    );
    expect(wrapper.text()).toContain(
      'CAPTAIN.PLAYGROUND.SETUP.SCENARIOS.EMPTY'
    );
    await openTab(wrapper, 'guardrails');
    expect(wrapper.find('[data-label*="ADD_PERMANENTLY"]').exists()).toBe(
      false
    );
  });
});
