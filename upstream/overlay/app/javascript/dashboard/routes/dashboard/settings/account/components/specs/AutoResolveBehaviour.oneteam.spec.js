/**
 * OneTeam behaviour spec for the account's auto-resolve settings card.
 *
 * Covers loading saved settings (duration shown in days, hours or
 * minutes, message, ignore-waiting flag, label), staying disabled with
 * nothing saved, the minimum duration (instance config or default),
 * saving with success and error alerts, disabling (which clears the
 * settings), and label options with colour swatches.
 */
import { flushPromises, mount } from '@vue/test-utils';
import { computed, reactive, ref } from 'vue';

const env = vi.hoisted(() => ({ alert: () => {} }));

vi.mock('dashboard/composables', () => ({
  useAlert: (...args) => env.alert(...args),
}));
vi.mock('dashboard/composables/store', () => ({
  useMapGetter: name => computed(() => env.state[name]),
}));
vi.mock('dashboard/composables/useAccount', () => ({
  useAccount: () => env.account,
}));
vi.mock('vue-i18n', async importOriginal => ({
  ...(await importOriginal()),
  useI18n: () => ({
    t: (key, params) => (params ? `${key}:${params.minDuration}` : key),
  }),
}));

const Switch = {
  name: 'Switch',
  props: ['modelValue'],
  emits: ['update:modelValue', 'change'],
  template: '<input type="checkbox" class="switch" />',
};
const Duration = {
  name: 'DurationInput',
  props: ['modelValue', 'unit'],
  emits: ['update:modelValue', 'update:unit'],
  template: '<input class="duration" />',
};
const Editor = {
  name: 'Editor',
  props: ['modelValue'],
  emits: ['update:modelValue'],
  template: '<div class="editor" />',
};
const SingleSelect = {
  name: 'SingleSelect',
  props: ['modelValue', 'options'],
  emits: ['update:modelValue'],
  template: '<div class="select" />',
};
const WithLabel = { name: 'WithLabel', template: '<div><slot /></div>' };
const NextButton = {
  name: 'Button',
  props: ['isLoading', 'label'],
  template: '<button type="submit">{{ label }}</button>',
};

const labels = [
  { title: 'billing', color: '#f00' },
  { title: 'vip', color: '#0f0' },
];

const mountCard = async ({ settings, config, labelList = labels } = {}) => {
  vi.resetModules();
  window.chatwootConfig = config;
  env.alert = vi.fn();
  env.state = reactive({ 'labels/getLabels': labelList });
  env.account = {
    currentAccount: ref(settings ? { settings } : null),
    updateAccount: vi.fn().mockResolvedValue(),
  };
  const { default: AutoResolve } = await import('../AutoResolve.vue');
  const wrapper = mount(AutoResolve, {
    global: {
      stubs: {
        Switch,
        DurationInput: Duration,
        Editor,
        SingleSelect,
        WithLabel,
        Button: NextButton,
      },
      mocks: { $t: key => key },
    },
  });
  await flushPromises();
  return wrapper;
};
const switches = wrapper => wrapper.findAllComponents(Switch);
const duration = wrapper => wrapper.findComponent(Duration);
const submit = async wrapper => {
  await wrapper.find('form').trigger('submit');
  await flushPromises();
};

afterEach(() => {
  delete window.chatwootConfig;
});

