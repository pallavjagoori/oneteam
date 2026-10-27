# Shared backend foundations

**Area:** Platform internals

Base controllers, concerns, helpers, configuration loaders, Redis helpers, rate limiting, exception handling, API docs and other code every feature depends on.

**Feature flags:** `ip_lookup`

## HTTP routes (3)

| Verb | Path | Controller#action |
| --- | --- | --- |
| GET | `/api(.:format)` | `api#index` |
| GET | `/swagger/*path(.:format)` | `swagger#respond` |
| GET | `/swagger(.:format)` | `swagger#respond` |

## Database tables (0)

None.

## Backend files (58)

### controllers (12)

- `app/controllers/api/base_controller.rb`
- `app/controllers/api_controller.rb`
- `app/controllers/application_controller.rb`
- `app/controllers/concerns/.keep`
- `app/controllers/concerns/domain_helper.rb`
- `app/controllers/concerns/hmac_concern.rb`
- `app/controllers/concerns/request_exception_handler.rb`
- `app/controllers/concerns/switch_locale.rb`
- `app/controllers/oauth_callback_controller.rb`
- `app/controllers/public_controller.rb`
- `app/controllers/swagger_controller.rb`
- `enterprise/app/controllers/enterprise/concerns/application_controller_concern.rb` (EE)

### helpers (8)

- `app/helpers/api/base_helper.rb`
- `app/helpers/application_helper.rb`
- `app/helpers/cache_keys_helper.rb`
- `app/helpers/data_helper.rb`
- `app/helpers/date_range_helper.rb`
- `app/helpers/file_type_helper.rb`
- `app/helpers/home_helper.rb`
- `app/helpers/timezone_helper.rb`

### lib (19)

- `lib/chatwoot_app.rb`
- `lib/chatwoot_captcha.rb`
- `lib/chatwoot_exception_tracker.rb`
- `lib/config_loader.rb`
- `lib/custom_exceptions/base.rb`
- `lib/custom_exceptions/pdf.rb`
- `lib/exception_list.rb`
- `lib/global_config.rb`
- `lib/global_config_service.rb`
- `lib/opentelemetry_config.rb`
- `lib/redis/alfred.rb`
- `lib/redis/config.rb`
- `lib/redis/lock_manager.rb`
- `lib/redis/rate_limit.rb`
- `lib/redis/redis_keys.rb`
- `lib/redis/secure_storage.rb`
- `lib/regex_helper.rb`
- `lib/url_helper.rb`
- `enterprise/lib/enterprise.rb` (EE)

### mailers (1)

- `app/mailers/application_mailer.rb`

### models (11)

- `app/models/application_record.rb`
- `app/models/concerns/.keep`
- `app/models/concerns/cache_keys.rb`
- `app/models/concerns/featurable.rb`
- `app/models/concerns/json_schema_validator.rb`
- `app/models/concerns/pubsubable.rb`
- `app/models/concerns/reauthorizable.rb`
- `app/models/concerns/sort_handler.rb`
- `app/models/jsonb_attributes_length_validator.rb`
- `enterprise/app/models/concerns/safe_endpoint_validatable.rb` (EE)
- `enterprise/app/models/enterprise/application_record.rb` (EE)

### policies (1)

- `app/policies/application_policy.rb`

### services (6)

- `app/services/action_service.rb`
- `app/services/geocoder/setup_service.rb`
- `app/services/ip_lookup_service.rb`
- `app/services/request_device_info.rb`
- `app/services/social_link_parser.rb`
- `enterprise/app/services/enterprise/action_service.rb` (EE)

## Ruby specs (26)

- `spec/controllers/api/base_controller_spec.rb`
- `spec/controllers/api_controller_spec.rb`
- `spec/controllers/swagger_controller_spec.rb`
- `spec/enterprise/services/enterprise/action_service_spec.rb`
- `spec/helpers/cache_keys_helper_spec.rb`
- `spec/helpers/url_helper_spec.rb`
- `spec/initializers/rack_attack_spec.rb`
- `spec/lib/chatwoot_app_spec.rb`
- `spec/lib/chatwoot_captcha_spec.rb`
- `spec/lib/chatwoot_exception_tracker_spec.rb`
- `spec/lib/config_loader_spec.rb`
- `spec/lib/global_config_service_spec.rb`
- `spec/lib/global_config_spec.rb`
- `spec/lib/redis/config_spec.rb`
- `spec/lib/redis/lock_manager_spec.rb`
- `spec/lib/redis/rate_limit_spec.rb`
- `spec/lib/redis/secure_storage_spec.rb`
- `spec/models/application_record_external_credentials_encryption_spec.rb`
- `spec/models/concerns/cache_keys_spec.rb`
- `spec/models/concerns/featurable_spec.rb`
- `spec/models/concerns/json_schema_validator_spec.rb`
- `spec/models/concerns/switch_locale_spec.rb`
- `spec/requests/api_bearer_authentication_spec.rb`
- `spec/services/action_service_spec.rb`
- `spec/services/request_device_info_spec.rb`
- `spec/swagger/openapi_spec.rb`

## Frontend files (0)

