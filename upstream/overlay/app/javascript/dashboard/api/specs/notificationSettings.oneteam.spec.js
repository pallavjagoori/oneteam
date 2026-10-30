import notificationSubscriptionAPI from '../notificationSubscription';
import userNotificationSettingsAPI from '../userNotificationSettings';
import { useAxiosMock } from './oneteamAxiosMock';

describe('notification settings APIs (OneTeam)', () => {
  const axios = useAxiosMock();

  it('points push subscriptions at the unscoped endpoint', () => {
    expect(notificationSubscriptionAPI.url).toBe(
      '/api/v1/notification_subscriptions'
    );
  });

  it('updates the notification settings', () => {
    userNotificationSettingsAPI.update({ email: ['assigned'] });
    expect(axios.patch).toHaveBeenCalledWith(
      '/api/v1/accounts/1/notification_settings',
      { email: ['assigned'] }
    );
  });
});
