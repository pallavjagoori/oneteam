/**
 * OneTeam behaviour spec for the assignment policy settings landing page.
 *
 * Covers the header, always offering the assignment policy card, adding
 * the agent capacity card only when both the assignment_v2 and
 * advanced_assignment features are on for the account, and opening the
 * chosen policy list.
 */
import { mount } from '@vue/test-utils';
import { ref } from 'vue';
import AssignmentPolicyIndex from '../Index.vue';

const env = vi.hoisted(() => ({ features: [], push: vi.fn(), checks: [] }));

vi.mock('vue-router', async importOriginal => ({
  ...(await importOriginal()),
  useRouter: () => ({ push: env.push }),
  useRoute: () => ({ params: { accountId: '5' } }),
}));
vi.mock('dashboard/composables/store', () => ({
  useMapGetter: () =>
    ref((accountId, feature) => {
      env.checks.push([accountId, feature]);
      return env.features.includes(feature);
    }),
}));

const AssignmentCard = {
  name: 'AssignmentCard',
  props: ['title', 'features'],
  emits: ['click'],
  template:
    '<button class="card" @click="$emit(\'click\')">{{ title }}</button>',
};

const mountPage = () =>
  mount(AssignmentPolicyIndex, {
    global: {
      stubs: {
        SettingsLayout: {
          template: '<div><slot name="header" /><slot name="body" /></div>',
        },
        BaseSettingsHeader: {
          props: ['title'],
          template: '<h1>{{ title }}</h1>',
        },
        AssignmentCard,
      },
    },
  });

const titles = wrapper =>
  wrapper.findAllComponents(AssignmentCard).map(c => c.props('title'));

describe('Assignment policy index behaviour', () => {
  beforeEach(() => {
    env.features = [];
    env.checks = [];
    vi.clearAllMocks();
  });

  it('offers the assignment policy and opens it', async () => {
    const wrapper = mountPage();
    expect(wrapper.find('h1').text()).toBe(
      'ASSIGNMENT_POLICY.INDEX.HEADER.TITLE'
    );
    expect(titles(wrapper)).toEqual([
      'ASSIGNMENT_POLICY.INDEX.ASSIGNMENT_POLICY.TITLE',
    ]);
    expect(
      wrapper.findComponent(AssignmentCard).props('features')
    ).toHaveLength(3);
    expect(env.checks).toContainEqual([5, 'assignment_v2']);
    await wrapper.find('.card').trigger('click');
    expect(env.push).toHaveBeenCalledWith({
      name: 'agent_assignment_policy_index',
    });
  });

  it('needs both features for the agent capacity policy', async () => {
    env.features = ['assignment_v2'];
    expect(titles(mountPage())).toHaveLength(1);
    env.features = ['advanced_assignment'];
    expect(titles(mountPage())).toHaveLength(1);

    env.features = ['assignment_v2', 'advanced_assignment'];
    const wrapper = mountPage();
    expect(titles(wrapper)).toEqual([
      'ASSIGNMENT_POLICY.INDEX.ASSIGNMENT_POLICY.TITLE',
      'ASSIGNMENT_POLICY.INDEX.AGENT_CAPACITY_POLICY.TITLE',
    ]);
    await wrapper.findAll('.card')[1].trigger('click');
    expect(env.push).toHaveBeenCalledWith({
      name: 'agent_capacity_policy_index',
    });
  });
});
