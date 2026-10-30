# Accounts, users and sign-in: coverage gaps

## Frontend: 47.0% (723 of 1538 lines)

| File | Coverage | Uncovered lines |
| --- | ---: | ---: |
| `app/javascript/v3/views/login/Index.vue` | 25.0% | 105 |
| `app/javascript/dashboard/routes/dashboard/settings/profile/Index.vue` | 7.6% | 73 |
| `app/javascript/dashboard/routes/dashboard/settings/account/components/AutoResolve.vue` | 16.9% | 54 |
| `app/javascript/dashboard/routes/dashboard/settings/account/Index.vue` | 7.3% | 51 |
| `app/javascript/v3/views/auth/signup/components/Signup/Form.vue` | 7.4% | 50 |
| `app/javascript/dashboard/routes/dashboard/settings/account/components/AccountDelete.vue` | 4.3% | 45 |
| `app/javascript/dashboard/routes/dashboard/settings/profile/ActiveSessions.vue` | 10.0% | 45 |
| `app/javascript/dashboard/components-next/sidebar/SidebarProfileMenuStatus.vue` | 15.0% | 34 |
| `app/javascript/dashboard/components/auth/SessionLimitOverlay.vue` | 26.7% | 33 |
| `app/javascript/v3/views/auth/verify-email/Index.vue` | 15.4% | 33 |
| `app/javascript/v3/api/auth.js` | 38.0% | 31 |
| `app/javascript/dashboard/components-next/sidebar/SidebarAccountSwitcher.vue` | 3.6% | 27 |
| `app/javascript/dashboard/routes/dashboard/settings/profile/UserLanguageSelect.vue` | 12.9% | 27 |
| `app/javascript/dashboard/components-next/sidebar/SidebarProfileMenu.vue` | 10.3% | 26 |
| `app/javascript/v3/views/auth/reset/password/Index.vue` | 21.4% | 22 |
| `app/javascript/dashboard/routes/dashboard/settings/profile/ChangePassword.vue` | 10.5% | 17 |
| `app/javascript/v3/views/auth/password/Edit.vue` | 19.0% | 17 |
| `app/javascript/dashboard/components/app/AddAccountModal.vue` | 30.4% | 16 |
| `app/javascript/dashboard/routes/dashboard/settings/account/components/BuildInfo.vue` | 23.5% | 13 |
| `app/javascript/dashboard/routes/dashboard/settings/profile/AccessToken.vue` | 20.0% | 12 |
| `app/javascript/dashboard/routes/dashboard/settings/profile/UserBasicDetails.vue` | 7.7% | 12 |
| `app/javascript/v3/views/auth/signup/components/Testimonials/Index.vue` | 8.3% | 11 |
| `app/javascript/dashboard/components-next/social-profiles/SocialProfileInput.vue` | 20.0% | 8 |
| `app/javascript/dashboard/routes/dashboard/settings/profile/FontSize.vue` | 33.3% | 8 |
| `app/javascript/v3/views/auth/signup/components/Signup/PasswordRequirements.vue` | 20.0% | 8 |
| `app/javascript/dashboard/components-next/social-profiles/SocialProfileLinks.vue` | 12.5% | 7 |
| `app/javascript/v3/helpers/AuthHelper.js` | 93.1% | 6 |
| `app/javascript/v3/views/auth/confirmation/Index.vue` | 33.3% | 6 |
| `app/javascript/dashboard/routes/dashboard/settings/account/components/AccountId.vue` | 0.0% | 5 |
| `app/javascript/dashboard/routes/dashboard/settings/profile/UserProfilePicture.vue` | 28.6% | 5 |
| `app/javascript/dashboard/routes/dashboard/settings/account/components/SectionLayout.vue` | 33.3% | 4 |
| `app/javascript/dashboard/routes/dashboard/settings/profile/Wrapper.vue` | 0.0% | 3 |
| `app/javascript/v3/views/auth/signup/Index.vue` | 96.2% | 1 |

## Backend: 95.9% (1628 of 1697 lines)

| File | Coverage | Uncovered lines |
| --- | ---: | ---: |
| `enterprise/app/controllers/enterprise/devise_overrides/omniauth_callbacks_controller.rb` | 83.9% | 10 |
| `app/controllers/api/v1/accounts/callbacks_controller.rb` | 87.3% | 8 |
| `enterprise/app/models/enterprise/account.rb` | 91.4% | 6 |
| `app/controllers/auth/resend_confirmations_controller.rb` | 80.8% | 5 |
| `app/models/account.rb` | 96.5% | 5 |
| `app/models/user.rb` | 96.2% | 4 |
| `enterprise/app/services/internal/account_analysis/threat_analyser_service.rb` | 84.0% | 4 |
| `app/builders/account_builder.rb` | 92.9% | 3 |
| `app/controllers/devise_overrides/confirmations_controller.rb` | 87.0% | 3 |
| `app/controllers/api/v1/accounts_controller.rb` | 97.8% | 2 |
| `app/controllers/api/v2/accounts_controller.rb` | 94.3% | 2 |
| `app/controllers/devise_overrides/omniauth_callbacks_controller.rb` | 97.6% | 2 |
| `app/controllers/devise_overrides/passwords_controller.rb` | 93.5% | 2 |
| `app/controllers/devise_overrides/sessions_controller.rb` | 98.3% | 2 |
| `app/models/concerns/account_email_rate_limitable.rb` | 95.7% | 2 |
| `enterprise/app/controllers/api/v1/auth_controller.rb` | 96.5% | 2 |
| `lib/custom_exceptions/account.rb` | 93.5% | 2 |
| `app/controllers/api/v1/accounts/oauth_authorization_controller.rb` | 92.9% | 1 |
| `app/controllers/concerns/ensure_current_account_helper.rb` | 95.5% | 1 |
| `app/models/concerns/user_attribute_helpers.rb` | 96.2% | 1 |
| `app/services/base_refresh_oauth_token_service.rb` | 96.3% | 1 |
| `enterprise/app/policies/enterprise/account_policy.rb` | 80.0% | 1 |
