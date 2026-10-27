# SAML single sign-on

**Area:** Security

SAML SSO settings and sign-in.

**Feature flags:** `saml`

## HTTP routes (10)

| Verb | Path | Controller#action |
| --- | --- | --- |
| POST | `/api/v1/accounts/:account_id/saml_settings/refresh(.:format)` | `api/v1/accounts/saml_settings#refresh` |
| GET | `/api/v1/accounts/:account_id/saml_settings(.:format)` | `api/v1/accounts/saml_settings#show` |
| PATCH | `/api/v1/accounts/:account_id/saml_settings(.:format)` | `api/v1/accounts/saml_settings#update` |
| PUT | `/api/v1/accounts/:account_id/saml_settings(.:format)` | `api/v1/accounts/saml_settings#update` |
| DELETE | `/api/v1/accounts/:account_id/saml_settings(.:format)` | `api/v1/accounts/saml_settings#destroy` |
| POST | `/api/v1/accounts/:account_id/saml_settings(.:format)` | `api/v1/accounts/saml_settings#create` |
| POST | `/api/v1/auth/saml_login(.:format)` | `api/v1/auth#saml_login` |
| GET | `/.well-known/apple-app-site-association(.:format)` | `apple_app#site_association` |
| GET|POST | `/omniauth/saml(.:format)` | `devise/omniauth_callbacks#passthru` |
| GET|POST | `/omniauth/saml/callback(.:format)` | `devise/omniauth_callbacks#saml` |

## Database tables (1)

`account_saml_settings`

## Backend files (19)

### builders (1)

- `enterprise/app/builders/saml_user_builder.rb` (EE)

### controllers (1)

- `enterprise/app/controllers/api/v1/accounts/saml_settings_controller.rb` (EE)

### helpers (1)

- `enterprise/app/helpers/saml_authentication_helper.rb` (EE)

### jobs (1)

- `enterprise/app/jobs/saml/update_account_users_provider_job.rb` (EE)

### lib (4)

- `lib/integrations/bot_processor_service.rb`
- `lib/integrations/dialogflow/processor_service.rb`
- `lib/integrations/dyte/processor_service.rb`
- `lib/integrations/linear/processor_service.rb`

### models (2)

- `app/models/concerns/sso_authenticatable.rb`
- `enterprise/app/models/account_saml_settings.rb` (EE)

### policies (1)

- `enterprise/app/policies/account_saml_settings_policy.rb` (EE)

### services (3)

- `app/services/crm/base_processor_service.rb`
- `app/services/crm/leadsquared/processor_service.rb`
- `enterprise/app/services/saml/idp_metadata_service.rb` (EE)

### views (5)

- `app/views/apple_app/site_association.html.erb`
- `enterprise/app/views/api/v1/accounts/saml_settings/create.json.jbuilder` (EE)
- `enterprise/app/views/api/v1/accounts/saml_settings/show.json.jbuilder` (EE)
- `enterprise/app/views/api/v1/accounts/saml_settings/update.json.jbuilder` (EE)
- `enterprise/app/views/api/v1/models/_account_saml_settings.json.jbuilder` (EE)

## Ruby specs (10)

- `spec/enterprise/builders/saml_user_builder_spec.rb`
- `spec/enterprise/controllers/api/v1/accounts/saml_settings_controller_spec.rb`
- `spec/enterprise/initializers/omniauth_saml_spec.rb`
- `spec/enterprise/jobs/saml/update_account_users_provider_job_spec.rb`
- `spec/enterprise/models/account_saml_settings_spec.rb`
- `spec/enterprise/services/saml/idp_metadata_service_spec.rb`
- `spec/lib/integrations/dialogflow/processor_service_spec.rb`
- `spec/lib/integrations/dyte/processor_service_spec.rb`
- `spec/lib/integrations/linear/processor_service_spec.rb`
- `spec/services/crm/leadsquared/processor_service_spec.rb`

## Frontend files (6)

- `app/javascript/dashboard/api/samlSettings.js`
- `app/javascript/dashboard/routes/dashboard/settings/security/components/SamlAttributeMap.vue`
- `app/javascript/dashboard/routes/dashboard/settings/security/components/SamlInfoSection.vue`
- `app/javascript/dashboard/routes/dashboard/settings/security/components/SamlPaywall.vue`
- `app/javascript/dashboard/routes/dashboard/settings/security/components/SamlSettings.vue`
- `app/javascript/v3/views/login/Saml.vue`
