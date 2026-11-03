/**
 * OneTeam behaviour spec for the Captain assistant basic settings page.
 *
 * Covers saving the form, opening the delete dialog, and redirecting
 * after deletion to the next assistant or the create page.
 */
import { computed, ref } from 'vue';
import { mount } from '@vue/test-utils';
import AssistantSettingsIndex from '../Index.vue';

const env = vi.hoisted(() => ({
  push: vi.fn(),
  update: vi.fn(),
  open: vi.fn(),
  records: [],
}));

vi.mock('vue-router', async importOriginal => ({
  ...(await importOriginal()),
  useRoute: () => ({ params: { accountId: 1 } }),
  useRouter: () => ({ push: env.push }),
}));

vi.mock('dashboard/composables/store', () => ({
  useMapGetter: () => computed(() => env.records),
}));

vi.mock('../useAssistantSettings', () => ({
  useAssistantSettings: () => ({
    assistantId: ref(5),
    assistant: ref({ id: 5, name: 'Sage' }),
    updateAssistant: env.update,
  }),
}));

vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: key => key }) }));

const FormStub = {
  name: 'AssistantBasicSettingsForm',
  props: { assistant: Object },
  emits: ['submit'],
  template: '<form />',
};
const DeleteStub = {
  name: 'DeleteDialog',
  props: { entity: Object },
  emits: ['deleteSuccess'],
  setup: () => ({ dialogRef: { open: env.open } }),
  template: '<div />',
};

/**
 * Mounts the page.
 *
 * @returns {import('@vue/test-utils').VueWrapper}
 */
const mountPage = () =>
  mount(AssistantSettingsIndex, {
    global: {
      stubs: {
        SettingsPageLayout: { template: '<div><slot /></div>' },
        AssistantBasicSettingsForm: FormStub,
        DeleteDialog: DeleteStub,
        Button: {
          emits: ['click'],
          template: '<button class="delete" @click="$emit(\'click\')" />',
        },
      },
    },
  });

describe('Assistant basic settings page behaviour', () => {
  it('saves the form', () => {
    const wrapper = mountPage();
    wrapper.findComponent(FormStub).vm.$emit('submit', { name: 'New' });
    expect(env.update).toHaveBeenCalledWith({ name: 'New' });
  });

  it('opens the delete dialog', async () => {
    const wrapper = mountPage();
    await wrapper.find('.delete').trigger('click');
    expect(env.open).toHaveBeenCalled();
  });

  it('moves to the next assistant after deletion', () => {
    env.records = [{ id: 5 }, { id: 8 }];
    const wrapper = mountPage();
    wrapper.findComponent(DeleteStub).vm.$emit('deleteSuccess');
    expect(env.push).toHaveBeenCalledWith({
      name: 'captain_assistants_settings_index',
      params: { accountId: 1, assistantId: 8 },
    });
  });

  it('goes to the create page when no assistants remain', () => {
    env.records = [{ id: 5 }];
    const wrapper = mountPage();
    wrapper.findComponent(DeleteStub).vm.$emit('deleteSuccess');
    expect(env.push).toHaveBeenCalledWith({
      name: 'captain_assistants_create_index',
      params: { accountId: 1 },
    });
  });
});
