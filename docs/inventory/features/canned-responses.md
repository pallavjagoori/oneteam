# Canned responses

**Area:** Operations

Saved reply snippets agents insert with a short code.

**Feature flags:** `canned_responses`

## HTTP routes (5)

| Verb | Path | Controller#action |
| --- | --- | --- |
| GET | `/api/v1/accounts/:account_id/canned_responses(.:format)` | `api/v1/accounts/canned_responses#index` |
| POST | `/api/v1/accounts/:account_id/canned_responses(.:format)` | `api/v1/accounts/canned_responses#create` |
| PATCH | `/api/v1/accounts/:account_id/canned_responses/:id(.:format)` | `api/v1/accounts/canned_responses#update` |
| PUT | `/api/v1/accounts/:account_id/canned_responses/:id(.:format)` | `api/v1/accounts/canned_responses#update` |
| DELETE | `/api/v1/accounts/:account_id/canned_responses/:id(.:format)` | `api/v1/accounts/canned_responses#destroy` |

## Database tables (1)

`canned_responses`

## Backend files (3)

### controllers (1)

- `app/controllers/api/v1/accounts/canned_responses_controller.rb`

### helpers (1)

- `app/helpers/api/v1/canned_responses_helper.rb`

### models (1)

- `app/models/canned_response.rb`

## Ruby specs (1)

- `spec/controllers/api/v1/accounts/canned_responses_controller_spec.rb`

## Frontend files (7)

- `app/javascript/dashboard/api/cannedResponse.js`
- `app/javascript/dashboard/routes/dashboard/settings/canned/AddCanned.vue`
- `app/javascript/dashboard/routes/dashboard/settings/canned/EditCanned.vue`
- `app/javascript/dashboard/routes/dashboard/settings/canned/Index.vue`
- `app/javascript/dashboard/routes/dashboard/settings/canned/canned.routes.js`
- `app/javascript/dashboard/store/modules/cannedResponse.js`
- `app/javascript/dashboard/store/modules/specs/cannedResponses/getters.spec.js`
