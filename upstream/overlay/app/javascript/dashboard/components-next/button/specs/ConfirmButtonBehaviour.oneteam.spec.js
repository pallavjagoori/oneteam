/**
 * OneTeam behaviour spec for the two-step confirm button.
 *
 * Covers the first click switching to the confirm label, colour and hint,
 * the second click emitting and resetting after the bounce, resetting on
 * blur, and passing default and icon slots through to the button.
 */
import { mount } from '@vue/test-utils';
import ConfirmButton from '../ConfirmButton.vue';

const Button = {
  name: 'Button',
  props: ['label', 'color'],
  emits: ['click', 'blur'],
  template:
    '<button @click="$emit(\'click\')" @blur="$emit(\'blur\')"><slot name="icon" /><slot /></button>',
};

const mountButton = (props, slots) =>
  mount(ConfirmButton, {
    props: { label: 'Delete', confirmLabel: 'Sure?', ...props },
    slots,
    global: { stubs: { Button } },
  });

describe('ConfirmButton behaviour', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('confirms on the second click and resets after the bounce', async () => {
    vi.useFakeTimers();
    const wrapper = mountButton({ confirmHint: 'Click again' });
    const button = wrapper.findComponent(Button);
    expect(button.props()).toEqual({ label: 'Delete', color: 'blue' });
    await wrapper.find('button').trigger('click');
    expect(button.props()).toEqual({ label: 'Sure?', color: 'ruby' });
    expect(wrapper.text()).toContain('Click again');
    expect(wrapper.emitted('click')).toBeUndefined();

    await wrapper.find('button').trigger('click');
    expect(wrapper.emitted('click')).toHaveLength(1);
    expect(wrapper.classes()).toContain('animate-bounce-complete');
    vi.advanceTimersByTime(400);
    await wrapper.vm.$nextTick();
    expect(wrapper.classes()).not.toContain('animate-bounce-complete');
    expect(button.props('label')).toBe('Delete');
  });

  it('resets on blur, hides an empty hint and passes slots', async () => {
    const wrapper = mountButton(
      {},
      { default: '<b>Body</b>', icon: '<i>Icon</i>' }
    );
    expect(wrapper.find('b').text()).toBe('Body');
    expect(wrapper.find('i').text()).toBe('Icon');
    await wrapper.find('button').trigger('click');
    expect(wrapper.find('.absolute').exists()).toBe(false);
    await wrapper.find('button').trigger('blur');
    expect(wrapper.findComponent(Button).props('label')).toBe('Delete');
  });
});
