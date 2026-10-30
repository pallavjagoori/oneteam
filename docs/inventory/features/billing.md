# Billing and plans

**Area:** Administration

Stripe subscriptions, plan limits and usage for cloud installations (enterprise).

## HTTP routes (16)

| Verb | Path | Controller#action |
| --- | --- | --- |
| GET | `/enterprise/api/v1/accounts/:id/billing_summary(.:format)` | `enterprise/api/v1/accounts#billing_summary` |
| POST | `/enterprise/api/v1/accounts/:id/checkout(.:format)` | `enterprise/api/v1/accounts#checkout` |
| POST | `/enterprise/api/v1/accounts/:id/subscription(.:format)` | `enterprise/api/v1/accounts#subscription` |
| POST | `/enterprise/api/v1/accounts/:id/select_billing_currency(.:format)` | `enterprise/api/v1/accounts#select_billing_currency` |
| GET | `/enterprise/api/v1/accounts/:id/limits(.:format)` | `enterprise/api/v1/accounts#limits` |
| POST | `/enterprise/api/v1/accounts/:id/toggle_deletion(.:format)` | `enterprise/api/v1/accounts#toggle_deletion` |
| POST | `/enterprise/api/v1/accounts/:id/topup_checkout(.:format)` | `enterprise/api/v1/accounts#topup_checkout` |
| GET | `/enterprise/api/v1/accounts/:id/topup_options(.:format)` | `enterprise/api/v1/accounts#topup_options` |
| GET | `/enterprise/api/v1/accounts(.:format)` | `enterprise/api/v1/accounts#index` |
| POST | `/enterprise/api/v1/accounts(.:format)` | `enterprise/api/v1/accounts#create` |
| GET | `/enterprise/api/v1/accounts/new(.:format)` | `enterprise/api/v1/accounts#new` |
| GET | `/enterprise/api/v1/accounts/:id/edit(.:format)` | `enterprise/api/v1/accounts#edit` |
| GET | `/enterprise/api/v1/accounts/:id(.:format)` | `enterprise/api/v1/accounts#show` |
| PATCH | `/enterprise/api/v1/accounts/:id(.:format)` | `enterprise/api/v1/accounts#update` |
| PUT | `/enterprise/api/v1/accounts/:id(.:format)` | `enterprise/api/v1/accounts#update` |
| DELETE | `/enterprise/api/v1/accounts/:id(.:format)` | `enterprise/api/v1/accounts#destroy` |

## Database tables (0)

None.

## Backend files (23)

### controllers (2)

- `enterprise/app/controllers/enterprise/api/v1/accounts_controller.rb` (EE)
- `enterprise/app/controllers/enterprise/api/v1/accounts_settings.rb` (EE)

### helpers (1)

- `app/helpers/billing_helper.rb`

### jobs (2)

- `enterprise/app/jobs/enterprise/cancel_cloud_subscriptions_job.rb` (EE)
- `enterprise/app/jobs/enterprise/create_stripe_customer_job.rb` (EE)

### lib (1)

- `lib/limits.rb`

### models (1)

- `enterprise/app/models/enterprise/account/plan_usage_and_limits.rb` (EE)

### services (12)

- `enterprise/app/services/enterprise/billing/cancel_cloud_subscriptions_service.rb` (EE)
- `enterprise/app/services/enterprise/billing/create_session_service.rb` (EE)
- `enterprise/app/services/enterprise/billing/create_stripe_customer_service.rb` (EE)
- `enterprise/app/services/enterprise/billing/currencies.rb` (EE)
- `enterprise/app/services/enterprise/billing/handle_stripe_event_service.rb` (EE)
- `enterprise/app/services/enterprise/billing/plan_configuration.rb` (EE)
- `enterprise/app/services/enterprise/billing/reconcile_plan_features_service.rb` (EE)
- `enterprise/app/services/enterprise/billing/summary_service.rb` (EE)
- `enterprise/app/services/enterprise/billing/topup_checkout_service.rb` (EE)
- `enterprise/app/services/enterprise/billing/topup_fulfillment_service.rb` (EE)
- `enterprise/app/services/internal/accounts/cloud_plan_activation_conversion_service.rb` (EE)
- `enterprise/app/services/internal/reconcile_plan_config_service.rb` (EE)

