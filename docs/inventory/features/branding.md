# Branding and email templates

**Area:** Administration

Branded email layouts, custom reply domains, branding removal and email templates.

**Feature flags:** `disable_branding`, `custom_reply_domain`

## HTTP routes (3)

| Verb | Path | Controller#action |
| --- | --- | --- |
| GET | `/api/v1/accounts/:account_id/branded_email_layout(.:format)` | `api/v1/accounts/branded_email_layouts#show` |
| PATCH | `/api/v1/accounts/:account_id/branded_email_layout(.:format)` | `api/v1/accounts/branded_email_layouts#update` |
| PUT | `/api/v1/accounts/:account_id/branded_email_layout(.:format)` | `api/v1/accounts/branded_email_layouts#update` |

## Database tables (1)

`email_templates`

## Backend files (17)

### controllers (1)

- `app/controllers/api/v1/accounts/branded_email_layouts_controller.rb`

### drops (6)

- `app/drops/account_drop.rb`
- `app/drops/base_drop.rb`
- `app/drops/conversation_drop.rb`
- `app/drops/inbox_drop.rb`
- `app/drops/message_drop.rb`
- `app/drops/user_drop.rb`

### lib (1)

- `lib/action_view/template/handlers/liquid.rb`

### models (3)

- `app/models/concerns/inbox_branded_email_layoutable.rb`
- `app/models/concerns/liquidable.rb`
- `app/models/email_template.rb`

### services (3)

- `app/services/email_templates/db_resolver_service.rb`
- `app/services/website_branding_service.rb`
- `enterprise/app/services/enterprise/website_branding_service.rb` (EE)

### views (3)

- `app/views/api/v1/accounts/branded_email_layouts/show.json.jbuilder`
- `app/views/api/v1/accounts/branded_email_layouts/update.json.jbuilder`
- `app/views/layouts/mailer/base.liquid`

## Ruby specs (6)

- `spec/controllers/api/v1/accounts/branded_email_layouts_controller_spec.rb`
- `spec/drops/user_drop_spec.rb`
- `spec/enterprise/services/enterprise/website_branding_service_spec.rb`
- `spec/lib/email_templates/db_resolver_service_spec.rb`
- `spec/models/email_template_spec.rb`
- `spec/services/website_branding_service_spec.rb`

## Frontend files (4)

- `app/javascript/dashboard/components/CustomBrandPolicyWrapper.vue`
- `app/javascript/shared/components/Branding.vue`
- `app/javascript/shared/composables/specs/useBranding.spec.js`
- `app/javascript/shared/composables/useBranding.js`
