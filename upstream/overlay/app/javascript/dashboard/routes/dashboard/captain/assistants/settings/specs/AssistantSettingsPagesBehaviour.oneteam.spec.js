/**
 * OneTeam behaviour spec for the Captain assistant audience, schedule
 * and system settings pages.
 *
 * Covers each page's heading and description and saving its form
 * through the shared assistant settings composable.
 */
import { mount } from '@vue/test-utils';
import Audience from '../Audience.vue';
import Schedule from '../Schedule.vue';
import System from '../System.vue';

const env = vi.hoisted(() => ({ update: vi.fn() }));

vi.mock('vue-i18n', async importOriginal => ({
  ...(await importOriginal()),
  useI18n: () => ({ t: key => key }),
}));
vi.mock('../useAssistantSettings', async () => {
  const { ref: vueRef } = await import('vue');
  return {
    useAssistantSettings: () => ({
      assistant: vueRef({ id: 3, name: 'Helper' }),
      updateAssistant: (...args) => env.update(...args),
    }),
  };
});

const SettingsPageLayout = {
  name: 'SettingsPageLayout',
  props: ['heading', 'description'],
  template: '<section><slot /></section>',
};

/**
 * Builds a form stub.
 *
 * @param {string} name Form component name.
 * @returns {object} The stub.
 */
const formStub = name => ({
  name,
  props: ['assistant'],
  emits: ['submit'],
  template: '<form />',
});

const stubs = {
  SettingsPageLayout,
  AssistantAudienceForm: formStub('AssistantAudienceForm'),
  AssistantScheduleForm: formStub('AssistantScheduleForm'),
  AssistantSystemSettingsForm: formStub('AssistantSystemSettingsForm'),
};

describe('assistant settings pages behaviour', () => {
  it.each([
    [Audience, 'AssistantAudienceForm', 'AUDIENCE', 'DESCRIPTION'],
    [Schedule, 'AssistantScheduleForm', 'SCHEDULE', 'DESCRIPTION'],
    [
      System,
      'AssistantSystemSettingsForm',
      'SYSTEM_SETTINGS',
      'DESCRIPTION_V2',
    ],
  ])('renders and saves the %#th page', (page, form, key, description) => {
    env.update.mockClear();
    const wrapper = mount(page, { global: { stubs } });
    expect(wrapper.getComponent(SettingsPageLayout).props()).toEqual({
      heading: `CAPTAIN.ASSISTANTS.SETTINGS.${key}.TITLE`,
      description: `CAPTAIN.ASSISTANTS.SETTINGS.${key}.${description}`,
    });
    const formWrapper = wrapper.getComponent(stubs[form]);
    expect(formWrapper.props('assistant')).toEqual({ id: 3, name: 'Helper' });
    formWrapper.vm.$emit('submit', { name: 'New' });
    expect(env.update).toHaveBeenCalledWith({ name: 'New' });
  });
});
