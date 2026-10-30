import { Device } from '@twilio/voice-sdk';
import VoiceAPI from '../channel/voice/voiceAPIClient';
import twilioVoiceClient from '../channel/voice/twilioVoiceClient';

vi.mock('@twilio/voice-sdk', () => ({ Device: vi.fn() }));
vi.mock('../channel/voice/voiceAPIClient', () => ({
  default: { getToken: vi.fn() },
}));

// A fake Twilio connection or device: records handlers so tests can fire them.
const emitter = extra => {
  const handlers = {};
  return {
    handlers,
    on: vi.fn((event, handler) => {
      handlers[event] = handler;
    }),
    ...extra,
  };
};

describe('TwilioVoiceClient (OneTeam)', () => {
  let device;

  beforeEach(() => {
    device = emitter({
      removeAllListeners: vi.fn(),
      updateToken: vi.fn(),
      disconnectAll: vi.fn(),
      destroy: vi.fn(),
      connect: vi.fn(),
    });
    Device.mockImplementation(function MockDevice() {
      return device;
    });
    VoiceAPI.getToken.mockResolvedValue({ token: 't1', account_id: 9 });
  });

  afterEach(() => {
    twilioVoiceClient.destroyDevice();
  });

  it('creates a device with a fresh token', async () => {
    await twilioVoiceClient.initializeDevice(4);
    expect(Device).toHaveBeenCalledWith('t1', {
      allowIncomingWhileBusy: true,
      disableAudioContextSounds: true,
      appParams: { account_id: 9 },
    });
    expect(twilioVoiceClient.initialized).toBe(true);
    expect(twilioVoiceClient.inboxId).toBe(4);
  });

  it('fails without a token', async () => {
    VoiceAPI.getToken.mockResolvedValue(undefined);
    await expect(twilioVoiceClient.initializeDevice(4)).rejects.toThrow(
      'Invalid token'
    );
  });

  it('tracks connections and announces disconnects', async () => {
    await twilioVoiceClient.initializeDevice(4);
    const listener = vi.fn();
    twilioVoiceClient.addEventListener('call:disconnected', listener);

    const connection = emitter();
    device.handlers.connect(connection);
    expect(twilioVoiceClient.hasActiveConnection).toBe(true);

    connection.handlers.disconnect();
    expect(twilioVoiceClient.hasActiveConnection).toBe(false);
    device.handlers.disconnect();
    expect(listener).toHaveBeenCalledTimes(2);
    twilioVoiceClient.removeEventListener('call:disconnected', listener);
  });

  it('renews the token before it expires, only when one comes back', async () => {
    await twilioVoiceClient.initializeDevice(4);
    VoiceAPI.getToken.mockResolvedValue({ token: 't2' });
    await device.handlers.tokenWillExpire();
    expect(device.updateToken).toHaveBeenCalledWith('t2');

    VoiceAPI.getToken.mockResolvedValue(null);
    await device.handlers.tokenWillExpire();
    expect(device.updateToken).toHaveBeenCalledTimes(1);
  });

  it('mutes only with an active connection', async () => {
    expect(twilioVoiceClient.setMuted(true)).toBe(false);
    await twilioVoiceClient.initializeDevice(4);
    const connection = emitter({ mute: vi.fn() });
    device.handlers.connect(connection);
    expect(twilioVoiceClient.setMuted(true)).toBe(true);
    expect(connection.mute).toHaveBeenCalledWith(true);
  });

  it('ends a call, with or without a connection or device', async () => {
    twilioVoiceClient.endClientCall();
    await twilioVoiceClient.initializeDevice(4);
    const connection = emitter({ disconnect: vi.fn() });
    device.handlers.connect(connection);
    twilioVoiceClient.endClientCall();
    expect(connection.disconnect).toHaveBeenCalled();
    expect(device.disconnectAll).toHaveBeenCalled();
    expect(twilioVoiceClient.hasActiveConnection).toBe(false);
  });

  it('destroys the previous device when initializing again', async () => {
    await twilioVoiceClient.initializeDevice(4);
    const first = device;
    await twilioVoiceClient.initializeDevice(5);
    expect(first.destroy).toHaveBeenCalled();
  });

  describe('joinClientCall', () => {
    const call = {
      to: 'conf-1',
      conversationId: 2,
      callSid: 's',
      attemptId: 'a',
    };

    it('does nothing without a ready device or a destination', async () => {
      await expect(twilioVoiceClient.joinClientCall(call)).resolves.toBeNull();
      await twilioVoiceClient.initializeDevice(4);
      await expect(
        twilioVoiceClient.joinClientCall({ ...call, to: '' })
      ).resolves.toBeNull();
    });

    it('connects with the call parameters', async () => {
      await twilioVoiceClient.initializeDevice(4);
      const connection = emitter();
      device.connect.mockResolvedValue(connection);
      await expect(twilioVoiceClient.joinClientCall(call)).resolves.toBe(
        connection
      );
      expect(device.connect).toHaveBeenCalledWith({
        params: {
          To: 'conf-1',
          is_agent: 'true',
          conversation_id: 2,
          call_sid: 's',
          attempt_id: 'a',
        },
      });
      expect(connection.on).toHaveBeenCalledWith(
        'disconnect',
        twilioVoiceClient.onDisconnect
      );
    });

    it('reuses an existing connection', async () => {
      await twilioVoiceClient.initializeDevice(4);
      const connection = emitter();
      device.handlers.connect(connection);
      await expect(twilioVoiceClient.joinClientCall(call)).resolves.toBe(
        connection
      );
      expect(device.connect).not.toHaveBeenCalled();
    });
  });
});
