# Notifications

**Area:** Collaboration

In-app, email and push notifications for agents, notification settings and subscriptions.

## HTTP routes (14)

| Verb | Path | Controller#action |
| --- | --- | --- |
| POST | `/api/v1/accounts/:account_id/notifications/read_all(.:format)` | `api/v1/accounts/notifications#read_all` |
| GET | `/api/v1/accounts/:account_id/notifications/unread_count(.:format)` | `api/v1/accounts/notifications#unread_count` |
| POST | `/api/v1/accounts/:account_id/notifications/destroy_all(.:format)` | `api/v1/accounts/notifications#destroy_all` |
| POST | `/api/v1/accounts/:account_id/notifications/:id/snooze(.:format)` | `api/v1/accounts/notifications#snooze` |
| POST | `/api/v1/accounts/:account_id/notifications/:id/unread(.:format)` | `api/v1/accounts/notifications#unread` |
| GET | `/api/v1/accounts/:account_id/notifications(.:format)` | `api/v1/accounts/notifications#index` |
| PATCH | `/api/v1/accounts/:account_id/notifications/:id(.:format)` | `api/v1/accounts/notifications#update` |
| PUT | `/api/v1/accounts/:account_id/notifications/:id(.:format)` | `api/v1/accounts/notifications#update` |
| DELETE | `/api/v1/accounts/:account_id/notifications/:id(.:format)` | `api/v1/accounts/notifications#destroy` |
| GET | `/api/v1/accounts/:account_id/notification_settings(.:format)` | `api/v1/accounts/notification_settings#show` |
| PATCH | `/api/v1/accounts/:account_id/notification_settings(.:format)` | `api/v1/accounts/notification_settings#update` |
| PUT | `/api/v1/accounts/:account_id/notification_settings(.:format)` | `api/v1/accounts/notification_settings#update` |
| DELETE | `/api/v1/notification_subscriptions(.:format)` | `api/v1/notification_subscriptions#destroy` |
| POST | `/api/v1/notification_subscriptions(.:format)` | `api/v1/notification_subscriptions#create` |

## Database tables (3)

`notification_settings`, `notification_subscriptions`, `notifications`

## Backend files (49)

### builders (3)

- `app/builders/notification_builder.rb`
- `app/builders/notification_subscription_builder.rb`
- `enterprise/app/builders/enterprise/notification_subscription_builder.rb` (EE)

### controllers (4)

- `app/controllers/api/v1/accounts/notification_settings_controller.rb`
- `app/controllers/api/v1/accounts/notifications_controller.rb`
- `app/controllers/api/v1/notification_subscriptions_controller.rb`
- `enterprise/app/controllers/enterprise/api/v1/notification_subscriptions_controller.rb` (EE)

### finders (1)

- `app/finders/notification_finder.rb`

### jobs (8)

- `app/jobs/migration/remove_message_notifications.rb`
- `app/jobs/migration/remove_stale_notifications_job.rb`
- `app/jobs/notification/delete_notification_job.rb`
- `app/jobs/notification/email_notification_job.rb`
- `app/jobs/notification/push_notification_job.rb`
- `app/jobs/notification/remove_duplicate_notification_job.rb`
- `app/jobs/notification/remove_old_notification_job.rb`
- `app/jobs/notification/reopen_snoozed_notifications_job.rb`

### lib (1)

- `lib/vapid_service.rb`

### listeners (1)

- `app/listeners/notification_listener.rb`

### mailers (6)

- `app/mailers/administrator_notifications/account_compliance_mailer.rb`
- `app/mailers/administrator_notifications/account_notification_mailer.rb`
- `app/mailers/administrator_notifications/base_mailer.rb`
- `app/mailers/administrator_notifications/channel_notifications_mailer.rb`
- `app/mailers/agent_notifications/conversation_notifications_mailer.rb`
- `enterprise/app/mailers/enterprise/agent_notifications/conversation_notifications_mailer.rb` (EE)

### models (5)

- `app/models/concerns/push_data_helper.rb`
- `app/models/notification.rb`
- `app/models/notification_setting.rb`
- `app/models/notification_subscription.rb`
- `enterprise/app/models/enterprise/notification.rb` (EE)

### services (10)

- `app/services/conversations/unread_counts/notifier.rb`
- `app/services/messages/new_message_notification_service.rb`
- `app/services/messages/send_email_notification_service.rb`
- `app/services/notification/email_notification_service.rb`
- `app/services/notification/fcm_service.rb`
- `app/services/notification/mark_conversation_read_service.rb`
- `app/services/notification/push_notification_service.rb`
- `app/services/notification/push_test_service.rb`
- `enterprise/app/services/enterprise/messages/new_message_notification_service.rb` (EE)
- `enterprise/app/services/internal/account_analysis/discord_notifier_service.rb` (EE)

### views (10)

