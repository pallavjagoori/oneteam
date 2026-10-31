/**
 * OneTeam behaviour spec for the account deletion section.
 *
 * Covers asking for confirmation (typed account name), scheduling the
 * deletion (success, server message, fallback error), the scheduled
 * notice for manual and inactivity deletions, and cancelling the
 * scheduled deletion (success and error).
 */
import { computed, reactive, ref } from 'vue';
import { flushPromises, mount } from '@vue/test-utils';
import { useAlert } from 'dashboard/composables';
import AccountDelete from '../AccountDelete.vue';

const env = vi.hoisted(() => ({}));

vi.mock('dashboard/composables', () => ({ useAlert: vi.fn() }));
vi.mock('vue-i18n', async importOriginal => ({
  ...(await importOriginal()),
  useI18n: () => ({
    t: (key, args) => (args ? `${key} ${JSON.stringify(args)}` : key),
  }),
}));
vi.mock('dashboard/composables/store', () => ({
  useStore: () => env.store,
  useMapGetter: () => computed(() => env.uiFlags),
}));
vi.mock('dashboard/composables/useAccount', () => ({
  useAccount: () => ({ currentAccount: computed(() => env.account) }),
}));
vi.mock('@vueuse/core', async importOriginal => ({
  ...(await importOriginal()),
  useToggle: () => {
    const value = ref(false);
    return [
      value,
      next => {
        value.value = typeof next === 'boolean' ? next : !value.value;
      },
    ];
  },
}));

const NextButton = {
  name: 'NextButton',
  props: ['label', 'isLoading'],
  emits: ['click'],
  template: '<button @click="$emit(\'click\')">{{ label }}</button>',
};
const Confirm = {
  name: 'WootConfirmDeleteModal',
  props: ['show', 'confirmValue', 'confirmPlaceHolderText'],
  emits: ['onConfirm', 'onClose', 'update:show'],
  template: '<div class="confirm" />',
};

const mountSection = async customAttributes => {
  env.store = { dispatch: vi.fn().mockResolvedValue() };
  env.uiFlags = { isUpdating: false };
  env.account = reactive({ name: 'Acme', custom_attributes: customAttributes });
  const wrapper = mount(AccountDelete, {
    global: {
      stubs: {
        NextButton,
        WootConfirmDeleteModal: Confirm,
        SectionLayout: { template: '<section><slot /></section>' },
      },
      mocks: { $t: key => key },
    },
  });
  await flushPromises();
  return wrapper;
};

describe('Account delete behaviour', () => {
  it('schedules deletion after confirmation', async () => {
    const wrapper = await mountSection(undefined);
    await wrapper.find('button').trigger('click');
    const confirm = wrapper.findComponent(Confirm);
    expect(confirm.props()).toMatchObject({ show: true, confirmValue: 'Acme' });
    expect(confirm.props('confirmPlaceHolderText')).toContain(
      '"accountName":"Acme"'
    );
    confirm.vm.$emit('onConfirm');
    await flushPromises();
    expect(env.store.dispatch.mock.calls).toEqual([
      ['accounts/toggleDeletion', { action_type: 'delete' }],
      ['accounts/get'],
    ]);
    expect(useAlert).toHaveBeenLastCalledWith(
      'GENERAL_SETTINGS.ACCOUNT_DELETE_SECTION.SUCCESS'
    );
    expect(wrapper.find('.confirm').exists()).toBe(false);
  });

  it('closes the confirmation and reports errors', async () => {
    const wrapper = await mountSection({});
    await wrapper.find('button').trigger('click');
    await wrapper.findComponent(Confirm).vm.$emit('onClose');
    expect(wrapper.find('.confirm').exists()).toBe(false);
    await wrapper.find('button').trigger('click');
    await wrapper.findComponent(Confirm).vm.$emit('update:show', false);
    expect(wrapper.find('.confirm').exists()).toBe(false);

    env.store.dispatch.mockRejectedValueOnce({
      response: { data: { message: 'Owner only' } },
    });
    await wrapper.find('button').trigger('click');
    wrapper.findComponent(Confirm).vm.$emit('onConfirm');
    await flushPromises();
    expect(useAlert).toHaveBeenLastCalledWith('Owner only');
    env.store.dispatch.mockRejectedValueOnce({});
    await wrapper.find('button').trigger('click');
    wrapper.findComponent(Confirm).vm.$emit('onConfirm');
    await flushPromises();
    expect(useAlert).toHaveBeenLastCalledWith(
      'GENERAL_SETTINGS.ACCOUNT_DELETE_SECTION.FAILURE'
    );
  });

  it('shows a scheduled manual deletion and cancels it', async () => {
    const date = '2030-01-02T03:04:05Z';
    const wrapper = await mountSection({ marked_for_deletion_at: date });
    expect(wrapper.text()).toContain('SCHEDULED_DELETION.MESSAGE_MANUAL');
    expect(wrapper.text()).toContain(new Date(date).toLocaleString());
    await wrapper.find('button').trigger('click');
    await flushPromises();
    expect(env.store.dispatch.mock.calls).toEqual([
      ['accounts/toggleDeletion', { action_type: 'undelete' }],
      ['accounts/get'],
    ]);
    expect(useAlert).toHaveBeenLastCalledWith(
      'GENERAL_SETTINGS.UPDATE.SUCCESS'
    );
    env.store.dispatch.mockRejectedValueOnce(new Error('x'));
    await wrapper.find('button').trigger('click');
    await flushPromises();
    expect(useAlert).toHaveBeenLastCalledWith('GENERAL_SETTINGS.UPDATE.ERROR');
  });

  it('explains deletions for inactivity', async () => {
    const wrapper = await mountSection({
      marked_for_deletion_at: '2030-01-02T03:04:05Z',
      marked_for_deletion_reason: 'inactivity',
    });
    expect(wrapper.text()).toContain('SCHEDULED_DELETION.MESSAGE_INACTIVITY');
  });
});
