/**
 * OneTeam behaviour spec for the translation section of account settings.
 *
 * Covers the upgrade prompt on plans without translation, choosing
 * Captain or Google Translate as the provider (Captain only when Captain
 * tasks are on, Google only once connected, with a connect link
 * otherwise), the auto-translate switch and why it is locked (feature
 * off, or no usable provider selected), and the save alerts.
 */
import { nextTick, reactive, ref } from 'vue';
import { flushPromises, mount } from '@vue/test-utils';
import { useAlert } from 'dashboard/composables';
import Translation from '../Translation.vue';

const env = vi.hoisted(() => ({}));

vi.mock('dashboard/composables', () => ({ useAlert: vi.fn() }));
vi.mock('vuex', async importOriginal => ({
  ...(await importOriginal()),
  useStore: () => ({ dispatch: env.dispatch }),
}));
vi.mock('vue-router', async importOriginal => ({
  ...(await importOriginal()),
  useRouter: () => ({ push: env.push }),
}));
vi.mock('dashboard/composables/useTranslationPlan', () => ({
  useTranslationPlan: () => ({ needsUpgrade: env.needsUpgrade }),
}));
vi.mock('dashboard/composables/useAccount', async () => {
  const { computed } = await import('vue');
  return {
    useAccount: () => ({
      accountId: computed(() => 1),
      currentAccount: computed(() => env.account),
      updateAccount: (...args) => env.updateAccount(...args),
    }),
  };
});
vi.mock('dashboard/composables/store', async () => {
  const { computed } = await import('vue');
  return {
    useMapGetter: () =>
      computed(() => (id, flag) => id === 1 && env.flags.includes(flag)),
    useFunctionGetter: (key, name) =>
      computed(() => (name === 'google_translate' ? env.google : {})),
  };
});

const RadioCard = {
  name: 'RadioCard',
  props: ['id', 'isActive', 'disabled', 'disabledLabel', 'label'],
  emits: ['select'],
  template:
    '<div class="radio" :data-id="id" @click="$emit(\'select\', id)"><slot name="icon" /></div>',
};
const Switch = {
  name: 'Switch',
  props: ['modelValue', 'disabled'],
  emits: ['update:modelValue', 'change'],
  template: '<input type="checkbox" class="switch" />',
};
const NextButton = {
  name: 'NextButton',
  props: ['label'],
  emits: ['click'],
  template: '<button @click="$emit(\'click\')">{{ label }}</button>',
};

const mountSection = () =>
  mount(Translation, {
    global: {
      stubs: {
        RadioCard,
        Switch,
        NextButton,
        Button: NextButton,
        RouterLink: {
          props: ['to'],
          template: '<a class="connect"><slot /></a>',
        },
      },
    },
  });

const card = (wrapper, id) =>
  wrapper.findAllComponents(RadioCard).find(c => c.props('id') === id);

describe('Translation settings behaviour', () => {
  beforeEach(() => {
    env.dispatch = vi.fn();
    env.push = vi.fn();
    env.needsUpgrade = ref(false);
    env.flags = ['captain_tasks', 'auto_translate'];
    env.google = { enabled: true };
    env.account = reactive({ settings: { auto_translate: true } });
    env.updateAccount = vi.fn().mockResolvedValue();
  });

  it('asks to upgrade when the plan lacks translation', async () => {
    env.needsUpgrade.value = true;
    const wrapper = mountSection();
    expect(env.dispatch).toHaveBeenCalledWith('integrations/get');
    expect(wrapper.find('.radio').exists()).toBe(false);
    await wrapper.find('button').trigger('click');
    expect(env.push).toHaveBeenCalledWith({ name: 'billing_settings_index' });
  });

  it('defaults to Captain and saves the chosen provider', async () => {
    const wrapper = mountSection();
    expect(card(wrapper, 'captain').props('isActive')).toBe(true);
    expect(card(wrapper, 'google_translate').props()).toMatchObject({
      isActive: false,
      disabled: false,
    });
    expect(wrapper.find('.connect').exists()).toBe(false);
    const toggle = wrapper.findComponent(Switch);
    expect(toggle.props()).toEqual({ modelValue: true, disabled: false });
    expect(wrapper.text()).toContain(
      'GENERAL_SETTINGS.FORM.TRANSLATION.AUTO_TRANSLATE.NOTE'
    );

    await card(wrapper, 'google_translate').trigger('click');
    await flushPromises();
    expect(env.updateAccount).toHaveBeenCalledWith(
      { translation_provider: 'google_translate' },
      { silent: true }
    );
    expect(useAlert).toHaveBeenCalledWith(
      'GENERAL_SETTINGS.FORM.TRANSLATION.API.SUCCESS'
    );

    env.updateAccount.mockRejectedValueOnce(new Error('nope'));
    await toggle.vm.$emit('update:modelValue', false);
    await toggle.vm.$emit('change');
    await flushPromises();
    expect(env.updateAccount).toHaveBeenLastCalledWith(
      { auto_translate: false },
      { silent: true }
    );
    expect(useAlert).toHaveBeenCalledWith(
      'GENERAL_SETTINGS.FORM.TRANSLATION.API.ERROR'
    );

    env.account.settings = { translation_provider: 'google_translate' };
    await nextTick();
    expect(card(wrapper, 'google_translate').props('isActive')).toBe(true);
    expect(toggle.props('modelValue')).toBe(false);
  });

  it('locks auto-translate without a usable provider', () => {
    env.flags = ['auto_translate'];
    env.google = {};
    env.account = reactive({});
    const wrapper = mountSection();
    expect(card(wrapper, 'captain')).toBeUndefined();
    expect(card(wrapper, 'google_translate').props('disabled')).toBe(true);
    expect(wrapper.find('.connect').exists()).toBe(true);
    expect(wrapper.findComponent(Switch).props('disabled')).toBe(true);
    expect(wrapper.text()).toContain(
      'GENERAL_SETTINGS.FORM.TRANSLATION.AUTO_TRANSLATE.LOCKED'
    );
  });

  it('locks auto-translate when the feature is off', () => {
    env.flags = ['captain_tasks'];
    const wrapper = mountSection();
    expect(wrapper.findComponent(Switch).props()).toEqual({
      modelValue: false,
      disabled: true,
    });
    expect(wrapper.find('.text-n-amber-11').text()).toBe(
      'GENERAL_SETTINGS.FORM.TRANSLATION.AUTO_TRANSLATE.NOT_AVAILABLE'
    );
  });
});
