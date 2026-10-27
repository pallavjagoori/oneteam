# Two-factor authentication

**Area:** Security

Multi-factor authentication, trusted devices and session management for user profiles.

## HTTP routes (8)

| Verb | Path | Controller#action |
| --- | --- | --- |
| POST | `/api/v1/profile/mfa/verify(.:format)` | `api/v1/profile/mfa#verify` |
| POST | `/api/v1/profile/mfa/backup_codes(.:format)` | `api/v1/profile/mfa#backup_codes` |
| GET | `/api/v1/profile/mfa(.:format)` | `api/v1/profile/mfa#show` |
| DELETE | `/api/v1/profile/mfa(.:format)` | `api/v1/profile/mfa#destroy` |
| POST | `/api/v1/profile/mfa(.:format)` | `api/v1/profile/mfa#create` |
| GET | `/api/v1/profile/sessions(.:format)` | `api/v1/profile/sessions#index` |
| DELETE | `/api/v1/profile/sessions/:id(.:format)` | `api/v1/profile/sessions#destroy` |
| DELETE | `/api/v1/profile/trusted_devices(.:format)` | `api/v1/profile/trusted_devices#destroy` |

## Database tables (1)

`user_sessions`

## Backend files (25)

### controllers (7)

- `app/controllers/api/v1/profile/mfa_controller.rb`
- `app/controllers/api/v1/profile/sessions_controller.rb`
- `app/controllers/api/v1/profile/trusted_devices_controller.rb`
- `app/controllers/concerns/device_verification_guard.rb`
- `app/controllers/concerns/mfa_authentication_helper.rb`
- `app/controllers/concerns/mfa_enforcement_guard.rb`
- `enterprise/app/controllers/enterprise/devise_overrides/device_verification_concern.rb` (EE)

### jobs (1)

- `enterprise/app/jobs/enterprise/device_verification_delivery_job.rb` (EE)

### lib (1)

- `lib/tasks/mfa.rake`

### mailers (1)

- `enterprise/app/mailers/enterprise/device_verification_mailer.rb` (EE)

### services (7)

- `app/services/mfa/authentication_service.rb`
- `app/services/mfa/management_service.rb`
- `app/services/mfa/setup_token_service.rb`
- `app/services/mfa/token_service.rb`
- `enterprise/app/services/device_verification.rb` (EE)
- `enterprise/app/services/device_verification/challenge_service.rb` (EE)
- `enterprise/app/services/device_verification/token_service.rb` (EE)

### views (8)

- `app/views/api/v1/profile/mfa/backup_codes.json.jbuilder`
- `app/views/api/v1/profile/mfa/create.json.jbuilder`
- `app/views/api/v1/profile/mfa/destroy.json.jbuilder`
- `app/views/api/v1/profile/mfa/show.json.jbuilder`
- `app/views/api/v1/profile/mfa/verify.json.jbuilder`
- `app/views/api/v1/profile/sessions/index.json.jbuilder`
- `enterprise/app/views/enterprise/device_verification_mailer/new_device.liquid` (EE)
- `enterprise/app/views/enterprise/device_verification_mailer/verification_code.liquid` (EE)

## Ruby specs (10)

- `spec/enterprise/controllers/enterprise/devise_overrides/device_verification_spec.rb`
- `spec/enterprise/mailers/enterprise/device_verification_mailer_spec.rb`
- `spec/enterprise/services/device_verification/challenge_service_spec.rb`
- `spec/enterprise/services/device_verification/token_service_spec.rb`
- `spec/enterprise/services/device_verification_spec.rb`
- `spec/requests/api/v1/profile/mfa_controller_spec.rb`
- `spec/requests/api/v1/profile/sessions_controller_spec.rb`
- `spec/services/mfa/authentication_service_spec.rb`
- `spec/services/mfa/setup_token_service_spec.rb`
- `spec/services/mfa/token_service_spec.rb`

## Frontend files (13)

- `app/javascript/dashboard/api/mfa.js`
- `app/javascript/dashboard/components/auth/MfaEnforcedSetup.spec.js`
- `app/javascript/dashboard/components/auth/MfaEnforcedSetup.vue`
- `app/javascript/dashboard/components/auth/MfaVerification.spec.js`
- `app/javascript/dashboard/components/auth/MfaVerification.vue`
- `app/javascript/dashboard/routes/dashboard/settings/profile/MfaManagementActions.vue`
- `app/javascript/dashboard/routes/dashboard/settings/profile/MfaSettings.vue`
- `app/javascript/dashboard/routes/dashboard/settings/profile/MfaSettingsCard.vue`
- `app/javascript/dashboard/routes/dashboard/settings/profile/MfaSetupWizard.vue`
- `app/javascript/dashboard/routes/dashboard/settings/profile/MfaStatusCard.vue`
- `app/javascript/dashboard/routes/dashboard/settings/security/Index.vue`
- `app/javascript/dashboard/routes/dashboard/settings/security/components/EnforceMfa.vue`
- `app/javascript/dashboard/routes/dashboard/settings/security/security.routes.js`
