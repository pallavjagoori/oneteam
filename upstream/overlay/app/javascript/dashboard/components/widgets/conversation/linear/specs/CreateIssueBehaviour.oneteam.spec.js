/**
 * OneTeam behaviour spec for the Linear "create issue" form.
 *
 * Covers loading teams (and load errors), picking a team (loading its
 * people, labels, projects and ordered statuses, resetting dependent
 * picks, load errors), validation messages, creating and linking an
 * issue with only the filled fields, create errors, and cancelling.
 */
import { flushPromises, mount } from '@vue/test-utils';
import { useAlert, useTrack } from 'dashboard/composables';
import LinearAPI from 'dashboard/api/integrations/linear';
import CreateIssue from '../CreateIssue.vue';

vi.mock('dashboard/composables', () => ({
  useAlert: vi.fn(),
  useTrack: vi.fn(),
}));
vi.mock('vue-i18n', async importOriginal => ({
  ...(await importOriginal()),
  useI18n: () => ({ t: key => key }),
}));
vi.mock('dashboard/store/utils/api', () => ({
  parseLinearAPIErrorResponse: (error, fallback) => error.message || fallback,
}));
vi.mock('dashboard/api/integrations/linear', () => ({
  default: {
    getTeams: vi.fn(),
    getTeamEntities: vi.fn(),
    createIssue: vi.fn(),
    link_issue: vi.fn(),
  },
}));

const TitleInput = {
  name: 'WootInput',
  props: ['modelValue', 'error'],
  emits: ['update:modelValue', 'input'],
  template: '<input />',
};
const Dropdown = {
  name: 'SearchableDropdown',
  props: ['type', 'value', 'items', 'error'],
  emits: ['change'],
  template: '<div />',
};
const NextButton = {
  name: 'Button',
  props: ['label', 'disabled', 'isLoading'],
  emits: ['click'],
  template: '<button @click="$emit(\'click\', $event)">{{ label }}</button>',
};

const entities = {
  users: [{ id: 'u1', name: 'Ann' }],
  labels: [{ id: 'l1', name: 'bug' }],
  projects: [{ id: 'p1', name: 'App' }],
  states: [
    { id: 's3', name: 'Done' },
    { id: 's9', name: 'Triage' },
    { id: 's1', name: 'Backlog' },
  ],
};

const mountForm = async () => {
  LinearAPI.getTeams.mockResolvedValue({ data: [{ id: 't1', name: 'Core' }] });
  LinearAPI.getTeamEntities.mockResolvedValue({ data: entities });
  LinearAPI.createIssue.mockResolvedValue({ data: { identifier: 'ENG-1' } });
  LinearAPI.link_issue.mockResolvedValue({});
  const wrapper = mount(CreateIssue, {
    props: { conversationId: 9, title: 'Chat 9' },
    global: {
      stubs: {
        WootInput: TitleInput,
        SearchableDropdown: Dropdown,
        Button: NextButton,
      },
      mocks: { $t: key => key },
    },
  });
  await flushPromises();
  return wrapper;
};

const dropdown = (wrapper, type) =>
  wrapper.findAllComponents(Dropdown).find(d => d.props('type') === type);
const submit = wrapper => wrapper.findAllComponents(NextButton)[1];

