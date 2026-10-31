/**
 * OneTeam behaviour spec for the call recording player. The behaviour
 * lives in the shared audioPlayerSuite next to the message AudioPlayer.
 */
import { defineAudioPlayerSuite } from 'dashboard/components-next/audio/specs/audioPlayerSuite';
import CallRecordingPlayer from '../CallRecordingPlayer.vue';

vi.mock('@chatwoot/utils', async importOriginal => ({
  ...(await importOriginal()),
  downloadFile: vi.fn(),
}));

defineAudioPlayerSuite({
  title: 'CallRecordingPlayer behaviour',
  component: CallRecordingPlayer,
  icons: ['i-lucide-play', 'i-lucide-pause'],
});
