/**
 * OneTeam behaviour spec for the Copilot message input.
 *
 * Covers sending with Enter, ignoring Enter while an IME composes,
 * and skipping the height fix once the textarea is gone.
 */
import { flushPromises, mount } from '@vue/test-utils';
import CopilotInput from '../CopilotInput.vue';

/**
 * Mounts the input.
 *
 * @param {Function} onSend send handler
 * @returns {import('@vue/test-utils').VueWrapper}
 */
const mountInput = onSend =>
  mount(CopilotInput, {
    props: { onSend },
    global: { mocks: { $t: key => key } },
  });

describe('CopilotInput behaviour', () => {
  it('sends with Enter and ignores composing Enter presses', async () => {
    const onSend = vi.fn(() => true);
    const wrapper = mountInput(onSend);
    const textarea = wrapper.find('textarea');
    await textarea.setValue('Hello');

    await textarea.trigger('keydown.enter', { isComposing: true });
    expect(onSend).not.toHaveBeenCalled();

    await textarea.trigger('keydown.enter');
    await flushPromises();
    expect(onSend).toHaveBeenCalledWith('Hello');
    expect(textarea.element.value).toBe('');
  });

  it('skips resizing once unmounted', async () => {
    const wrapper = mountInput(vi.fn());
    wrapper.unmount();
    await flushPromises();
    expect(wrapper.exists()).toBe(false);
  });
});
