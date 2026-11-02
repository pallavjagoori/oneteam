/**
 * OneTeam behaviour spec for the "add agents" step of inbox creation.
 *
 * Covers loading agents on mount, offering only unselected agents (with
 * thumbnail, avatar or no image), adding and removing picked agents,
 * the empty-selection validation message, and saving the members with
 * a redirect to the finish step or an error alert.
 */
import { flushPromises, mount } from '@vue/test-utils';
import { createStore } from 'vuex';
import { useAlert } from 'dashboard/composables';
import InboxMembersAPI from 'dashboard/api/inboxMembers';
import router from 'dashboard/routes/index';
import AddAgents from '../AddAgents.vue';

vi.mock('dashboard/composables', () => ({ useAlert: vi.fn() }));
vi.mock('dashboard/api/inboxMembers', () => ({
  default: { update: vi.fn() },
}));
vi.mock('dashboard/routes/index', () => ({
  default: { replace: vi.fn() },
}));

const TagInput = {
  name: 'TagInput',
  props: ['modelValue', 'placeholder', 'menuItems'],
  emits: ['add', 'remove'],
  template: '<div class="tag-input" />',
};
const NextButton = {
  name: 'NextButton',
  props: ['label', 'isLoading', 'type'],
  template: '<button type="submit">{{ label }}</button>',
};

const agentList = [
  { id: 1, name: 'Alice', thumbnail: 'a.png' },
  { id: 2, name: 'Bob', avatar_url: 'b.png' },
  { id: 3, name: 'Cara' },
];

const mountStep = () => {
  const dispatch = vi.fn();
  const store = createStore({
    getters: { 'agents/getAgents': () => agentList },
  });
  store.dispatch = dispatch;
  const wrapper = mount(AddAgents, {
    global: {
      plugins: [store],
      mocks: { $route: { params: { inbox_id: 42 } } },
      stubs: { PageHeader: true, TagInput, NextButton },
    },
  });
  return { wrapper, dispatch };
};

describe('AddAgents behaviour', () => {
  it('loads agents and offers the unselected ones', async () => {
    const { wrapper, dispatch } = mountStep();
    expect(dispatch).toHaveBeenCalledWith('agents/get');
    const input = wrapper.findComponent(TagInput);
    expect(input.props('menuItems')).toEqual([
      {
        label: 'Alice',
        value: 1,
        action: 'select',
        thumbnail: { name: 'Alice', src: 'a.png' },
      },
      {
        label: 'Bob',
        value: 2,
        action: 'select',
        thumbnail: { name: 'Bob', src: 'b.png' },
      },
      {
        label: 'Cara',
        value: 3,
        action: 'select',
        thumbnail: { name: 'Cara', src: '' },
      },
    ]);

    await input.vm.$emit('add', { value: 2 });
    await input.vm.$emit('add', { value: 2 });
    await input.vm.$emit('add', { value: 3 });
    expect(input.props('modelValue')).toEqual(['Bob', 'Cara']);
    expect(input.props('menuItems').map(i => i.value)).toEqual([1]);

    await input.vm.$emit('remove', 0);
    expect(input.props('modelValue')).toEqual(['Cara']);
  });

  it('names unknown agents with an empty label', async () => {
    const { wrapper } = mountStep();
    await wrapper.findComponent(TagInput).vm.$emit('add', { value: 99 });
    expect(wrapper.findComponent(TagInput).props('modelValue')).toEqual(['']);
  });

  it('shows the validation error for an empty selection', async () => {
    const { wrapper } = mountStep();
    expect(wrapper.find('.message').exists()).toBe(false);
    wrapper.vm.v$.$touch();
    await wrapper.vm.$nextTick();
    expect(wrapper.find('.message').text()).toBe(
      'INBOX_MGMT.ADD.AGENTS.VALIDATION_ERROR'
    );
    expect(wrapper.find('label').classes()).toContain('error');

    await wrapper.findComponent(TagInput).vm.$emit('add', { value: 1 });
    expect(wrapper.find('.message').exists()).toBe(false);
  });

  it('saves members and goes to the finish step', async () => {
    let resolve;
    InboxMembersAPI.update.mockReturnValue(
      new Promise(done => {
        resolve = done;
      })
    );
    const { wrapper } = mountStep();
    await wrapper.findComponent(TagInput).vm.$emit('add', { value: 1 });
    await wrapper.find('form').trigger('submit');
    expect(wrapper.findComponent(NextButton).props('isLoading')).toBe(true);
    resolve({});
    await flushPromises();
    expect(InboxMembersAPI.update).toHaveBeenCalledWith({
      inboxId: 42,
      agentList: [1],
    });
    expect(router.replace).toHaveBeenCalledWith({
      name: 'settings_inbox_finish',
      params: { page: 'new', inbox_id: 42 },
    });
    expect(wrapper.findComponent(NextButton).props('isLoading')).toBe(false);
  });

  it('alerts when saving fails', async () => {
    InboxMembersAPI.update.mockRejectedValue(new Error('nope'));
    const { wrapper } = mountStep();
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    expect(useAlert).toHaveBeenCalledWith('nope');
    expect(router.replace).not.toHaveBeenCalled();
    expect(wrapper.findComponent(NextButton).props('isLoading')).toBe(false);
  });
});