- `app/views/api/v1/accounts/notification_settings/show.json.jbuilder`
- `app/views/api/v1/accounts/notifications/index.json.jbuilder`
- `app/views/mailers/administrator_notifications/account_compliance_mailer/account_deleted.liquid`
- `app/views/mailers/administrator_notifications/account_notification_mailer/account_deletion_for_inactivity.liquid`
- `app/views/mailers/administrator_notifications/account_notification_mailer/account_deletion_user_initiated.liquid`
- `app/views/mailers/administrator_notifications/channel_notifications_mailer/email_disconnect.liquid`
- `app/views/mailers/agent_notifications/conversation_notifications_mailer/assigned_conversation_new_message.liquid`
- `app/views/mailers/agent_notifications/conversation_notifications_mailer/conversation_creation.liquid`
- `app/views/mailers/agent_notifications/conversation_notifications_mailer/conversation_mention.liquid`
- `app/views/mailers/agent_notifications/conversation_notifications_mailer/participating_conversation_new_message.liquid`

## Ruby specs (32)

- `spec/builders/notification_builder_spec.rb`
- `spec/controllers/api/v1/accounts/notification_settings_controller_spec.rb`
- `spec/controllers/api/v1/accounts/notifications_controller_spec.rb`
- `spec/controllers/api/v1/notification_subscriptions_controller_spec.rb`
- `spec/enterprise/builders/notification_builder_spec.rb`
- `spec/enterprise/builders/notification_subscription_builder_spec.rb`
- `spec/enterprise/controllers/api/v1/notification_subscriptions_controller_spec.rb`
- `spec/enterprise/mailers/enterprise/agent_notifications/conversation_notifications_mailer_spec.rb`
- `spec/enterprise/models/notification_spec.rb`
- `spec/enterprise/services/enterprise/messages/new_message_notification_service_spec.rb`
- `spec/enterprise/services/internal/account_analysis/discord_notifier_service_spec.rb`
- `spec/finders/notification_finder_spec.rb`
- `spec/jobs/migration/remove_message_notifications_spec.rb`
- `spec/jobs/notification/delete_notification_job_spec.rb`
- `spec/jobs/notification/remove_duplicate_notification_job_spec.rb`
- `spec/jobs/notification/remove_old_notification_job_spec.rb`
- `spec/jobs/notification/reopen_snoozed_notifications_job_spec.rb`
- `spec/lib/vapid_service_spec.rb`
- `spec/listeners/notification_listener_spec.rb`
- `spec/mailers/administrator_notifications/account_compliance_mailer_spec.rb`
- `spec/mailers/administrator_notifications/account_notification_mailer_spec.rb`
- `spec/mailers/administrator_notifications/base_mailer_spec.rb`
- `spec/mailers/administrator_notifications/channel_notifications_mailer_spec.rb`
- `spec/mailers/agent_notifications/conversation_notifications_mailer_spec.rb`
- `spec/models/notification_setting_spec.rb`
- `spec/models/notification_spec.rb`
- `spec/services/conversations/unread_counts/notifier_spec.rb`
- `spec/services/messages/new_message_notification_service_spec.rb`
- `spec/services/messages/send_email_notification_service_spec.rb`
- `spec/services/notification/email_notification_service_spec.rb`
- `spec/services/notification/fcm_service_spec.rb`
- `spec/services/notification/push_notification_service_spec.rb`

## Frontend files (28)

- `app/javascript/dashboard/api/notificationSubscription.js`
- `app/javascript/dashboard/api/notifications.js`
- `app/javascript/dashboard/api/specs/notifications.spec.js`
- `app/javascript/dashboard/api/specs/userNotificationSettings.spec.js`
- `app/javascript/dashboard/api/userNotificationSettings.js`
- `app/javascript/dashboard/components/NetworkNotification.vue`
- `app/javascript/dashboard/helper/AudioAlerts/AudioNotificationStore.js`
- `app/javascript/dashboard/helper/AudioAlerts/DashboardAudioNotificationHelper.js`
- `app/javascript/dashboard/helper/AudioAlerts/specs/AudioNotificationStore.spec.js`
- `app/javascript/dashboard/helper/AudioAlerts/specs/DashboardAudioNotificationHelper.spec.js`
- `app/javascript/dashboard/helper/pushHelper.js`
- `app/javascript/dashboard/routes/dashboard/settings/profile/AudioNotifications.vue`
- `app/javascript/dashboard/routes/dashboard/settings/profile/NotificationCheckBox.vue`
- `app/javascript/dashboard/routes/dashboard/settings/profile/NotificationPreferences.vue`
- `app/javascript/dashboard/store/modules/notifications/actions.js`
- `app/javascript/dashboard/store/modules/notifications/getters.js`
- `app/javascript/dashboard/store/modules/notifications/helpers.js`
- `app/javascript/dashboard/store/modules/notifications/index.js`
- `app/javascript/dashboard/store/modules/notifications/mutations.js`
- `app/javascript/dashboard/store/modules/specs/notifications/actions.spec.js`
- `app/javascript/dashboard/store/modules/specs/notifications/getters.spec.js`
- `app/javascript/dashboard/store/modules/specs/notifications/helpers.spec.js`
- `app/javascript/dashboard/store/modules/specs/notifications/mutations.spec.js`
- `app/javascript/dashboard/store/modules/specs/userNotificationSettings/actions.spec.js`
- `app/javascript/dashboard/store/modules/specs/userNotificationSettings/getters.spec.js`
- `app/javascript/dashboard/store/modules/specs/userNotificationSettings/mutations.spec.js`
- `app/javascript/dashboard/store/modules/userNotificationSettings.js`
- `app/javascript/shared/helpers/AudioNotificationHelper.js`
