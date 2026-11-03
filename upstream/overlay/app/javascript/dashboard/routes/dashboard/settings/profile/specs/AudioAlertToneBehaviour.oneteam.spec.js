/**
 * OneTeam behaviour spec for the alert tone picker.
 *
 * Covers listing the tones with the current one selected, emitting a new
 * tone, playing the selected tone, and reporting playback errors.
 */
import { mount, flushPromises } from '@vue/test-utils';
import * as Sentry from '@sentry/vue';
import AudioAlertTone from '../AudioAlertTone.vue';

vi.mock('@sentry/vue', () => ({ captureException: vi.fn() }));

const FormSelect = {
  name: 'FormSelect',
  props: ['modelValue', 'label', 'options'],
  emits: ['update:modelValue'],
  template: '<select><slot /></select>',
};
const mountTone = () =>
  mount(AudioAlertTone, {
    props: { value: 'bell', label: 'Tone' },
    global: {
      stubs: { FormSelect, Icon: true },
      directives: { tooltip: {} },
    },
  });

describe('AudioAlertTone behaviour', () => {
  it('lists tones and emits a change', () => {
    const wrapper = mountTone();
    const select = wrapper.findComponent(FormSelect);
    expect(select.props()).toMatchObject({ modelValue: 'bell', label: 'Tone' });
    const options = wrapper.findAll('option');
    expect(options.map(option => option.text())).toEqual([
      'Ding',
      'Bell',
      'Chime',
      'Magic',
      'Ping',
    ]);
    expect(options[1].element.selected).toBe(true);
    select.vm.$emit('update:modelValue', 'ping');
    expect(wrapper.emitted('change')).toEqual([['ping']]);
  });

  it('plays the tone and reports failures', async () => {
    const play = vi
      .spyOn(window.HTMLMediaElement.prototype, 'play')
      .mockResolvedValueOnce()
      .mockRejectedValueOnce(new Error('blocked'));
    const wrapper = mountTone();
    await wrapper.find('button').trigger('click');
    await flushPromises();
    expect(play).toHaveBeenCalledTimes(1);
    expect(Sentry.captureException).not.toHaveBeenCalled();
    await wrapper.find('button').trigger('click');
    await flushPromises();
    expect(Sentry.captureException).toHaveBeenCalled();
    play.mockRestore();
  });
});
