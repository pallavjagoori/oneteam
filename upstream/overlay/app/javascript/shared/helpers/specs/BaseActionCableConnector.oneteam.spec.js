/**
 * OneTeam specs for the shared ActionCable connector: the presence
 * heartbeat, event dispatch, and reconnecting after the socket drops.
 */
import { createConsumer } from '@rails/actioncable';
import BaseActionCableConnector from '../BaseActionCableConnector';

vi.mock('@rails/actioncable', () => ({ createConsumer: vi.fn() }));

describe('BaseActionCableConnector', () => {
  let consumer;
  let subscriptionCallbacks;
  const app = {
    $store: { getters: { getCurrentAccountId: 4, getCurrentUserID: 9 } },
  };

  beforeEach(() => {
    vi.useFakeTimers();
    consumer = {
      connection: { isOpen: vi.fn(() => false) },
      disconnect: vi.fn(),
      subscriptions: {
        create: vi.fn((params, callbacks) => {
          subscriptionCallbacks = callbacks;
          return { ...callbacks, perform: vi.fn(), params };
        }),
      },
    };
    createConsumer.mockReturnValue(consumer);
    BaseActionCableConnector.isDisconnected = false;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('subscribes to the room for the current user and account', () => {
    const connector = new BaseActionCableConnector(
      app,
      'pubsub-1',
      'wss://rt.test',
      500
    );

    expect(createConsumer).toHaveBeenCalledWith('wss://rt.test/cable');
    expect(consumer.subscriptions.create.mock.calls[0][0]).toEqual({
      channel: 'RoomChannel',
      pubsub_token: 'pubsub-1',
      account_id: 4,
      user_id: 9,
    });
    expect(connector.app).toBe(app);
  });

  it('uses the page host when no websocket host is set', () => {
    // eslint-disable-next-line no-new
    new BaseActionCableConnector(app, 'pubsub-1');

    expect(createConsumer).toHaveBeenCalledWith(undefined);
  });

  it('sends a presence update on every interval', () => {
    const connector = new BaseActionCableConnector(app, 'pubsub-1', '', 500);
    const update = vi.spyOn(connector.subscription, 'updatePresence');

    vi.advanceTimersByTime(1000);

    expect(update).toHaveBeenCalledTimes(2);
  });

  it('asks the server to update presence', () => {
    const subscription = { perform: vi.fn() };

    subscriptionCallbacks = null;
    // eslint-disable-next-line no-new
    new BaseActionCableConnector(app, 'pubsub-1');
    subscriptionCallbacks.updatePresence.call(subscription);

    expect(subscription.perform).toHaveBeenCalledWith('update_presence');
  });

  it('passes received events to their handlers when the event is valid', () => {
    const connector = new BaseActionCableConnector(app, 'pubsub-1');
    const handler = vi.fn();
    connector.events = { 'message.created': handler, broken: 'not a function' };

    connector.onReceived({ event: 'message.created', data: { id: 1 } });
    connector.onReceived({ event: 'broken', data: {} });
    connector.onReceived({ event: 'unknown', data: {} });
    connector.onReceived();
    connector.isAValidEvent = () => false;
    connector.onReceived({ event: 'message.created', data: { id: 2 } });

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith({ id: 1 });
  });

  it('retries every second after a disconnect until the socket is back', () => {
    const connector = new BaseActionCableConnector(app, 'pubsub-1', '', 60000);
    const onDisconnected = vi.spyOn(connector, 'onDisconnected');
    const onReconnect = vi.spyOn(connector, 'onReconnect');

    subscriptionCallbacks.disconnected();
    expect(BaseActionCableConnector.isDisconnected).toBe(true);
    expect(onDisconnected).toHaveBeenCalled();

    vi.advanceTimersByTime(1000);
    vi.advanceTimersByTime(1000);
    expect(consumer.connection.isOpen).toHaveBeenCalledTimes(2);
    expect(onReconnect).not.toHaveBeenCalled();

    consumer.connection.isOpen.mockReturnValue(true);
    vi.advanceTimersByTime(1000);
    expect(onReconnect).toHaveBeenCalledTimes(1);
    expect(BaseActionCableConnector.isDisconnected).toBe(false);
    expect(connector.reconnectTimer).toBeNull();

    vi.advanceTimersByTime(5000);
    expect(consumer.connection.isOpen).toHaveBeenCalledTimes(3);
  });

  it('keeps checking while the socket is open but was never marked disconnected', () => {
    const connector = new BaseActionCableConnector(app, 'pubsub-1', '', 60000);
    consumer.connection.isOpen.mockReturnValue(true);

    connector.checkConnection();

    expect(connector.reconnectTimer).not.toBeNull();
  });

  it('has no-op reconnect hooks and closes the socket on disconnect', () => {
    const connector = new BaseActionCableConnector(app, 'pubsub-1');

    expect(connector.onReconnect()).toBeUndefined();
    expect(connector.onDisconnected()).toBeUndefined();
    connector.disconnect();
    expect(consumer.disconnect).toHaveBeenCalled();
  });
});
