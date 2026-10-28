# Two-factor authentication: coverage gaps

## Frontend: 37.2% (158 of 425 lines)

| File | Coverage | Uncovered lines |
| --- | ---: | ---: |
| `app/javascript/dashboard/routes/dashboard/settings/profile/MfaSetupWizard.vue` | 26.5% | 72 |
| `app/javascript/dashboard/routes/dashboard/settings/profile/MfaSettings.vue` | 2.9% | 67 |
| `app/javascript/dashboard/routes/dashboard/settings/profile/MfaManagementActions.vue` | 28.8% | 52 |
| `app/javascript/dashboard/components/auth/MfaVerification.vue` | 67.7% | 32 |
| `app/javascript/dashboard/routes/dashboard/settings/security/components/EnforceMfa.vue` | 0.0% | 18 |
| `app/javascript/dashboard/routes/dashboard/settings/security/Index.vue` | 5.9% | 16 |
| `app/javascript/dashboard/routes/dashboard/settings/profile/MfaSettingsCard.vue` | 60.0% | 4 |
| `app/javascript/dashboard/routes/dashboard/settings/profile/MfaStatusCard.vue` | 66.7% | 4 |
| `app/javascript/dashboard/components/auth/MfaEnforcedSetup.vue` | 91.7% | 2 |

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
