/**
 * OneTeam behaviour spec for the compact audio player used in messages.
 * The behaviour lives in the shared audioPlayerSuite.
 */
import { defineAudioPlayerSuite } from './audioPlayerSuite';
import AudioPlayer from '../AudioPlayer.vue';

vi.mock('@chatwoot/utils', async importOriginal => ({
  ...(await importOriginal()),
  downloadFile: vi.fn(),
}));

defineAudioPlayerSuite({
  title: 'AudioPlayer behaviour',
  component: AudioPlayer,
  icons: ['i-woot-audio-play', 'i-woot-audio-pause'],
});
