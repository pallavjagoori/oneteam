# Custom filters and saved views

**Area:** Operations

Advanced filters and saved folders and segments for conversations and contacts.

## HTTP routes (10)

| Verb | Path | Controller#action |
| --- | --- | --- |
| POST | `/api/v1/accounts/:account_id/contact_inboxes/filter(.:format)` | `api/v1/accounts/contact_inboxes#filter` |
| POST | `/api/v1/accounts/:account_id/conversations/filter(.:format)` | `api/v1/accounts/conversations#filter` |
| POST | `/api/v1/accounts/:account_id/companies/:company_id/conversations/filter(.:format)` | `api/v1/accounts/companies/conversations#filter` |
| POST | `/api/v1/accounts/:account_id/contacts/filter(.:format)` | `api/v1/accounts/contacts#filter` |
| GET | `/api/v1/accounts/:account_id/custom_filters(.:format)` | `api/v1/accounts/custom_filters#index` |
| POST | `/api/v1/accounts/:account_id/custom_filters(.:format)` | `api/v1/accounts/custom_filters#create` |
| GET | `/api/v1/accounts/:account_id/custom_filters/:id(.:format)` | `api/v1/accounts/custom_filters#show` |
| PATCH | `/api/v1/accounts/:account_id/custom_filters/:id(.:format)` | `api/v1/accounts/custom_filters#update` |
| PUT | `/api/v1/accounts/:account_id/custom_filters/:id(.:format)` | `api/v1/accounts/custom_filters#update` |
| DELETE | `/api/v1/accounts/:account_id/custom_filters/:id(.:format)` | `api/v1/accounts/custom_filters#destroy` |

## Database tables (1)

`custom_filters`

## Backend files (32)

### controllers (1)

- `app/controllers/api/v1/accounts/custom_filters_controller.rb`

### helpers (1)

- `app/helpers/filters/filter_helper.rb`

### lib (2)

- `lib/custom_exceptions/custom_filter.rb`
- `lib/filters/filter_keys.yml`

### models (2)

- `app/models/concerns/message_filter_helpers.rb`
- `app/models/custom_filter.rb`

### policies (1)

- `app/policies/custom_filter_policy.rb`

### services (15)

- `app/services/companies/conversation_filter_service.rb`
- `app/services/contacts/filter_service.rb`
- `app/services/conversations/filter_service.rb`
- `app/services/conversations/permission_filter_service.rb`
- `app/services/conversations/unread_counts/filter_query_counter.rb`
- `app/services/conversations/unread_counts/filtered_count_instrumentation.rb`
- `app/services/conversations/unread_counts/filtered_count_invalidator.rb`
- `app/services/conversations/unread_counts/filtered_count_snapshot_resolver.rb`
- `app/services/conversations/unread_counts/filtered_count_store.rb`
- `app/services/conversations/unread_counts/filtered_count_store_keys.rb`
- `app/services/conversations/unread_counts/filtered_count_version_cache.rb`
- `app/services/conversations/unread_counts/filtered_counter.rb`
- `app/services/filter_service.rb`
- `app/services/filters/date_filter_helper.rb`
- `enterprise/app/services/enterprise/conversations/permission_filter_service.rb` (EE)

### views (10)

- `app/views/api/v1/accounts/contact_inboxes/filter.json.jbuilder`
- `app/views/api/v1/accounts/contacts/filter.json.jbuilder`
- `app/views/api/v1/accounts/conversations/filter.json.jbuilder`
- `app/views/api/v1/accounts/custom_filters/create.json.jbuilder`
- `app/views/api/v1/accounts/custom_filters/index.json.jbuilder`
- `app/views/api/v1/accounts/custom_filters/show.json.jbuilder`
- `app/views/api/v1/accounts/custom_filters/update.json.jbuilder`
- `app/views/api/v1/models/_custom_filter.json.jbuilder`
- `app/views/super_admin/application/_filter_bar.html.erb`
- `app/views/super_admin/application/_filters.html.erb`

## Ruby specs (13)

- `spec/controllers/api/v1/accounts/custom_filters_controller_spec.rb`
- `spec/enterprise/services/conversations/unread_counts/filtered_counter_spec.rb`
- `spec/enterprise/services/enterprise/conversations/permission_filter_service_spec.rb`
- `spec/models/custom_filter_spec.rb`
- `spec/services/contacts/filter_service_spec.rb`
- `spec/services/conversations/filter_service_frontend_alignment_spec.rb`
- `spec/services/conversations/filter_service_spec.rb`
- `spec/services/conversations/permission_filter_service_spec.rb`
- `spec/services/conversations/unread_counts/filter_query_counter_spec.rb`
- `spec/services/conversations/unread_counts/filtered_count_instrumentation_spec.rb`
- `spec/services/conversations/unread_counts/filtered_count_invalidator_spec.rb`
- `spec/services/conversations/unread_counts/filtered_count_store_spec.rb`
- `spec/services/conversations/unread_counts/filtered_counter_spec.rb`

