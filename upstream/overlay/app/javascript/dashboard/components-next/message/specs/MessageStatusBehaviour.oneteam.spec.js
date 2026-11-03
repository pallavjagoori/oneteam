/**
 * OneTeam behaviour spec for the message delivery status icon.
 *
 * Covers the sent, delivered and read icons and colours, the rotating
 * clock while a message is sending, and the status validator.
 */
import { mount } from '@vue/test-utils';
import MessageStatus from '../MessageStatus.vue';

vi.mock('vue-i18n', async importOriginal => ({
  ...(await importOriginal()),
  useI18n: () => ({ t: key => key }),
}));

const Icon = { name: 'Icon', props: ['icon'], template: '<i />' };

/**
 * Mounts the status icon, capturing tooltip text.
 *
 * @param {string} status Message status.
 * @returns {{ wrapper: import('@vue/test-utils').VueWrapper, tip: { value?: string } }}
 *   The wrapper and the last tooltip value.
 */
const mountStatus = status => {
  const tip = {};
  const wrapper = mount(MessageStatus, {
    props: { status },
    global: {
      stubs: { Icon },
      directives: {
        tooltip: (el, binding) => {
          tip.value = binding.value;
        },
      },
    },
  });
  return { wrapper, tip };
};

describe('MessageStatus behaviour', () => {
  afterEach(() => vi.useRealTimers());

  it.each([
    ['sent', 'i-lucide-check', 'text-n-slate-10', 'CHAT_LIST.SENT'],
    [
      'delivered',
      'i-lucide-check-check',
      'text-n-slate-10',
      'CHAT_LIST.DELIVERED',
    ],
    [
      'read',
      'i-lucide-check-check',
      'text-[#7EB6FF]',
      'CHAT_LIST.MESSAGE_READ',
    ],
  ])('shows the %s icon', (status, icon, colour, text) => {
    const { wrapper, tip } = mountStatus(status);
    const el = wrapper.getComponent(Icon);
    expect(el.props('icon')).toBe(icon);
    expect(el.classes()).toContain(colour);
    expect(tip.value).toBe(text);
  });

  it('rotates the clock while sending', async () => {
    vi.useFakeTimers();
    const { wrapper, tip } = mountStatus('progress');
    const icon = () => wrapper.getComponent(Icon).props('icon');
    expect(icon()).toBe('i-lucide-clock-1');
    expect(tip.value).toBe('CHAT_LIST.SENDING');
    await vi.advanceTimersByTimeAsync(500);
    expect(icon()).toBe('i-lucide-clock-2');
    await vi.advanceTimersByTimeAsync(5500);
    expect(icon()).toBe('i-lucide-clock-1');
    wrapper.unmount();
  });

  it('validates the status', () => {
    const { validator } = MessageStatus.props.status;
    expect(validator('failed')).toBe(true);
    expect(validator('bogus')).toBe(false);
  });
});
