# Two-factor authentication: coverage gaps

## Frontend: 82.5% (1035 of 1254 lines)

| File | Coverage | Uncovered lines |
| --- | ---: | ---: |
| `app/javascript/dashboard/components/auth/MfaVerification.vue` | 30.2% | 199 |
| `app/javascript/dashboard/api/mfa.js` | 54.5% | 10 |
| `app/javascript/dashboard/components/auth/MfaEnforcedSetup.vue` | 94.7% | 3 |
| `app/javascript/dashboard/routes/dashboard/settings/profile/MfaManagementActions.vue` | 99.6% | 1 |
| `app/javascript/dashboard/routes/dashboard/settings/profile/MfaSettings.vue` | 99.4% | 1 |
| `app/javascript/dashboard/routes/dashboard/settings/profile/MfaSettingsCard.vue` | 97.5% | 1 |
| `app/javascript/dashboard/routes/dashboard/settings/profile/MfaSetupWizard.vue` | 99.6% | 1 |
| `app/javascript/dashboard/routes/dashboard/settings/profile/MfaStatusCard.vue` | 97.7% | 1 |
| `app/javascript/dashboard/routes/dashboard/settings/security/Index.vue` | 98.5% | 1 |
| `app/javascript/dashboard/routes/dashboard/settings/security/components/EnforceMfa.vue` | 97.6% | 1 |

## Backend: 56.0% (269 of 480 lines)

| File | Coverage | Uncovered lines |
| --- | ---: | ---: |
| `app/services/mfa/management_service.rb` | 0.0% | 70 |
| `app/controllers/api/v1/profile/mfa_controller.rb` | 0.0% | 64 |
| `lib/tasks/mfa.rake` | 32.5% | 27 |
| `app/controllers/concerns/mfa_authentication_helper.rb` | 50.0% | 22 |
| `app/services/mfa/setup_token_service.rb` | 45.0% | 11 |
| `app/services/mfa/authentication_service.rb` | 46.2% | 7 |
| `app/controllers/concerns/device_verification_guard.rb` | 66.7% | 5 |
| `app/controllers/concerns/mfa_enforcement_guard.rb` | 78.6% | 3 |
| `app/services/mfa/token_service.rb` | 93.8% | 1 |
| `enterprise/app/controllers/enterprise/devise_overrides/device_verification_concern.rb` | 97.7% | 1 |