## Frontend files (53)

- `app/javascript/dashboard/api/customViews.js`
- `app/javascript/dashboard/components-next/Companies/CompanyDetail/CompanyConversationFilters.vue`
- `app/javascript/dashboard/components-next/Contacts/ContactsHeader/components/ContactsActiveFiltersPreview.vue`
- `app/javascript/dashboard/components-next/filter/ActiveFilterPreview.story.vue`
- `app/javascript/dashboard/components-next/filter/ActiveFilterPreview.vue`
- `app/javascript/dashboard/components-next/filter/ConditionRow.spec.js`
- `app/javascript/dashboard/components-next/filter/ConditionRow.story.vue`
- `app/javascript/dashboard/components-next/filter/ConditionRow.vue`
- `app/javascript/dashboard/components-next/filter/ContactsFilter.vue`
- `app/javascript/dashboard/components-next/filter/ConversationFilter.vue`
- `app/javascript/dashboard/components-next/filter/SaveCustomView.vue`
- `app/javascript/dashboard/components-next/filter/contactProvider.js`
- `app/javascript/dashboard/components-next/filter/fixtures/filterTypes.js`
- `app/javascript/dashboard/components-next/filter/helper/filterAttributeIcons.js`
- `app/javascript/dashboard/components-next/filter/helper/filterHelper.js`
- `app/javascript/dashboard/components-next/filter/helper/filterHelper.spec.js`
- `app/javascript/dashboard/components-next/filter/inputs/FilterSelect.story.vue`
- `app/javascript/dashboard/components-next/filter/inputs/FilterSelect.vue`
- `app/javascript/dashboard/components-next/filter/inputs/MultiSelect.story.vue`
- `app/javascript/dashboard/components-next/filter/inputs/MultiSelect.vue`
- `app/javascript/dashboard/components-next/filter/inputs/MultiTextInput.vue`
- `app/javascript/dashboard/components-next/filter/inputs/SingleSelect.story.vue`
- `app/javascript/dashboard/components-next/filter/inputs/SingleSelect.vue`
- `app/javascript/dashboard/components-next/filter/operators.js`
- `app/javascript/dashboard/components-next/filter/provider.js`
- `app/javascript/dashboard/helper/customViewsHelper.js`
- `app/javascript/dashboard/helper/filterQueryGenerator.js`
- `app/javascript/dashboard/helper/specs/customViewsHelper.spec.js`
- `app/javascript/dashboard/helper/specs/filterQueryGenerator.spec.js`
- `app/javascript/dashboard/modules/search/components/SearchFilters.vue`
- `app/javascript/dashboard/routes/dashboard/contacts/contactFilterItems/index.js`
- `app/javascript/dashboard/routes/dashboard/customviews/DeleteCustomViews.vue`
- `app/javascript/dashboard/routes/dashboard/settings/auditlogs/components/AuditLogFilters.vue`
- `app/javascript/dashboard/routes/dashboard/settings/auditlogs/components/specs/AuditLogFilters.spec.js`
- `app/javascript/dashboard/routes/dashboard/settings/reports/components/Filters/v3/ActiveFilterChip.vue`
- `app/javascript/dashboard/routes/dashboard/settings/reports/components/Filters/v3/AddFilterChip.vue`
- `app/javascript/dashboard/routes/dashboard/settings/reports/components/OverviewReportFilters.vue`
- `app/javascript/dashboard/routes/dashboard/settings/reports/components/ReportFilters.vue`
- `app/javascript/dashboard/routes/dashboard/settings/reports/helpers/drilldownConversationFilters.js`
- `app/javascript/dashboard/routes/dashboard/settings/reports/helpers/drilldownConversationFilters.spec.js`
- `app/javascript/dashboard/routes/dashboard/settings/reports/helpers/reportFilterHelper.js`
- `app/javascript/dashboard/routes/dashboard/settings/reports/helpers/reportFilterHelper.spec.js`
- `app/javascript/dashboard/store/modules/conversations/helpers/filterHelpers.js`
- `app/javascript/dashboard/store/modules/conversations/helpers/specs/filterHelpers.spec.js`
- `app/javascript/dashboard/store/modules/customViews.js`
- `app/javascript/dashboard/store/modules/specs/contacts/filterApiResponse.js`
- `app/javascript/dashboard/store/modules/specs/customViews/actions.spec.js`
- `app/javascript/dashboard/store/modules/specs/customViews/fixtures.js`
- `app/javascript/dashboard/store/modules/specs/customViews/getters.spec.js`
- `app/javascript/dashboard/store/modules/specs/customViews/mutations.spec.js`
- `app/javascript/shared/composables/specs/useFilter.spec.js`
- `app/javascript/shared/composables/useFilter.js`
- `app/javascript/shared/mixins/specs/filterFixtures.js`
