/**
 * OneTeam behaviour spec for copying a Stripe subscription id.
 *
 * The side panel's copy button passes the subscription id to vueuse's
 * clipboard helper and switches to the "copied" label once it reports
 * success.
 */
import { ref } from 'vue';
import { mount } from '@vue/test-utils';
import StripeSubscription from '../StripeSubscription.vue';

const env = vi.hoisted(() => ({ copy: null, copied: null }));

vi.mock('@vueuse/core', async importOriginal => ({
  ...(await importOriginal()),
  useClipboard: () => ({ copy: env.copy, copied: env.copied }),
}));

const SidePanel = {
  name: 'SidePanel',
  methods: { open() {} },
  template: '<div class="panel"><slot /></div>',
};
const Button = {
  name: 'Button',
  props: {
    label: { type: String, default: '' },
    icon: { type: String, default: '' },
  },
  emits: ['click'],
  template:
    '<button class="copy" @click="$emit(\'click\')">{{ label }}</button>',
};

const subscription = {
  id: 'sub_123',
  status: 'active',
  items: [{ id: 'si_1', name: 'Pro', unit_amount: null }],
};

describe('StripeSubscription copy behaviour', () => {
  beforeEach(() => {
    env.copy = vi.fn();
    env.copied = ref(false);
  });

  it('copies the subscription id and shows the copied state', async () => {
    const wrapper = mount(StripeSubscription, {
      props: { subscription },
      global: { stubs: { SidePanel, Button, Label: true } },
    });
    const copyButton = wrapper
      .findAllComponents(Button)
      .find(button => button.props('icon') === 'i-lucide-copy');
    expect(copyButton.props('label')).toBe('STRIPE_INTEGRATION.COPY_ID');
    await copyButton.trigger('click');
    expect(env.copy).toHaveBeenCalledWith('sub_123');
    env.copied.value = true;
    await wrapper.vm.$nextTick();
    expect(
      wrapper
        .findAllComponents(Button)
        .find(button => button.props('icon') === 'i-lucide-check')
        .props('label')
    ).toBe('STRIPE_INTEGRATION.COPIED');
  });
});
