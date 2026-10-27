# Accounts, users and sign-in

**Area:** Accounts

Sign-up, sign-in, password reset, email confirmation, OAuth sign-in, API tokens, user profiles and account settings.

## HTTP routes (47)

| Verb | Path | Controller#action |
| --- | --- | --- |
| GET | `/auth/sign_in(.:format)` | `devise_overrides/sessions#new` |
| POST | `/auth/sign_in(.:format)` | `devise_overrides/sessions#create` |
| DELETE | `/auth/sign_out(.:format)` | `devise_overrides/sessions#destroy` |
| GET | `/auth/password/new(.:format)` | `devise_overrides/passwords#new` |
| GET | `/auth/password/edit(.:format)` | `devise_overrides/passwords#edit` |
| PATCH | `/auth/password(.:format)` | `devise_overrides/passwords#update` |
| PUT | `/auth/password(.:format)` | `devise_overrides/passwords#update` |
| POST | `/auth/password(.:format)` | `devise_overrides/passwords#create` |
| GET | `/auth/cancel(.:format)` | `devise_token_auth/registrations#cancel` |
| GET | `/auth/sign_up(.:format)` | `devise_token_auth/registrations#new` |
| GET | `/auth/edit(.:format)` | `devise_token_auth/registrations#edit` |
| PATCH | `/auth(.:format)` | `devise_token_auth/registrations#update` |
| PUT | `/auth(.:format)` | `devise_token_auth/registrations#update` |
| DELETE | `/auth(.:format)` | `devise_token_auth/registrations#destroy` |
| POST | `/auth(.:format)` | `devise_token_auth/registrations#create` |
| GET | `/auth/confirmation/new(.:format)` | `devise_overrides/confirmations#new` |
| GET | `/auth/confirmation(.:format)` | `devise_overrides/confirmations#show` |
| POST | `/auth/confirmation(.:format)` | `devise_overrides/confirmations#create` |
| GET | `/auth/validate_token(.:format)` | `devise_overrides/token_validations#validate_token` |
| GET|POST | `/auth/failure(.:format)` | `devise_overrides/omniauth_callbacks#omniauth_failure` |
| GET|POST | `/auth/:provider/callback(.:format)` | `devise_overrides/omniauth_callbacks#omniauth_success` |
| GET|POST | `/omniauth/:provider/callback(.:format)` | `devise_overrides/omniauth_callbacks#redirect_callbacks` |
| GET|POST | `/omniauth/failure(.:format)` | `devise_overrides/omniauth_callbacks#omniauth_failure` |
| GET|POST | `/auth/:provider(.:format)` | `redirect(307)` |
| POST | `/resend_confirmation(.:format)` | `auth/resend_confirmations#create` |
| POST | `/api/v1/accounts/:id/update_active_at(.:format)` | `api/v1/accounts#update_active_at` |
| GET | `/api/v1/accounts/:id/cache_keys(.:format)` | `api/v1/accounts#cache_keys` |
| POST | `/api/v1/accounts/:account_id/callbacks/reauthorize_page(.:format)` | `api/v1/accounts/callbacks#reauthorize_page` |
| POST | `/api/v1/accounts(.:format)` | `api/v1/accounts#create` |
| GET | `/api/v1/accounts/:id(.:format)` | `api/v1/accounts#show` |
| PATCH | `/api/v1/accounts/:id(.:format)` | `api/v1/accounts#update` |
| PUT | `/api/v1/accounts/:id(.:format)` | `api/v1/accounts#update` |
| POST | `/api/v1/profile/auto_offline(.:format)` | `api/v1/profiles#auto_offline` |
| PUT | `/api/v1/profile/set_active_account(.:format)` | `api/v1/profiles#set_active_account` |
| POST | `/api/v1/profile/resend_confirmation(.:format)` | `api/v1/profiles#resend_confirmation` |
| GET | `/api/v1/profile(.:format)` | `api/v1/profiles#show` |
| PATCH | `/api/v1/profile(.:format)` | `api/v1/profiles#update` |
| PUT | `/api/v1/profile(.:format)` | `api/v1/profiles#update` |
| POST | `/api/v2/accounts(.:format)` | `api/v2/accounts#create` |
| GET | `/app/accounts(.:format)` | `accounts#index` |
| POST | `/app/accounts(.:format)` | `accounts#create` |
| GET | `/app/accounts/new(.:format)` | `accounts#new` |
| GET | `/app/accounts/:id/edit(.:format)` | `accounts#edit` |
| GET | `/app/accounts/:id(.:format)` | `accounts#show` |
| PATCH | `/app/accounts/:id(.:format)` | `accounts#update` |
| PUT | `/app/accounts/:id(.:format)` | `accounts#update` |
| DELETE | `/app/accounts/:id(.:format)` | `accounts#destroy` |

