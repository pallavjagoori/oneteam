/**
 * OneTeam behaviour spec for the Captain assistant tools banner.
 *
 * Covers showing it before its expiry date, hiding it once dismissed,
 * after expiry or when previously dismissed, opening the learn-more
 * dialog, and acknowledging it (dismissing and closing).
 */
import { mount } from '@vue/test-utils';
import AssistantToolsBanner from '../AssistantToolsBanner.vue';
import { LocalStorage } from 'shared/helpers/localStorage';

vi.mock('shared/helpers/localStorage', () => ({
  LocalStorage: { get: vi.fn(), set: vi.fn() },
}));

const open = vi.fn();
const close = vi.fn();
const Dialog = {
  name: 'Dialog',
  emits: ['confirm'],
  setup: () => ({ open, close }),
  template: '<div class="dialog"><slot name="description" /></div>',
};
const Button = {
  name: 'Button',
  props: ['icon'],
  emits: ['click'],
  template: '<button :class="icon" @click="$emit(\'click\')" />',
};
const mountBanner = () =>
  mount(AssistantToolsBanner, {
    global: {
      stubs: {
        Dialog,
        Button,
        Banner: { template: '<p><slot /><slot name="actions" /></p>' },
      },
      directives: { tooltip: {} },
    },
  });

describe('AssistantToolsBanner behaviour', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows before expiry, opens details and dismisses', async () => {
    vi.useFakeTimers({ now: new Date(2026, 9, 15) });
    const wrapper = mountBanner();
    const banner = wrapper.find('p');
    expect(banner.classes()).not.toContain('hidden');
    expect(wrapper.text()).toContain(
      'ASSISTANT_TOOLS_BANNER.MODAL_DESCRIPTION'
    );

    await wrapper.find('button').trigger('click');
    expect(open).toHaveBeenCalled();
    wrapper.findComponent(Dialog).vm.$emit('confirm');
    await wrapper.vm.$nextTick();
    expect(close).toHaveBeenCalled();
    expect(LocalStorage.set).toHaveBeenCalledWith(expect.any(String), true);
    expect(wrapper.find('p').classes()).toContain('hidden');

    const again = mountBanner();
    await again.find('.i-lucide-x').trigger('click');
    expect(again.find('p').classes()).toContain('hidden');
  });

  it('stays hidden once dismissed or expired', () => {
    vi.useFakeTimers({ now: new Date(2026, 9, 15) });
    LocalStorage.get.mockReturnValueOnce(true);
    expect(mountBanner().find('p').classes()).toContain('hidden');
    vi.setSystemTime(new Date(2026, 10, 2));
    expect(mountBanner().find('p').classes()).toContain('hidden');
  });
});
