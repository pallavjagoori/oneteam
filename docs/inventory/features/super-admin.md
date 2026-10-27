# Super admin console

**Area:** Administration

Installation-wide admin console: accounts, users, platform apps, app configs, installation configs, instance status and diagnostics.

## HTTP routes (69)

| Verb | Path | Controller#action |
| --- | --- | --- |
| POST | `/api/v1/profile/reset_access_token(.:format)` | `api/v1/profiles#reset_access_token` |
| GET | `/super_admin/sign_in(.:format)` | `super_admin/devise/sessions#new` |
| POST | `/super_admin/sign_in(.:format)` | `super_admin/devise/sessions#create` |
| DELETE | `/super_admin/sign_out(.:format)` | `super_admin/devise/sessions#destroy` |
| GET | `/super_admin/password/new(.:format)` | `devise/passwords#new` |
| GET | `/super_admin/password/edit(.:format)` | `devise/passwords#edit` |
| PATCH | `/super_admin/password(.:format)` | `devise/passwords#update` |
| PUT | `/super_admin/password(.:format)` | `devise/passwords#update` |
| POST | `/super_admin/password(.:format)` | `devise/passwords#create` |
| GET | `/super_admin/cancel(.:format)` | `devise/registrations#cancel` |
| GET | `/super_admin/sign_up(.:format)` | `devise/registrations#new` |
| GET | `/super_admin/edit(.:format)` | `devise/registrations#edit` |
| PATCH | `/super_admin(.:format)` | `devise/registrations#update` |
| PUT | `/super_admin(.:format)` | `devise/registrations#update` |
| DELETE | `/super_admin(.:format)` | `devise/registrations#destroy` |
| POST | `/super_admin(.:format)` | `devise/registrations#create` |
| GET | `/super_admin/confirmation/new(.:format)` | `devise/confirmations#new` |
| GET | `/super_admin/confirmation(.:format)` | `devise/confirmations#show` |
| POST | `/super_admin/confirmation(.:format)` | `devise/confirmations#create` |
| GET | `/super_admin/logout(.:format)` | `super_admin/devise/sessions#destroy` |
| GET | `/super_admin(.:format)` | `super_admin/dashboard#index` |
| GET | `/super_admin/app_config(.:format)` | `super_admin/app_configs#show` |
| POST | `/super_admin/app_config(.:format)` | `super_admin/app_configs#create` |
| POST | `/super_admin/user_diagnostics/destroy_subscriptions(.:format)` | `super_admin/user_diagnostics#destroy_subscriptions` |
| GET | `/super_admin/user_diagnostics(.:format)` | `super_admin/user_diagnostics#show` |
| POST | `/super_admin/user_diagnostics(.:format)` | `super_admin/user_diagnostics#create` |
| GET | `/super_admin/push_diagnostics(.:format)` | `redirect(301)` |
| POST | `/super_admin/accounts/:id/seed(.:format)` | `super_admin/accounts#seed` |
| POST | `/super_admin/accounts/:id/reset_cache(.:format)` | `super_admin/accounts#reset_cache` |
| GET | `/super_admin/accounts(.:format)` | `super_admin/accounts#index` |
| POST | `/super_admin/accounts(.:format)` | `super_admin/accounts#create` |
| GET | `/super_admin/accounts/new(.:format)` | `super_admin/accounts#new` |
| GET | `/super_admin/accounts/:id/edit(.:format)` | `super_admin/accounts#edit` |
| GET | `/super_admin/accounts/:id(.:format)` | `super_admin/accounts#show` |
| PATCH | `/super_admin/accounts/:id(.:format)` | `super_admin/accounts#update` |
| PUT | `/super_admin/accounts/:id(.:format)` | `super_admin/accounts#update` |
| DELETE | `/super_admin/accounts/:id(.:format)` | `super_admin/accounts#destroy` |
| POST | `/super_admin/users/:id/resend_confirmation(.:format)` | `super_admin/users#resend_confirmation` |
| POST | `/super_admin/users/:id/impersonate(.:format)` | `super_admin/users#impersonate` |
| POST | `/super_admin/users/:id/impersonation_link(.:format)` | `super_admin/users#impersonation_link` |
| POST | `/super_admin/users/:id/check_email_suppression(.:format)` | `super_admin/users#check_email_suppression` |
| POST | `/super_admin/users/:id/clear_email_suppression(.:format)` | `super_admin/users#clear_email_suppression` |
| POST | `/super_admin/users/:id/send_test_email(.:format)` | `super_admin/users#send_test_email` |
| GET | `/super_admin/users(.:format)` | `super_admin/users#index` |
| POST | `/super_admin/users(.:format)` | `super_admin/users#create` |
| GET | `/super_admin/users/new(.:format)` | `super_admin/users#new` |
| GET | `/super_admin/users/:id/edit(.:format)` | `super_admin/users#edit` |
| GET | `/super_admin/users/:id(.:format)` | `super_admin/users#show` |
| PATCH | `/super_admin/users/:id(.:format)` | `super_admin/users#update` |
| PUT | `/super_admin/users/:id(.:format)` | `super_admin/users#update` |
| DELETE | `/super_admin/users/:id(.:format)` | `super_admin/users#destroy` |
| GET | `/super_admin/access_tokens(.:format)` | `super_admin/access_tokens#index` |
| GET | `/super_admin/access_tokens/:id(.:format)` | `super_admin/access_tokens#show` |
| GET | `/super_admin/installation_configs(.:format)` | `super_admin/installation_configs#index` |
| POST | `/super_admin/installation_configs(.:format)` | `super_admin/installation_configs#create` |
| GET | `/super_admin/installation_configs/new(.:format)` | `super_admin/installation_configs#new` |
| GET | `/super_admin/installation_configs/:id/edit(.:format)` | `super_admin/installation_configs#edit` |
| GET | `/super_admin/installation_configs/:id(.:format)` | `super_admin/installation_configs#show` |
| PATCH | `/super_admin/installation_configs/:id(.:format)` | `super_admin/installation_configs#update` |
| PUT | `/super_admin/installation_configs/:id(.:format)` | `super_admin/installation_configs#update` |
| GET | `/super_admin/instance_status(.:format)` | `super_admin/instance_statuses#show` |
| GET | `/super_admin/search/accounts(.:format)` | `super_admin/search#accounts` |
| GET | `/super_admin/search/users(.:format)` | `super_admin/search#users` |
| GET | `/super_admin/settings/refresh(.:format)` | `super_admin/settings#refresh` |
| GET | `/super_admin/settings(.:format)` | `super_admin/settings#show` |
| POST | `/super_admin/account_users(.:format)` | `super_admin/account_users#create` |
| GET | `/super_admin/account_users/new(.:format)` | `super_admin/account_users#new` |
| GET | `/super_admin/account_users/:id(.:format)` | `super_admin/account_users#show` |
| DELETE | `/super_admin/account_users/:id(.:format)` | `super_admin/account_users#destroy` |