## Database tables (3)

`account_users`, `accounts`, `users`

## Backend files (74)

### builders (1)

- `app/builders/account_builder.rb`

### controllers (21)

- `app/controllers/api/v1/accounts/base_controller.rb`
- `app/controllers/api/v1/accounts/callbacks_controller.rb`
- `app/controllers/api/v1/accounts/oauth_authorization_controller.rb`
- `app/controllers/api/v1/accounts_controller.rb`
- `app/controllers/api/v1/profiles_controller.rb`
- `app/controllers/api/v2/accounts_controller.rb`
- `app/controllers/auth/resend_confirmations_controller.rb`
- `app/controllers/concerns/auth_helper.rb`
- `app/controllers/concerns/ensure_current_account_helper.rb`
- `app/controllers/concerns/track_session_activity.rb`
- `app/controllers/devise_overrides/confirmations_controller.rb`
- `app/controllers/devise_overrides/omniauth_callbacks_controller.rb`
- `app/controllers/devise_overrides/passwords_controller.rb`
- `app/controllers/devise_overrides/sessions_controller.rb`
- `app/controllers/devise_overrides/token_validations_controller.rb`
- `enterprise/app/controllers/api/v1/accounts/enterprise_accounts_controller.rb` (EE)
- `enterprise/app/controllers/api/v1/auth_controller.rb` (EE)
- `enterprise/app/controllers/enterprise/api/v2/accounts_controller.rb` (EE)
- `enterprise/app/controllers/enterprise/devise_overrides/omniauth_callbacks_controller.rb` (EE)
- `enterprise/app/controllers/enterprise/devise_overrides/passwords_controller.rb` (EE)
- `enterprise/app/controllers/enterprise/devise_overrides/sessions_controller.rb` (EE)

### jobs (3)

- `app/jobs/internal/delete_accounts_job.rb`
- `app/jobs/user_session_ip_lookup_job.rb`
- `enterprise/app/jobs/internal/account_analysis_job.rb` (EE)

### lib (2)

- `lib/current.rb`
- `lib/custom_exceptions/account.rb`

### models (13)

- `app/models/account.rb`
- `app/models/account_user.rb`
- `app/models/concerns/account_cache_revalidator.rb`
- `app/models/concerns/account_email_rate_limitable.rb`
- `app/models/concerns/account_settings_schema.rb`
- `app/models/concerns/user_attribute_helpers.rb`
- `app/models/user.rb`
- `app/models/user_session.rb`
- `enterprise/app/models/enterprise/account.rb` (EE)
- `enterprise/app/models/enterprise/account_user.rb` (EE)
- `enterprise/app/models/enterprise/concerns/account.rb` (EE)
- `enterprise/app/models/enterprise/concerns/account_user.rb` (EE)
- `enterprise/app/models/enterprise/concerns/user.rb` (EE)

### policies (3)

- `app/policies/account_policy.rb`
- `app/policies/user_policy.rb`
- `enterprise/app/policies/enterprise/account_policy.rb` (EE)

### services (12)

- `app/services/account/sign_up_email_validation_service.rb`
- `app/services/account_deletion_service.rb`
- `app/services/base_refresh_oauth_token_service.rb`
- `app/services/base_token_service.rb`
- `app/services/user_session_tracking_service.rb`
- `enterprise/app/services/internal/account_analysis/account_updater_service.rb` (EE)
- `enterprise/app/services/internal/account_analysis/content_evaluator_service.rb` (EE)
- `enterprise/app/services/internal/account_analysis/prompts_service.rb` (EE)
- `enterprise/app/services/internal/account_analysis/threat_analyser_service.rb` (EE)
- `enterprise/app/services/internal/account_analysis/website_scraper_service.rb` (EE)
- `enterprise/app/services/internal/accounts/internal_attributes_service.rb` (EE)
- `enterprise/app/services/internal/accounts/marketing_attribution_service.rb` (EE)

### views (19)

- `app/views/api/v1/accounts/callbacks/reauthorize_page.json.jbuilder`
- `app/views/api/v1/accounts/create.json.jbuilder`
- `app/views/api/v1/accounts/show.json.jbuilder`
- `app/views/api/v1/accounts/update.json.jbuilder`
- `app/views/api/v1/models/_account.json.jbuilder`
- `app/views/api/v1/models/_user.json.jbuilder`
- `app/views/api/v1/profiles/auto_offline.jbuilder`
- `app/views/api/v1/profiles/show.json.jbuilder`
- `app/views/api/v1/profiles/update.json.jbuilder`
- `app/views/devise/_auth.json.jbuilder`
- `app/views/devise/mailer/_confirmation_body.html.erb`
- `app/views/devise/mailer/confirmation_instructions.html.erb`
- `app/views/devise/mailer/password_change.html.erb`
- `app/views/devise/mailer/reset_password_instructions.html.erb`
- `app/views/devise/mailer/unlock_instructions.html.erb`
- `app/views/devise/token.json.jbuilder`
- `app/views/devise_overrides/sessions/create_with_backup_codes.json.jbuilder`
- `enterprise/app/views/api/v1/models/_account_user.json.jbuilder` (EE)
- `enterprise/app/views/devise/mailer/confirmation_instructions.html.erb` (EE)

