/**
 * OneTeam shared behaviour suite for Chatwoot's compact audio players
 * (message audio and call recordings share the same logic).
 *
 * Covers the fallback and loaded durations, play/pause with the icon
 * change, pausing other players when one starts, time updates, seeking,
 * ending, cycling playback speed, and downloading the file.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { downloadFile } from '@chatwoot/utils';
import { emitter } from 'shared/helpers/mitt';

const Button = {
  name: 'Button',
  props: ['label'],
  emits: ['click'],
  template:
    '<button @click="$emit(\'click\', $event)"><slot name="icon" />{{ label }}</button>',
};
const Icon = {
  name: 'Icon',
  props: ['icon'],
  template: '<i :data-icon="icon" />',
};

/**
 * Registers the shared suite for one player component.
 *
 * @param {object} options
 * @param {string} options.title Suite title.
 * @param {object} options.component The player component.
 * @param {string[]} options.icons The [play, pause] icon names.
 */
export const defineAudioPlayerSuite = ({ title, component, icons }) => {
  const [playIcon, pauseIcon] = icons;
  let wrappers = [];

  const mountPlayer = (props = {}) => {
    const wrapper = mount(component, {
      props: { src: 'https://cdn.example.com/call.mp3', ...props },
      global: { stubs: { Button, Icon } },
    });
    wrappers.push(wrapper);
    return wrapper;
  };
  const audio = wrapper => wrapper.find('audio').element;
  const buttons = wrapper => wrapper.findAll('button');
  const time = wrapper => wrapper.find('span').text();
  const playIconName = wrapper =>
    buttons(wrapper)[0].find('i').attributes('data-icon');

  describe(title, () => {
    beforeEach(() => {
      vi.spyOn(HTMLMediaElement.prototype, 'play').mockImplementation(() => {});
      vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(
        () => {}
      );
    });

    afterEach(() => {
      wrappers.forEach(wrapper => wrapper.unmount());
      wrappers = [];
    });

    it('shows the fallback duration until metadata loads', async () => {
      const wrapper = mountPlayer({ fallbackDuration: 75 });
      expect(time(wrapper)).toBe('01:15');
      expect(wrapper.find('input').attributes('max')).toBe('75');
      Object.defineProperty(audio(wrapper), 'duration', {
        value: Infinity,
        configurable: true,
      });
      await wrapper.find('audio').trigger('loadedmetadata');
      expect(time(wrapper)).toBe('01:15');
      Object.defineProperty(audio(wrapper), 'duration', {
        value: 125,
        configurable: true,
      });
      await wrapper.find('audio').trigger('loadedmetadata');
      expect(time(wrapper)).toBe('02:05');
    });

    it('shows 00:00 without a duration', () => {
      const wrapper = mountPlayer();
      expect(time(wrapper)).toBe('00:00');
      expect(wrapper.find('input').attributes('max')).toBe('0');
    });

    it('plays and pauses', async () => {
      const wrapper = mountPlayer({ fallbackDuration: 30 });
      expect(playIconName(wrapper)).toBe(playIcon);
      await buttons(wrapper)[0].trigger('click');
      expect(HTMLMediaElement.prototype.play).toHaveBeenCalled();
      expect(playIconName(wrapper)).toBe(pauseIcon);
      expect(time(wrapper)).toBe('00:00');
      await buttons(wrapper)[0].trigger('click');
      expect(HTMLMediaElement.prototype.pause).toHaveBeenCalled();
      expect(playIconName(wrapper)).toBe(playIcon);
    });

    it('pauses when another player starts', async () => {
      const first = mountPlayer();
      const second = mountPlayer();
      await buttons(first)[0].trigger('click');
      await buttons(second)[0].trigger('click');
      await flushPromises();
      expect(playIconName(first)).toBe(playIcon);
      expect(playIconName(second)).toBe(pauseIcon);
      emitter.emit('pause_playing_audio', 'someone-else');
      await flushPromises();
      expect(playIconName(second)).toBe(playIcon);
    });

    it('follows time updates, seeks and resets at the end', async () => {
      const wrapper = mountPlayer({ fallbackDuration: 200 });
      audio(wrapper).currentTime = 61;
      await wrapper.find('audio').trigger('timeupdate');
      expect(time(wrapper)).toBe('01:01');
      await wrapper.find('input').setValue('90');
      expect(audio(wrapper).currentTime).toBe(90);
      expect(time(wrapper)).toBe('01:30');
      await wrapper.find('audio').trigger('ended');
      expect(time(wrapper)).toBe('03:20');
    });

    it('cycles playback speed', async () => {
      const wrapper = mountPlayer();
      const speed = () => buttons(wrapper)[1];
      expect(speed().text()).toBe('1x');
      await speed().trigger('click');
      expect(speed().text()).toBe('1.5x');
      expect(audio(wrapper).playbackRate).toBe(1.5);
      await speed().trigger('click');
      await speed().trigger('click');
      expect(speed().text()).toBe('1x');
    });

    it('downloads the recording', async () => {
      const wrapper = mountPlayer();
      await buttons(wrapper)[2].trigger('click');
      expect(downloadFile).toHaveBeenCalledWith({
        url: 'https://cdn.example.com/call.mp3',
        type: 'audio',
      });
    });
  });
};
