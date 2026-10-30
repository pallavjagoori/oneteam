# Custom roles and permissions

**Area:** Security

Custom agent roles with fine-grained permissions.

**Feature flags:** `custom_roles`

## HTTP routes (6)

| Verb | Path | Controller#action |
| --- | --- | --- |
| GET | `/api/v1/accounts/:account_id/custom_roles(.:format)` | `api/v1/accounts/custom_roles#index` |
| POST | `/api/v1/accounts/:account_id/custom_roles(.:format)` | `api/v1/accounts/custom_roles#create` |
| GET | `/api/v1/accounts/:account_id/custom_roles/:id(.:format)` | `api/v1/accounts/custom_roles#show` |
| PATCH | `/api/v1/accounts/:account_id/custom_roles/:id(.:format)` | `api/v1/accounts/custom_roles#update` |
| PUT | `/api/v1/accounts/:account_id/custom_roles/:id(.:format)` | `api/v1/accounts/custom_roles#update` |
| DELETE | `/api/v1/accounts/:account_id/custom_roles/:id(.:format)` | `api/v1/accounts/custom_roles#destroy` |

## Database tables (1)

`custom_roles`

## Backend files (8)

### controllers (1)

- `enterprise/app/controllers/api/v1/accounts/custom_roles_controller.rb` (EE)

### models (1)

- `enterprise/app/models/custom_role.rb` (EE)

### policies (1)

- `enterprise/app/policies/custom_role_policy.rb` (EE)

### views (5)

- `enterprise/app/views/api/v1/accounts/custom_roles/create.json.jbuilder` (EE)
- `enterprise/app/views/api/v1/accounts/custom_roles/index.json.jbuilder` (EE)
- `enterprise/app/views/api/v1/accounts/custom_roles/show.json.jbuilder` (EE)
- `enterprise/app/views/api/v1/accounts/custom_roles/update.json.jbuilder` (EE)
- `enterprise/app/views/api/v1/models/_custom_role.json.jbuilder` (EE)

## Ruby specs (2)

- `spec/enterprise/controllers/api/v1/accounts/custom_roles_controller_spec.rb`
- `spec/enterprise/models/custom_role_spec.rb`

## Frontend files (8)

- `app/javascript/dashboard/constants/permissions.js`
- `app/javascript/dashboard/helper/permissionsHelper.js`
- `app/javascript/dashboard/helper/specs/permissionsHelper.spec.js`
- `app/javascript/dashboard/routes/dashboard/settings/customRoles/Index.vue`
- `app/javascript/dashboard/routes/dashboard/settings/customRoles/component/CustomRoleModal.vue`
- `app/javascript/dashboard/routes/dashboard/settings/customRoles/component/CustomRolePaywall.vue`
- `app/javascript/dashboard/routes/dashboard/settings/customRoles/component/CustomRoleTableBody.vue`
- `app/javascript/dashboard/routes/dashboard/settings/customRoles/customRole.routes.js`