## Database tables (2)

`access_tokens`, `installation_configs`

## Backend files (151)

### controllers (18)

- `app/controllers/concerns/access_token_auth_helper.rb`
- `app/controllers/concerns/impersonation_logging.rb`
- `app/controllers/super_admin/access_tokens_controller.rb`
- `app/controllers/super_admin/account_users_controller.rb`
- `app/controllers/super_admin/accounts_controller.rb`
- `app/controllers/super_admin/app_configs_controller.rb`
- `app/controllers/super_admin/application_controller.rb`
- `app/controllers/super_admin/dashboard_controller.rb`
- `app/controllers/super_admin/devise/sessions_controller.rb`
- `app/controllers/super_admin/installation_configs_controller.rb`
- `app/controllers/super_admin/instance_statuses_controller.rb`
- `app/controllers/super_admin/search_controller.rb`
- `app/controllers/super_admin/settings_controller.rb`
- `app/controllers/super_admin/user_diagnostics_controller.rb`
- `app/controllers/super_admin/users_controller.rb`
- `enterprise/app/controllers/enterprise/super_admin/accounts_controller.rb` (EE)
- `enterprise/app/controllers/enterprise/super_admin/app_configs_controller.rb` (EE)
- `enterprise/app/controllers/enterprise/super_admin/user_diagnostics_controller.rb` (EE)

### dashboards (5)

- `app/dashboards/access_token_dashboard.rb`
- `app/dashboards/account_dashboard.rb`
- `app/dashboards/account_user_dashboard.rb`
- `app/dashboards/installation_config_dashboard.rb`
- `app/dashboards/user_dashboard.rb`

### fields (9)

- `app/fields/account_status_field.rb`
- `app/fields/confirmed_at_field.rb`
- `app/fields/count_field.rb`
- `app/fields/secret_field.rb`
- `app/fields/serialized_field.rb`
- `app/fields/suspension_history_field.rb`
- `enterprise/app/fields/account_features_field.rb` (EE)
- `enterprise/app/fields/account_limits_field.rb` (EE)
- `enterprise/app/fields/manually_managed_features_field.rb` (EE)

### helpers (8)

