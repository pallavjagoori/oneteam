# Platform API

**Area:** Integrations

Platform apps that create and manage accounts, users and bots from outside an installation.

## HTTP routes (32)

| Verb | Path | Controller#action |
| --- | --- | --- |
| GET | `/platform/api/v1/users/:id/login(.:format)` | `platform/api/v1/users#login` |
| POST | `/platform/api/v1/users/:id/token(.:format)` | `platform/api/v1/users#token` |
| POST | `/platform/api/v1/users(.:format)` | `platform/api/v1/users#create` |
| GET | `/platform/api/v1/users/:id(.:format)` | `platform/api/v1/users#show` |
| PATCH | `/platform/api/v1/users/:id(.:format)` | `platform/api/v1/users#update` |
| PUT | `/platform/api/v1/users/:id(.:format)` | `platform/api/v1/users#update` |
| DELETE | `/platform/api/v1/users/:id(.:format)` | `platform/api/v1/users#destroy` |
| DELETE | `/platform/api/v1/accounts/:account_id/account_users(.:format)` | `platform/api/v1/account_users#destroy` |
| GET | `/platform/api/v1/accounts/:account_id/account_users(.:format)` | `platform/api/v1/account_users#index` |
| POST | `/platform/api/v1/accounts/:account_id/account_users(.:format)` | `platform/api/v1/account_users#create` |
| GET | `/platform/api/v1/accounts(.:format)` | `platform/api/v1/accounts#index` |
| POST | `/platform/api/v1/accounts(.:format)` | `platform/api/v1/accounts#create` |
| GET | `/platform/api/v1/accounts/:id(.:format)` | `platform/api/v1/accounts#show` |
| PATCH | `/platform/api/v1/accounts/:id(.:format)` | `platform/api/v1/accounts#update` |
| PUT | `/platform/api/v1/accounts/:id(.:format)` | `platform/api/v1/accounts#update` |
| DELETE | `/platform/api/v1/accounts/:id(.:format)` | `platform/api/v1/accounts#destroy` |
| GET | `/super_admin/platform_apps(.:format)` | `super_admin/platform_apps#index` |
| POST | `/super_admin/platform_apps(.:format)` | `super_admin/platform_apps#create` |
| GET | `/super_admin/platform_apps/new(.:format)` | `super_admin/platform_apps#new` |
| GET | `/super_admin/platform_apps/:id/edit(.:format)` | `super_admin/platform_apps#edit` |
| GET | `/super_admin/platform_apps/:id(.:format)` | `super_admin/platform_apps#show` |
| PATCH | `/super_admin/platform_apps/:id(.:format)` | `super_admin/platform_apps#update` |
| PUT | `/super_admin/platform_apps/:id(.:format)` | `super_admin/platform_apps#update` |
| DELETE | `/super_admin/platform_apps/:id(.:format)` | `super_admin/platform_apps#destroy` |
| GET | `/super_admin/platform_banners(.:format)` | `super_admin/platform_banners#index` |
| POST | `/super_admin/platform_banners(.:format)` | `super_admin/platform_banners#create` |
| GET | `/super_admin/platform_banners/new(.:format)` | `super_admin/platform_banners#new` |
| GET | `/super_admin/platform_banners/:id/edit(.:format)` | `super_admin/platform_banners#edit` |
| GET | `/super_admin/platform_banners/:id(.:format)` | `super_admin/platform_banners#show` |
| PATCH | `/super_admin/platform_banners/:id(.:format)` | `super_admin/platform_banners#update` |
| PUT | `/super_admin/platform_banners/:id(.:format)` | `super_admin/platform_banners#update` |
| DELETE | `/super_admin/platform_banners/:id(.:format)` | `super_admin/platform_banners#destroy` |

## Database tables (3)

`platform_app_permissibles`, `platform_apps`, `platform_banners`

## Backend files (21)

### controllers (6)

- `app/controllers/platform/api/v1/account_users_controller.rb`
- `app/controllers/platform/api/v1/accounts_controller.rb`
- `app/controllers/platform/api/v1/users_controller.rb`
- `app/controllers/platform_controller.rb`
- `app/controllers/super_admin/platform_apps_controller.rb`
- `app/controllers/super_admin/platform_banners_controller.rb`

### dashboards (2)

- `app/dashboards/platform_app_dashboard.rb`
- `app/dashboards/platform_banner_dashboard.rb`

### models (3)

- `app/models/platform_app.rb`
- `app/models/platform_app_permissible.rb`
- `app/models/platform_banner.rb`

### views (10)

- `app/views/platform/api/v1/accounts/create.json.jbuilder`
- `app/views/platform/api/v1/accounts/index.json.jbuilder`
- `app/views/platform/api/v1/accounts/show.json.jbuilder`
- `app/views/platform/api/v1/accounts/update.json.jbuilder`
- `app/views/platform/api/v1/models/_account.json.jbuilder`
- `app/views/platform/api/v1/models/_user.json.jbuilder`
- `app/views/platform/api/v1/users/create.json.jbuilder`
- `app/views/platform/api/v1/users/show.json.jbuilder`
- `app/views/platform/api/v1/users/token.json.jbuilder`
- `app/views/platform/api/v1/users/update.json.jbuilder`

## Ruby specs (6)

- `spec/controllers/platform/api/v1/account_users_controller_spec.rb`
- `spec/controllers/platform/api/v1/accounts_controller_spec.rb`
- `spec/controllers/platform/api/v1/users_controller_spec.rb`
- `spec/controllers/super_admin/platform_apps_controller_spec.rb`
- `spec/models/platform_app_permissible_spec.rb`
- `spec/models/platform_app_spec.rb`

## Frontend files (2)

- `app/javascript/shared/helpers/platform.js`
- `app/javascript/shared/helpers/specs/platform.spec.js`