### views (4)

- `app/views/super_admin/settings/_upgrade_button_community.html.erb`
- `app/views/super_admin/settings/_upgrade_button_enterprise.html.erb`
- `enterprise/app/views/enterprise/api/v1/accounts/partials/_account.json.jbuilder` (EE)
- `enterprise/app/views/enterprise/api/v1/models/_account_billing.json.jbuilder` (EE)

## Ruby specs (19)

- `spec/controllers/super_admin/app_configs_controller_stripe_spec.rb`
- `spec/enterprise/controllers/enterprise/api/v1/accounts_billing_providers_spec.rb`
- `spec/enterprise/controllers/enterprise/api/v1/accounts_controller_spec.rb`
- `spec/enterprise/controllers/enterprise/webooks/stripe_controller_spec.rb`
- `spec/enterprise/jobs/enterprise/cancel_cloud_subscriptions_job_spec.rb`
- `spec/enterprise/jobs/enterprise/create_stripe_customer_job_spec.rb`
- `spec/enterprise/services/enterprise/billing/cancel_cloud_subscriptions_service_spec.rb`
- `spec/enterprise/services/enterprise/billing/create_session_service_spec.rb`
- `spec/enterprise/services/enterprise/billing/create_stripe_customer_service_spec.rb`
- `spec/enterprise/services/enterprise/billing/currencies_spec.rb`
- `spec/enterprise/services/enterprise/billing/handle_stripe_event_service_cancellation_spec.rb`
- `spec/enterprise/services/enterprise/billing/handle_stripe_event_service_spec.rb`
- `spec/enterprise/services/enterprise/billing/plan_configuration_spec.rb`
- `spec/enterprise/services/enterprise/billing/reconcile_plan_features_service_spec.rb`
- `spec/enterprise/services/enterprise/billing/topup_checkout_service_spec.rb`
- `spec/enterprise/services/enterprise/billing/topup_fulfillment_service_spec.rb`
- `spec/enterprise/services/internal/accounts/cloud_plan_activation_conversion_service_spec.rb`
- `spec/enterprise/services/internal/reconcile_plan_config_service_spec.rb`
- `spec/helpers/billing_helper_spec.rb`

## Frontend files (16)

- `app/javascript/dashboard/composables/useTranslationPlan.js`
- `app/javascript/dashboard/constants/billing.js`
- `app/javascript/dashboard/helper/specs/stripeHelper.spec.js`
- `app/javascript/dashboard/helper/stripeHelper.js`
- `app/javascript/dashboard/routes/dashboard/settings/billing/Index.vue`
- `app/javascript/dashboard/routes/dashboard/settings/billing/ProviderIndex.vue`
- `app/javascript/dashboard/routes/dashboard/settings/billing/billing.routes.js`
- `app/javascript/dashboard/routes/dashboard/settings/billing/components/BillingCard.vue`
- `app/javascript/dashboard/routes/dashboard/settings/billing/components/BillingHeader.vue`
- `app/javascript/dashboard/routes/dashboard/settings/billing/components/BillingMeter.vue`
- `app/javascript/dashboard/routes/dashboard/settings/billing/components/CreditPackageCard.vue`
- `app/javascript/dashboard/routes/dashboard/settings/billing/components/DetailItem.vue`
- `app/javascript/dashboard/routes/dashboard/settings/billing/components/PurchaseCreditsModal.vue`
- `app/javascript/dashboard/routes/dashboard/settings/billing/specs/Index.spec.js`
- `app/javascript/dashboard/routes/dashboard/suspended/Index.vue`
- `app/javascript/dashboard/routes/dashboard/upgrade/UpgradePage.vue`