## Ruby specs (50)

- `spec/builders/account_builder_spec.rb`
- `spec/config/session_store_spec.rb`
- `spec/controllers/api/v1/accounts/callbacks_controller_spec.rb`
- `spec/controllers/api/v1/accounts_controller_spec.rb`
- `spec/controllers/api/v1/profiles_controller_spec.rb`
- `spec/controllers/api/v2/accounts_controller_spec.rb`
- `spec/controllers/auth/resend_confirmations_controller_spec.rb`
- `spec/controllers/devise/confirmations_controller_spec.rb`
- `spec/controllers/devise/omniauth_callbacks_controller_spec.rb`
- `spec/controllers/devise/passwords_controller_spec.rb`
- `spec/controllers/devise/session_controller_spec.rb`
- `spec/controllers/devise/token_validations_controller_spec.rb`
- `spec/controllers/devise_overrides/sessions_controller_spec.rb`
- `spec/enterprise/controllers/api/v1/accounts/callbacks_controller_spec.rb`
- `spec/enterprise/controllers/api/v1/accounts_controller_spec.rb`
- `spec/enterprise/controllers/api/v1/auth_controller_spec.rb`
- `spec/enterprise/controllers/api/v1/profiles_controller_spec.rb`
- `spec/enterprise/controllers/enterprise/api/v2/accounts_controller_spec.rb`
- `spec/enterprise/controllers/enterprise/devise_overrides/omniauth_callbacks_controller_spec.rb`
- `spec/enterprise/controllers/enterprise/devise_overrides/passwords_controller_spec.rb`
- `spec/enterprise/controllers/enterprise/devise_overrides/session_controller_spec.rb`
- `spec/enterprise/mailers/devise_mailer_spec.rb`
- `spec/enterprise/models/account_spec.rb`
- `spec/enterprise/models/account_user_spec.rb`
- `spec/enterprise/models/user_spec.rb`
- `spec/enterprise/services/internal/account_analysis/account_updater_service_spec.rb`
- `spec/enterprise/services/internal/account_analysis/content_evaluator_service_spec.rb`
- `spec/enterprise/services/internal/account_analysis/threat_analyser_service_spec.rb`
- `spec/enterprise/services/internal/account_analysis/website_scraper_service_spec.rb`
- `spec/enterprise/services/internal/accounts/internal_attributes_service_spec.rb`
- `spec/enterprise/services/internal/accounts/marketing_attribution_service_spec.rb`
- `spec/jobs/internal/delete_accounts_job_spec.rb`
- `spec/jobs/user_session_ip_lookup_job_spec.rb`
- `spec/mailers/confirmation_instructions_spec.rb`
- `spec/mailers/devise/mailer_spec.rb`
- `spec/models/account_spec.rb`
- `spec/models/account_user_spec.rb`
- `spec/models/concerns/account_email_rate_limitable_spec.rb`
- `spec/models/user_session_spec.rb`
- `spec/models/user_spec.rb`
- `spec/policies/user_policy_spec.rb`
- `spec/requests/api/v1/accounts/base_controller_spec.rb`
- `spec/requests/devise_overrides/confirmations_controller_spec.rb`
- `spec/requests/devise_overrides/passwords_controller_spec.rb`
- `spec/requests/devise_overrides/sessions_controller_spec.rb`
- `spec/services/account/sign_up_email_validation_service_spec.rb`
- `spec/services/account_deletion_service_spec.rb`
- `spec/services/base_token_service_spec.rb`
- `spec/services/user_session_tracking_service_spec.rb`
- `spec/views/api/v1/models/_user.json.jbuilder_spec.rb`

## Frontend files (68)

