# Macros

**Area:** Operations

Saved sequences of conversation actions that agents run in one click.

**Feature flags:** `macros`

## HTTP routes (7)

| Verb | Path | Controller#action |
| --- | --- | --- |
| POST | `/api/v1/accounts/:account_id/macros/:id/execute(.:format)` | `api/v1/accounts/macros#execute` |
| GET | `/api/v1/accounts/:account_id/macros(.:format)` | `api/v1/accounts/macros#index` |
| POST | `/api/v1/accounts/:account_id/macros(.:format)` | `api/v1/accounts/macros#create` |
| GET | `/api/v1/accounts/:account_id/macros/:id(.:format)` | `api/v1/accounts/macros#show` |
| PATCH | `/api/v1/accounts/:account_id/macros/:id(.:format)` | `api/v1/accounts/macros#update` |
| PUT | `/api/v1/accounts/:account_id/macros/:id(.:format)` | `api/v1/accounts/macros#update` |
| DELETE | `/api/v1/accounts/:account_id/macros/:id(.:format)` | `api/v1/accounts/macros#destroy` |

## Database tables (1)

`macros`

## Backend files (12)

### controllers (1)

- `app/controllers/api/v1/accounts/macros_controller.rb`

### jobs (1)

- `app/jobs/macros_execution_job.rb`

### models (2)

- `app/models/macro.rb`
- `enterprise/app/models/enterprise/audit/macro.rb` (EE)

### policies (1)

- `app/policies/macro_policy.rb`

### services (2)

- `app/services/macros/execution_service.rb`
- `enterprise/app/services/enterprise/macros/execution_service.rb` (EE)

### views (5)

- `app/views/api/v1/accounts/macros/create.json.jbuilder`
- `app/views/api/v1/accounts/macros/index.json.jbuilder`
- `app/views/api/v1/accounts/macros/show.json.jbuilder`
- `app/views/api/v1/accounts/macros/update.json.jbuilder`
- `app/views/api/v1/models/_macro.json.jbuilder`

## Ruby specs (7)

- `spec/controllers/api/v1/accounts/macros_controller_spec.rb`
- `spec/enterprise/jobs/macros_execution_job_spec.rb`
- `spec/enterprise/models/macro_spec.rb`
- `spec/enterprise/services/macros/execution_service_spec.rb`
- `spec/jobs/macros_execution_job_spec.rb`
- `spec/models/macro_spec.rb`
- `spec/services/macros/execution_service_spec.rb`

## Frontend files (31)

- `app/javascript/dashboard/api/macros.js`
- `app/javascript/dashboard/api/specs/macros.spec.js`
- `app/javascript/dashboard/composables/commands/useMacroHotKeys.js`
- `app/javascript/dashboard/composables/spec/useMacroExecution.spec.js`
- `app/javascript/dashboard/composables/spec/useMacros.spec.js`
- `app/javascript/dashboard/composables/spec/useOrderedMacros.spec.js`
- `app/javascript/dashboard/composables/useMacroExecution.js`
- `app/javascript/dashboard/composables/useMacros.js`
- `app/javascript/dashboard/composables/useOrderedMacros.js`
- `app/javascript/dashboard/helper/specs/macrosFixtures.js`
- `app/javascript/dashboard/helper/specs/macrosHelper.spec.js`
- `app/javascript/dashboard/routes/dashboard/conversation/Macros/List.vue`
- `app/javascript/dashboard/routes/dashboard/conversation/Macros/MacroItem.vue`
- `app/javascript/dashboard/routes/dashboard/conversation/Macros/MacroPreview.vue`
- `app/javascript/dashboard/routes/dashboard/settings/macros/Index.vue`
- `app/javascript/dashboard/routes/dashboard/settings/macros/MacroEditor.vue`
- `app/javascript/dashboard/routes/dashboard/settings/macros/MacroForm.vue`
- `app/javascript/dashboard/routes/dashboard/settings/macros/MacroNode.vue`
- `app/javascript/dashboard/routes/dashboard/settings/macros/MacroNodes.vue`
- `app/javascript/dashboard/routes/dashboard/settings/macros/MacroProperties.vue`
- `app/javascript/dashboard/routes/dashboard/settings/macros/MacrosTableRow.vue`
- `app/javascript/dashboard/routes/dashboard/settings/macros/constants.js`
- `app/javascript/dashboard/routes/dashboard/settings/macros/macroHelper.js`
- `app/javascript/dashboard/routes/dashboard/settings/macros/macros.routes.js`
- `app/javascript/dashboard/routes/dashboard/settings/macros/specs/MacroProperties.spec.js`
- `app/javascript/dashboard/routes/dashboard/settings/macros/specs/MacrosTableRow.spec.js`
- `app/javascript/dashboard/store/modules/macros.js`
- `app/javascript/dashboard/store/modules/specs/macros/actions.spec.js`
- `app/javascript/dashboard/store/modules/specs/macros/fixtures.js`
- `app/javascript/dashboard/store/modules/specs/macros/getters.spec.js`
- `app/javascript/dashboard/store/modules/specs/macros/mutations.spec.js`