- `app/helpers/super_admin/account_feature_icons.yml`
- `app/helpers/super_admin/account_features_helper.rb`
- `app/helpers/super_admin/command_bar_helper.rb`
- `app/helpers/super_admin/features.yml`
- `app/helpers/super_admin/features_helper.rb`
- `app/helpers/super_admin/navigation_helper.rb`
- `app/helpers/super_admin/ui_helper.rb`
- `app/helpers/super_admin/user_diagnostics_helper.rb`

### models (4)

- `app/models/access_token.rb`
- `app/models/concerns/access_tokenable.rb`
- `app/models/installation_config.rb`
- `app/models/super_admin.rb`

### services (2)

- `app/services/impersonation_logger.rb`
- `app/services/super_admin/search_service.rb`

### views (105)

- `app/views/api/v1/profiles/reset_access_token.json.jbuilder`
- `app/views/fields/account_status_field/_form.html.erb`
- `app/views/fields/active_storage/_form.html.erb`
- `app/views/fields/belongs_to/_form.html.erb`
- `app/views/fields/belongs_to/_index.html.erb`
- `app/views/fields/belongs_to/_show.html.erb`
- `app/views/fields/belongs_to_search/_form.html.erb`
- `app/views/fields/belongs_to_search/_index.html.erb`
- `app/views/fields/boolean/_form.html.erb`
- `app/views/fields/confirmed_at_field/_form.html.erb`
- `app/views/fields/confirmed_at_field/_show.html.erb`
- `app/views/fields/count_field/_index.html.erb`
- `app/views/fields/count_field/_show.html.erb`
- `app/views/fields/has_one/_show.html.erb`
- `app/views/fields/password/_form.html.erb`
- `app/views/fields/polymorphic/_index.html.erb`
- `app/views/fields/polymorphic/_show.html.erb`
- `app/views/fields/secret_field/_index.html.erb`
- `app/views/fields/secret_field/_show.html.erb`
- `app/views/fields/select/_form.html.erb`
- `app/views/fields/select/_index.html.erb`
- `app/views/fields/select/_show.html.erb`
- `app/views/fields/serialized_field/_form.html.erb`
- `app/views/fields/serialized_field/_index.html.erb`
- `app/views/fields/serialized_field/_show.html.erb`
- `app/views/fields/string/_form.html.erb`
- `app/views/fields/string/_show.html.erb`
- `app/views/fields/suspension_history_field/_show.html.erb`
- `app/views/fields/text/_form.html.erb`
- `app/views/fields/text/_show.html.erb`
- `app/views/layouts/super_admin/application.html.erb`
- `app/views/super_admin/accounts/_reset_cache.html.erb`
- `app/views/super_admin/accounts/_seed_data.html.erb`
- `app/views/super_admin/accounts/show.html.erb`
- `app/views/super_admin/app_configs/show.html.erb`
- `app/views/super_admin/application/_account_menu.html.erb`
- `app/views/super_admin/application/_alert.html.erb`
- `app/views/super_admin/application/_attribute.html.erb`
- `app/views/super_admin/application/_attributes.html.erb`
- `app/views/super_admin/application/_back_link.html.erb`
- `app/views/super_admin/application/_badge.html.erb`
- `app/views/super_admin/application/_brand.html.erb`
- `app/views/super_admin/application/_button.html.erb`
- `app/views/super_admin/application/_card.html.erb`
- `app/views/super_admin/application/_check_tile.html.erb`
- `app/views/super_admin/application/_chip.html.erb`
- `app/views/super_admin/application/_collection.html.erb`
- `app/views/super_admin/application/_command.html.erb`
- `app/views/super_admin/application/_command_bar.html.erb`
- `app/views/super_admin/application/_command_group.html.erb`
- `app/views/super_admin/application/_field.html.erb`
- `app/views/super_admin/application/_flashes.html.erb`
- `app/views/super_admin/application/_font_preload.html.erb`
- `app/views/super_admin/application/_form.html.erb`
- `app/views/super_admin/application/_form_card.html.erb`
- `app/views/super_admin/application/_help_link.html.erb`
- `app/views/super_admin/application/_hero.html.erb`
- `app/views/super_admin/application/_icon_button.html.erb`
- `app/views/super_admin/application/_icon_tile.html.erb`
- `app/views/super_admin/application/_javascript.html.erb`
- `app/views/super_admin/application/_kbd.html.erb`
- `app/views/super_admin/application/_nav_item.html.erb`
- `app/views/super_admin/application/_navigation.html.erb`
- `app/views/super_admin/application/_page_header.html.erb`
- `app/views/super_admin/application/_pagination.html.erb`
- `app/views/super_admin/application/_prefetch.html.erb`
- `app/views/super_admin/application/_search.html.erb`
- `app/views/super_admin/application/_secret.html.erb`
- `app/views/super_admin/application/_section.html.erb`
- `app/views/super_admin/application/_section_links.html.erb`
- `app/views/super_admin/application/_sheet.html.erb`
- `app/views/super_admin/application/_standalone.html.erb`
- `app/views/super_admin/application/_stylesheet.html.erb`
- `app/views/super_admin/application/_table.html.erb`
- `app/views/super_admin/application/_tabs.html.erb`
- `app/views/super_admin/application/_theme.html.erb`
- `app/views/super_admin/application/edit.html.erb`
- `app/views/super_admin/application/index.html.erb`
- `app/views/super_admin/application/new.html.erb`
- `app/views/super_admin/application/show.html.erb`
- `app/views/super_admin/dashboard/index.html.erb`
- `app/views/super_admin/devise/sessions/new.html.erb`
- `app/views/super_admin/instance_statuses/show.html.erb`
- `app/views/super_admin/search/index.html.erb`
- `app/views/super_admin/settings/_feature_card.html.erb`
- `app/views/super_admin/settings/show.html.erb`
- `app/views/super_admin/shared/_account_user_form.html.erb`
- `app/views/super_admin/user_diagnostics/_calls.html.erb`
- `app/views/super_admin/user_diagnostics/_empty.html.erb`
- `app/views/super_admin/user_diagnostics/_mobile.html.erb`
- `app/views/super_admin/user_diagnostics/_notice.html.erb`
- `app/views/super_admin/user_diagnostics/_push.html.erb`
- `app/views/super_admin/user_diagnostics/_web.html.erb`
- `app/views/super_admin/user_diagnostics/show.html.erb`
- `app/views/super_admin/users/_blocked_action.html.erb`
- `app/views/super_admin/users/_more_actions.html.erb`
- `app/views/super_admin/users/show.html.erb`
- `enterprise/app/views/fields/account_features_field/_form.html.erb` (EE)
- `enterprise/app/views/fields/account_features_field/_show.html.erb` (EE)
- `enterprise/app/views/fields/account_limits_field/_form.html.erb` (EE)
- `enterprise/app/views/fields/account_limits_field/_index.html.erb` (EE)
- `enterprise/app/views/fields/account_limits_field/_show.html.erb` (EE)
- `enterprise/app/views/fields/manually_managed_features_field/_form.html.erb` (EE)
- `enterprise/app/views/fields/manually_managed_features_field/_show.html.erb` (EE)
- `enterprise/app/views/super_admin/accounts/_form.html.erb` (EE)

