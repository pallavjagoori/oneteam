# Installation and onboarding

**Area:** Administration

First-run installation onboarding, account onboarding, version checks, seed data and health checks.

## HTTP routes (6)

| Verb | Path | Controller#action |
| --- | --- | --- |
| GET | `/app/accounts/:account_id/onboarding/inbox-setup(.:format)` | `dashboard#index` |
| GET | `/health(.:format)` | `health#show` |
| PATCH | `/api/v1/accounts/:account_id/onboarding(.:format)` | `api/v1/accounts/onboardings#update` |
| PUT | `/api/v1/accounts/:account_id/onboarding(.:format)` | `api/v1/accounts/onboardings#update` |
| GET | `/installation/onboarding(.:format)` | `installation/onboarding#index` |
| POST | `/installation/onboarding(.:format)` | `installation/onboarding#create` |

## Database tables (0)

None.

## Backend files (26)

### controllers (4)

- `app/controllers/api/v1/accounts/onboardings_controller.rb`
- `app/controllers/health_controller.rb`
- `app/controllers/installation/onboarding_controller.rb`
- `enterprise/app/controllers/enterprise/api/v1/accounts/onboardings_controller.rb` (EE)

### jobs (4)

- `app/jobs/internal/check_new_versions_job.rb`
- `app/jobs/internal/seed_account_job.rb`
- `enterprise/app/jobs/enterprise/internal/check_new_versions_job.rb` (EE)
- `enterprise/app/jobs/internal/accounts/marketing_conversion_tracking_job.rb` (EE)

### lib (16)

- `lib/chatwoot_hub.rb`
- `lib/seeders/account_seeder.rb`
- `lib/seeders/inbox_seeder.rb`
- `lib/seeders/message_seeder.rb`
- `lib/seeders/seed_data.yml`
- `lib/tasks/generate_test_data.rake`
- `lib/tasks/search_test_data.rake`
- `lib/test_data.rb`
- `lib/test_data/account_creator.rb`
- `lib/test_data/cleanup_service.rb`
- `lib/test_data/constants.rb`
- `lib/test_data/database_optimizer.rb`
- `lib/test_data/display_id_tracker.rb`
- `lib/test_data/inbox_creator.rb`
- `lib/test_data/orchestrator.rb`
- `enterprise/lib/enterprise/chatwoot_hub.rb` (EE)

### services (1)

- `enterprise/app/services/internal/accounts/marketing_conversion_tracking_service.rb` (EE)

### views (1)

- `app/views/installation/onboarding/index.html.erb`

## Ruby specs (9)

- `spec/controllers/api/v1/accounts/onboardings_controller_spec.rb`
- `spec/controllers/health_controller_spec.rb`
- `spec/controllers/installation/onboarding_controller_spec.rb`
- `spec/enterprise/controllers/api/v1/accounts/onboardings_controller_spec.rb`
- `spec/enterprise/jobs/enterprise/internal/check_new_versions_job_spec.rb`
- `spec/enterprise/lib/chatwoot_hub_spec.rb`
- `spec/enterprise/services/internal/accounts/marketing_conversion_tracking_service_spec.rb`
- `spec/jobs/internal/check_new_versions_job_spec.rb`
- `spec/lib/chatwoot_hub_spec.rb`

## Frontend files (28)

- `app/javascript/dashboard/api/onboarding.js`
- `app/javascript/dashboard/components/app/specs/versionCheckHelper.spec.js`
- `app/javascript/dashboard/components/app/versionCheckHelper.js`
- `app/javascript/dashboard/constants/installationTypes.js`
- `app/javascript/dashboard/helper/CacheHelper/version.js`
- `app/javascript/dashboard/routes/dashboard/noAccounts/Index.vue`
- `app/javascript/dashboard/routes/dashboard/onboarding/InboxSetup.vue`
- `app/javascript/dashboard/routes/dashboard/onboarding/Index.vue`
- `app/javascript/dashboard/routes/dashboard/onboarding/account-details/OnboardingFormRow.vue`
- `app/javascript/dashboard/routes/dashboard/onboarding/account-details/OnboardingFormSelect.vue`
- `app/javascript/dashboard/routes/dashboard/onboarding/inbox-setup/ChannelRow.vue`
- `app/javascript/dashboard/routes/dashboard/onboarding/inbox-setup/CreationStatusRow.vue`
- `app/javascript/dashboard/routes/dashboard/onboarding/inbox-setup/InboxChannelForm.vue`
- `app/javascript/dashboard/routes/dashboard/onboarding/inbox-setup/InboxChannelsDialog.vue`
- `app/javascript/dashboard/routes/dashboard/onboarding/inbox-setup/InboxChannelsFooter.vue`
- `app/javascript/dashboard/routes/dashboard/onboarding/inbox-setup/WebWidgetCreationStatus.vue`
- `app/javascript/dashboard/routes/dashboard/onboarding/inbox-setup/channelMatchers.js`
- `app/javascript/dashboard/routes/dashboard/onboarding/inbox-setup/constants.js`
- `app/javascript/dashboard/routes/dashboard/onboarding/inbox-setup/useChannelConfig.js`
- `app/javascript/dashboard/routes/dashboard/onboarding/inbox-setup/useChannelConnect.js`
- `app/javascript/dashboard/routes/dashboard/onboarding/inbox-setup/useDetectedChannels.js`
- `app/javascript/dashboard/routes/dashboard/onboarding/shared/OnboardingLayout.vue`
- `app/javascript/dashboard/routes/dashboard/onboarding/shared/OnboardingSection.vue`
- `app/javascript/dashboard/routes/dashboard/onboarding/shared/constants.js`
- `app/javascript/dashboard/routes/dashboard/onboarding/specs/inbox-setup/InboxChannelsDialog.spec.js`
- `app/javascript/dashboard/routes/dashboard/onboarding/specs/inbox-setup/channelMatchers.spec.js`
- `app/javascript/dashboard/routes/dashboard/onboarding/specs/inbox-setup/useDetectedChannels.spec.js`
- `app/javascript/v3/views/onboarding/OnboardingStep.vue`