describe('Linear create issue behaviour', () => {
  it('loads teams and their details', async () => {
    const wrapper = await mountForm();
    expect(dropdown(wrapper, 'teamId').props('items')).toEqual([
      { id: 't1', name: 'Core' },
    ]);
    expect(dropdown(wrapper, 'priority').props('items')).toHaveLength(5);
    dropdown(wrapper, 'assigneeId').vm.$emit(
      'change',
      { id: 'old' },
      'assigneeId'
    );
    dropdown(wrapper, 'teamId').vm.$emit('change', { id: 't1' }, 'teamId');
    await flushPromises();
    expect(LinearAPI.getTeamEntities).toHaveBeenCalledWith('t1');
    expect(dropdown(wrapper, 'assigneeId').props()).toMatchObject({
      value: '',
      items: entities.users,
    });
    expect(
      dropdown(wrapper, 'stateId')
        .props('items')
        .map(s => s.id)
    ).toEqual(['s1', 's3']);
    expect(dropdown(wrapper, 'labelId').props('items')).toEqual(
      entities.labels
    );
    expect(dropdown(wrapper, 'projectId').props('items')).toEqual(
      entities.projects
    );
  });

  it('reports load errors', async () => {
    LinearAPI.getTeams.mockRejectedValueOnce(new Error('Revoked'));
    const wrapper = mount(CreateIssue, {
      props: { conversationId: 9 },
      global: {
        stubs: {
          WootInput: TitleInput,
          SearchableDropdown: Dropdown,
          Button: NextButton,
        },
        mocks: { $t: key => key },
      },
    });
    await flushPromises();
    expect(useAlert).toHaveBeenLastCalledWith('Revoked');
    LinearAPI.getTeamEntities.mockRejectedValueOnce({});
    dropdown(wrapper, 'teamId').vm.$emit('change', { id: 't1' }, 'teamId');
    await flushPromises();
    expect(useAlert).toHaveBeenLastCalledWith(
      'INTEGRATION_SETTINGS.LINEAR.ADD_OR_LINK.LOADING_TEAM_ENTITIES_ERROR'
    );
  });

  it('validates the title and team', async () => {
    const wrapper = await mountForm();
    expect(submit(wrapper).props('disabled')).toBe(true);
    await submit(wrapper).trigger('click');
    expect(LinearAPI.createIssue).not.toHaveBeenCalled();
    expect(wrapper.findComponent(TitleInput).props('error')).toBe(
      'INTEGRATION_SETTINGS.LINEAR.ADD_OR_LINK.FORM.TITLE.REQUIRED_ERROR'
    );
    expect(dropdown(wrapper, 'teamId').props('error')).toBe(
      'INTEGRATION_SETTINGS.LINEAR.ADD_OR_LINK.FORM.TEAM.REQUIRED_ERROR'
    );
    await wrapper
      .findComponent(TitleInput)
      .vm.$emit('update:modelValue', 'Crash');
    wrapper.findComponent(TitleInput).vm.$emit('input');
    await flushPromises();
    expect(wrapper.findComponent(TitleInput).props('error')).toBe('');
    expect(submit(wrapper).props('disabled')).toBe(false);
    await submit(wrapper).trigger('click');
    expect(LinearAPI.createIssue).not.toHaveBeenCalled();
  });

  it('creates and links a minimal issue', async () => {
    const wrapper = await mountForm();
    await wrapper
      .findComponent(TitleInput)
      .vm.$emit('update:modelValue', 'Crash');
    dropdown(wrapper, 'teamId').vm.$emit('change', { id: 't1' }, 'teamId');
    await flushPromises();
    await submit(wrapper).trigger('click');
    await flushPromises();
    expect(LinearAPI.createIssue).toHaveBeenCalledWith({
      team_id: 't1',
      title: 'Crash',
      description: undefined,
      assignee_id: undefined,
      project_id: undefined,
      state_id: undefined,
      priority: undefined,
      label_ids: undefined,
      conversation_id: 9,
    });
    expect(LinearAPI.link_issue).toHaveBeenCalledWith(9, 'ENG-1', 'Chat 9');
    expect(useAlert).toHaveBeenLastCalledWith(
      'INTEGRATION_SETTINGS.LINEAR.ADD_OR_LINK.CREATE_SUCCESS'
    );
    expect(useTrack).toHaveBeenCalled();
    expect(wrapper.emitted('close')).toHaveLength(1);
  });

  it('sends every filled field and reports create errors', async () => {
    const wrapper = await mountForm();
    await wrapper
      .findComponent(TitleInput)
      .vm.$emit('update:modelValue', 'Crash');
    await wrapper.find('textarea').setValue('Steps');
    dropdown(wrapper, 'teamId').vm.$emit('change', { id: 't1' }, 'teamId');
    await flushPromises();
    ['assigneeId', 'projectId', 'stateId', 'priority', 'labelId'].forEach(
      (type, index) => {
        dropdown(wrapper, type).vm.$emit(
          'change',
          { id: `${type}-${index + 1}` },
          type
        );
      }
    );
    let finish;
    LinearAPI.createIssue.mockReturnValueOnce(
      new Promise((_, reject) => {
        finish = reject;
      })
    );
    await submit(wrapper).trigger('click');
    expect(submit(wrapper).props()).toMatchObject({
      disabled: true,
      isLoading: true,
    });
    finish(new Error('Rate limited'));
    await flushPromises();
    expect(LinearAPI.createIssue).toHaveBeenCalledWith(
      expect.objectContaining({
        description: 'Steps',
        assignee_id: 'assigneeId-1',
        project_id: 'projectId-2',
        state_id: 'stateId-3',
        priority: 'priority-4',
        label_ids: ['labelId-5'],
      })
    );
    expect(useAlert).toHaveBeenLastCalledWith('Rate limited');
    expect(submit(wrapper).props('isLoading')).toBe(false);
    expect(wrapper.emitted('close')).toBeUndefined();
  });

  it('closes from the cancel button', async () => {
    const wrapper = await mountForm();
    await wrapper.findAllComponents(NextButton)[0].trigger('click');
    expect(wrapper.emitted('close')).toHaveLength(1);
  });
});
