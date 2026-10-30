import notificationsAPI from '../notifications';
import { useAxiosMock } from './oneteamAxiosMock';

describe('NotificationsAPI (OneTeam)', () => {
  const axios = useAxiosMock();
  const url = '/api/v1/accounts/1/notifications';

  it('lists notifications, sending only the filters that are set', () => {
    notificationsAPI.get({ page: 2, status: 'read', sortOrder: 'desc' });
    expect(axios.get).toHaveBeenCalledWith(url, {
      params: { page: 2, sort_order: 'desc', includes: ['read'] },
    });
  });

  it('fetches the notifications of a contact', () => {
    notificationsAPI.getNotifications(4);
    expect(axios.get).toHaveBeenCalledWith(`${url}/4/notifications`);
  });

  it('fetches the unread count', () => {
    notificationsAPI.getUnreadCount();
    expect(axios.get).toHaveBeenCalledWith(`${url}/unread_count`);
  });

  it('marks the notifications of an actor as read', () => {
    notificationsAPI.read('Conversation', 9);
    expect(axios.post).toHaveBeenCalledWith(`${url}/read_all`, {
      primary_actor_type: 'Conversation',
      primary_actor_id: 9,
    });
  });

  it('marks a notification as unread', () => {
    notificationsAPI.unRead(4);
    expect(axios.post).toHaveBeenCalledWith(`${url}/4/unread`);
  });

  it('marks everything as read', () => {
    notificationsAPI.readAll();
    expect(axios.post).toHaveBeenCalledWith(`${url}/read_all`);
  });

  it('deletes a notification', () => {
    notificationsAPI.delete(4);
    expect(axios.delete).toHaveBeenCalledWith(`${url}/4`);
  });

  it('deletes notifications of a type, all by default', () => {
    notificationsAPI.deleteAll({ type: 'read' });
    expect(axios.post).toHaveBeenCalledWith(`${url}/destroy_all`, {
      type: 'read',
    });
    notificationsAPI.deleteAll({});
    expect(axios.post).toHaveBeenLastCalledWith(`${url}/destroy_all`, {
      type: 'all',
    });
  });

  it('snoozes a notification, indefinitely by default', () => {
    notificationsAPI.snooze({ id: 4, snoozedUntil: 100 });
    expect(axios.post).toHaveBeenCalledWith(`${url}/4/snooze`, {
      snoozed_until: 100,
    });
    notificationsAPI.snooze({ id: 4 });
    expect(axios.post).toHaveBeenLastCalledWith(`${url}/4/snooze`, {
      snoozed_until: null,
    });
  });
});