describe('AutoResolve behaviour', () => {
  it('stays disabled without saved settings or labels', async () => {
    const wrapper = await mountCard({ labelList: null });
    expect(switches(wrapper)[0].props('modelValue')).toBe(false);
    expect(wrapper.find('form').exists()).toBe(false);
  });

  it.each([
    [2880, 'days'],
    [120, 'hours'],
    [45, 'minutes'],
  ])('loads %i minutes in %s', async (minutes, unit) => {
    const wrapper = await mountCard({
      settings: {
        auto_resolve_after: minutes,
        auto_resolve_message: 'Closing now',
        auto_resolve_ignore_waiting: true,
        auto_resolve_label: 'vip',
      },
    });
    expect(duration(wrapper).props()).toEqual({ modelValue: minutes, unit });
    expect(wrapper.findComponent(Editor).props('modelValue')).toBe(
      'Closing now'
    );
    expect(switches(wrapper)[1].props('modelValue')).toBe(true);
    const select = wrapper.findComponent(SingleSelect);
    expect(select.props('modelValue')).toMatchObject({
      id: 'vip',
      name: 'vip',
    });
    expect(select.props('options').map(o => o.icon.props.style)).toEqual([
      { backgroundColor: '#f00' },
      { backgroundColor: '#0f0' },
    ]);
  });

  it('rejects durations under the default minimum', async () => {
    const wrapper = await mountCard({ settings: { auto_resolve_after: 5 } });
    await submit(wrapper);
    expect(env.alert).toHaveBeenCalledWith(
      'GENERAL_SETTINGS.FORM.AUTO_RESOLVE.DURATION.ERROR:10'
    );
    expect(env.account.updateAccount).not.toHaveBeenCalled();
  });

  it('uses the instance minimum when configured', async () => {
    const wrapper = await mountCard({
      settings: { auto_resolve_after: 20 },
      config: { autoResolveMinMinutes: 30 },
    });
    await submit(wrapper);
    expect(env.alert).toHaveBeenCalledWith(
      'GENERAL_SETTINGS.FORM.AUTO_RESOLVE.DURATION.ERROR:30'
    );
  });

  it('saves edited settings', async () => {
    const wrapper = await mountCard({ settings: { auto_resolve_after: 60 } });
    duration(wrapper).vm.$emit('update:modelValue', 90);
    wrapper.findComponent(Editor).vm.$emit('update:modelValue', 'Bye');
    switches(wrapper)[1].vm.$emit('update:modelValue', true);
    wrapper
      .findComponent(SingleSelect)
      .vm.$emit('update:modelValue', { id: 'billing', name: 'billing' });
    await submit(wrapper);
    expect(env.account.updateAccount).toHaveBeenCalledWith(
      {
        auto_resolve_after: 90,
        auto_resolve_message: 'Bye',
        auto_resolve_ignore_waiting: true,
        auto_resolve_label: 'billing',
      },
      { silent: true }
    );
    expect(env.alert).toHaveBeenCalledWith(
      'GENERAL_SETTINGS.FORM.AUTO_RESOLVE.DURATION.API.SUCCESS'
    );
  });

  it('saves without a label and alerts on errors', async () => {
    const wrapper = await mountCard({ settings: { auto_resolve_after: 60 } });
    env.account.updateAccount.mockRejectedValue(new Error('nope'));
    wrapper.findComponent(SingleSelect).vm.$emit('update:modelValue', null);
    await submit(wrapper);
    expect(env.account.updateAccount.mock.calls[0][0].auto_resolve_label).toBe(
      null
    );
    expect(env.alert).toHaveBeenCalledWith(
      'GENERAL_SETTINGS.FORM.AUTO_RESOLVE.DURATION.API.ERROR'
    );
  });

  it('enables the form, and disabling clears the settings', async () => {
    const wrapper = await mountCard({ settings: { auto_resolve_after: 60 } });
    const toggle = switches(wrapper)[0];
    toggle.vm.$emit('update:modelValue', true);
    toggle.vm.$emit('change');
    await flushPromises();
    expect(env.account.updateAccount).not.toHaveBeenCalled();
    toggle.vm.$emit('update:modelValue', false);
    toggle.vm.$emit('change');
    await flushPromises();
    expect(env.account.updateAccount).toHaveBeenCalledWith(
      {
        auto_resolve_after: null,
        auto_resolve_message: '',
        auto_resolve_ignore_waiting: false,
        auto_resolve_label: null,
      },
      { silent: true }
    );
    expect(wrapper.find('form').exists()).toBe(false);
  });
});