- `app/javascript/dashboard/api/account.js`
- `app/javascript/dashboard/api/accountActions.js`
- `app/javascript/dashboard/api/auth.js`
- `app/javascript/dashboard/api/enterprise/account.js`
- `app/javascript/dashboard/api/enterprise/specs/account.spec.js`
- `app/javascript/dashboard/api/specs/account.spec.js`
- `app/javascript/dashboard/api/specs/accountActions.spec.js`
- `app/javascript/dashboard/assets/images/auth/auth--bg.svg`
- `app/javascript/dashboard/assets/images/auth/bottom-right.svg`
- `app/javascript/dashboard/assets/images/auth/signup-bg.jpg`
- `app/javascript/dashboard/assets/images/auth/top-left.svg`
- `app/javascript/dashboard/components-next/sidebar/SidebarAccountSwitcher.vue`
- `app/javascript/dashboard/components-next/sidebar/SidebarProfileMenu.vue`
- `app/javascript/dashboard/components-next/sidebar/SidebarProfileMenuStatus.vue`
- `app/javascript/dashboard/components-next/social-profiles/SocialProfileInput.vue`
- `app/javascript/dashboard/components-next/social-profiles/SocialProfileLinks.vue`
- `app/javascript/dashboard/components-next/social-profiles/socialProfiles.js`
- `app/javascript/dashboard/components-next/social-profiles/specs/socialProfiles.spec.js`
- `app/javascript/dashboard/components/app/AddAccountModal.vue`
- `app/javascript/dashboard/components/auth/SessionLimitOverlay.vue`
- `app/javascript/dashboard/composables/spec/useAccount.spec.js`
- `app/javascript/dashboard/composables/useAccount.js`
- `app/javascript/dashboard/composables/useCallSession.js`
- `app/javascript/dashboard/constants/sessionStorage.js`
- `app/javascript/dashboard/routes/dashboard/settings/account/Index.vue`
- `app/javascript/dashboard/routes/dashboard/settings/account/account.routes.js`
- `app/javascript/dashboard/routes/dashboard/settings/account/components/AccountDelete.vue`
- `app/javascript/dashboard/routes/dashboard/settings/account/components/AccountId.vue`
- `app/javascript/dashboard/routes/dashboard/settings/account/components/AutoResolve.vue`
- `app/javascript/dashboard/routes/dashboard/settings/account/components/BuildInfo.vue`
- `app/javascript/dashboard/routes/dashboard/settings/account/components/SectionLayout.vue`
- `app/javascript/dashboard/routes/dashboard/settings/profile/AccessToken.vue`
- `app/javascript/dashboard/routes/dashboard/settings/profile/ActiveSessions.vue`
- `app/javascript/dashboard/routes/dashboard/settings/profile/ChangePassword.vue`
- `app/javascript/dashboard/routes/dashboard/settings/profile/FontSize.vue`
- `app/javascript/dashboard/routes/dashboard/settings/profile/Index.vue`
- `app/javascript/dashboard/routes/dashboard/settings/profile/UserBasicDetails.vue`
- `app/javascript/dashboard/routes/dashboard/settings/profile/UserLanguageSelect.vue`
- `app/javascript/dashboard/routes/dashboard/settings/profile/UserProfilePicture.vue`
- `app/javascript/dashboard/routes/dashboard/settings/profile/Wrapper.vue`
- `app/javascript/dashboard/routes/dashboard/settings/profile/constants.js`
- `app/javascript/dashboard/routes/dashboard/settings/profile/profile.routes.js`
- `app/javascript/dashboard/store/modules/accounts.js`
- `app/javascript/dashboard/store/modules/auth.js`
- `app/javascript/dashboard/store/modules/specs/account/actions.spec.js`
- `app/javascript/dashboard/store/modules/specs/account/getters.spec.js`
- `app/javascript/dashboard/store/modules/specs/account/mutations.spec.js`
- `app/javascript/dashboard/store/modules/specs/auth/actions.spec.js`
- `app/javascript/dashboard/store/modules/specs/auth/getters.spec.js`
- `app/javascript/dashboard/store/modules/specs/auth/mutations.spec.js`
- `app/javascript/shared/helpers/sessionStorage.js`
- `app/javascript/shared/helpers/specs/sessionStorage.spec.js`
- `app/javascript/v3/api/auth.js`
- `app/javascript/v3/api/specs/auth.spec.js`
- `app/javascript/v3/helpers/AuthHelper.js`
- `app/javascript/v3/helpers/specs/AuthHelper.spec.js`
- `app/javascript/v3/views/auth/confirmation/Index.vue`
- `app/javascript/v3/views/auth/password/Edit.vue`
- `app/javascript/v3/views/auth/reset/password/Index.vue`
- `app/javascript/v3/views/auth/signup/Index.spec.js`
- `app/javascript/v3/views/auth/signup/Index.vue`
- `app/javascript/v3/views/auth/signup/components/Signup/Form.vue`
- `app/javascript/v3/views/auth/signup/components/Signup/PasswordRequirements.vue`
- `app/javascript/v3/views/auth/signup/components/Testimonials/Index.vue`
- `app/javascript/v3/views/auth/signup/components/Testimonials/TestimonialCard.vue`
- `app/javascript/v3/views/auth/verify-email/Index.vue`
- `app/javascript/v3/views/login/Index.spec.js`
- `app/javascript/v3/views/login/Index.vue`
