/**
 * OneTeam behaviour spec for the Captain assistant SettingsPageLayout.
 *
 * Covers the tab list, the fetching flag, rendering the active tab slot
 * and navigating when a tab is picked.
 */
import { computed } from 'vue';
import { mount } from '@vue/test-utils';
import SettingsPageLayout from '../SettingsPageLayout.vue';

const router = vi.hoisted(() => ({
  route: {
    name: 'captain_assistants_settings_index',
    params: { accountId: 1, assistantId: 9 },
  },
  push: vi.fn(),
}));

vi.mock('vue-router', async importOriginal => ({
  ...(await importOriginal()),
  useRoute: () => router.route,
  useRouter: () => ({ push: router.push }),
}));

vi.mock('dashboard/composables/store', () => ({
  useMapGetter: () => computed(() => ({ fetchingItem: true })),
}));

vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: key => key }) }));

const TabsStub = {
  name: 'VerticalTabs',
  props: { modelValue: String, tabs: Array },
  emits: ['update:modelValue'],
  template: '<div><slot :name="modelValue" /></div>',
};

/**
 * Mounts the layout.
 *
 * @returns {import('@vue/test-utils').VueWrapper}
 */
const mountLayout = () =>
  mount(SettingsPageLayout, {
    props: { heading: 'Basic', description: 'Name and tone' },
    slots: { default: '<p class="content">Body</p>' },
    global: {
      stubs: {
        PageLayout: {
          name: 'PageLayout',
          props: { isFetching: Boolean },
          template: '<div><slot name="body" /></div>',
        },
        VerticalTabs: TabsStub,
        SettingsHeader: {
          props: ['heading', 'description'],
          template: '<h2>{{ heading }} {{ description }}</h2>',
        },
      },
    },
  });

describe('SettingsPageLayout behaviour', () => {
  it('lists six tabs and renders the active tab slot', () => {
    const wrapper = mountLayout();
    const tabs = wrapper.findComponent(TabsStub);
    expect(tabs.props('tabs').map(tab => tab.id)).toHaveLength(6);
    expect(tabs.props('modelValue')).toBe('captain_assistants_settings_index');
    expect(
      wrapper.findComponent({ name: 'PageLayout' }).props('isFetching')
    ).toBe(true);
    expect(wrapper.text()).toContain('Basic Name and tone');
    expect(wrapper.find('.content').exists()).toBe(true);
  });

  it('navigates to the picked tab', () => {
    const wrapper = mountLayout();
    wrapper
      .findComponent(TabsStub)
      .vm.$emit('update:modelValue', 'captain_assistants_guardrails_index');
    expect(router.push).toHaveBeenCalledWith({
      name: 'captain_assistants_guardrails_index',
      params: { accountId: 1, assistantId: 9 },
    });
  });
});