## Ruby specs (13)

- `spec/controllers/super_admin/access_tokens_controller_spec.rb`
- `spec/controllers/super_admin/account_users_controller_spec.rb`
- `spec/controllers/super_admin/accounts_controller_spec.rb`
- `spec/controllers/super_admin/app_config_controller_spec.rb`
- `spec/controllers/super_admin/devise/sessions_controller_spec.rb`
- `spec/controllers/super_admin/installation_configs_controller_spec.rb`
- `spec/controllers/super_admin/instance_statuses_controller_spec.rb`
- `spec/controllers/super_admin/search_controller_spec.rb`
- `spec/controllers/super_admin/user_diagnostics_controller_spec.rb`
- `spec/controllers/super_admin/users_controller_spec.rb`
- `spec/enterprise/controllers/enterprise/super_admin/app_configs_controller_spec.rb`
- `spec/enterprise/controllers/super_admin/user_diagnostics_controller_spec.rb`
- `spec/models/installation_config_spec.rb`

## Frontend files (12)

- `app/javascript/dashboard/assets/scss/super_admin/_selectize.scss`
- `app/javascript/dashboard/assets/scss/super_admin/_utilities.scss`
- `app/javascript/dashboard/assets/scss/super_admin/index.scss`
- `app/javascript/dashboard/components/app/ImpersonationBanner.vue`
- `app/javascript/dashboard/composables/spec/useImpersonation.spec.js`
- `app/javascript/dashboard/composables/useImpersonation.js`
- `app/javascript/entrypoints/superadmin.js`
- `app/javascript/entrypoints/superadmin.scss`
- `app/javascript/entrypoints/superadmin_pages.js`
- `app/javascript/superadmin/commandBar.js`
- `app/javascript/superadmin/commandBar.spec.js`
- `app/javascript/superadmin_pages/views/dashboard/Index.vue`
