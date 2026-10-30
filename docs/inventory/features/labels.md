# Labels

**Area:** Operations

Labels for conversations and contacts, label management and label filters.

**Feature flags:** `labels`

## HTTP routes (14)

| Verb | Path | Controller#action |
| --- | --- | --- |
| GET | `/api/v1/accounts/:account_id/conversations/:conversation_id/labels(.:format)` | `api/v1/accounts/conversations/labels#index` |
| POST | `/api/v1/accounts/:account_id/conversations/:conversation_id/labels(.:format)` | `api/v1/accounts/conversations/labels#create` |
| GET | `/api/v1/accounts/:account_id/conversations/:conversation_id/suggestions/labels(.:format)` | `api/v1/accounts/conversations/suggestions#labels` |
| GET | `/api/v1/accounts/:account_id/contacts/:contact_id/labels(.:format)` | `api/v1/accounts/contacts/labels#index` |
| POST | `/api/v1/accounts/:account_id/contacts/:contact_id/labels(.:format)` | `api/v1/accounts/contacts/labels#create` |
| GET | `/api/v1/accounts/:account_id/labels(.:format)` | `api/v1/accounts/labels#index` |
| POST | `/api/v1/accounts/:account_id/labels(.:format)` | `api/v1/accounts/labels#create` |
| GET | `/api/v1/accounts/:account_id/labels/:id(.:format)` | `api/v1/accounts/labels#show` |
| PATCH | `/api/v1/accounts/:account_id/labels/:id(.:format)` | `api/v1/accounts/labels#update` |
| PUT | `/api/v1/accounts/:account_id/labels/:id(.:format)` | `api/v1/accounts/labels#update` |
| DELETE | `/api/v1/accounts/:account_id/labels/:id(.:format)` | `api/v1/accounts/labels#destroy` |
| GET | `/api/v2/accounts/:account_id/summary_reports/label(.:format)` | `api/v2/accounts/summary_reports#label` |
| GET | `/api/v2/accounts/:account_id/reports/labels(.:format)` | `api/v2/accounts/reports#labels` |
| GET | `/api/v2/accounts/:account_id/reports/inbox_label_matrix(.:format)` | `api/v2/accounts/reports#inbox_label_matrix` |

## Database tables (3)

`labels`, `taggings`, `tags`

## Backend files (28)

### builders (2)

- `app/builders/v2/reports/inbox_label_matrix_builder.rb`
- `app/builders/v2/reports/label_summary_builder.rb`

### controllers (4)

- `app/controllers/api/v1/accounts/contacts/labels_controller.rb`
- `app/controllers/api/v1/accounts/conversations/labels_controller.rb`
- `app/controllers/api/v1/accounts/labels_controller.rb`
- `app/controllers/concerns/label_concern.rb`

### jobs (4)

- `app/jobs/labels/remove_associations_job.rb`
- `app/jobs/labels/update_job.rb`
- `app/jobs/migration/conversation_batch_cache_label_job.rb`
- `app/jobs/migration/conversation_cache_label_job.rb`

### models (4)

- `app/models/concerns/label_activity_message_handler.rb`
- `app/models/concerns/labelable.rb`
- `app/models/concerns/labelable/persistence.rb`
- `app/models/label.rb`

### policies (1)

- `app/policies/label_policy.rb`

### services (4)

- `app/services/contacts/bulk_assign_labels_service.rb`
- `app/services/contacts/bulk_remove_labels_service.rb`
- `app/services/labels/destroy_service.rb`
- `app/services/labels/update_service.rb`

### views (9)

- `app/views/api/v1/accounts/contacts/labels/create.json.jbuilder`
- `app/views/api/v1/accounts/contacts/labels/index.json.jbuilder`
- `app/views/api/v1/accounts/conversations/labels/create.json.jbuilder`
- `app/views/api/v1/accounts/conversations/labels/index.json.jbuilder`
- `app/views/api/v1/accounts/labels/create.json.jbuilder`
- `app/views/api/v1/accounts/labels/index.json.jbuilder`
- `app/views/api/v1/accounts/labels/show.json.jbuilder`
- `app/views/api/v1/accounts/labels/update.json.jbuilder`
- `app/views/api/v2/accounts/reports/labels.csv.erb`

## Ruby specs (13)

- `spec/builders/v2/reports/inbox_label_matrix_builder_spec.rb`
- `spec/builders/v2/reports/label_summary_builder_spec.rb`
- `spec/controllers/api/v1/accounts/contacts/labels_controller_spec.rb`
- `spec/controllers/api/v1/accounts/conversations/labels_controller_spec.rb`
- `spec/controllers/api/v1/accounts/labels_controller_spec.rb`
- `spec/jobs/labels/remove_associations_job_spec.rb`
- `spec/jobs/labels/update_job_spec.rb`
- `spec/models/concerns/labelable/persistence_spec.rb`
- `spec/models/label_spec.rb`
- `spec/services/contacts/bulk_assign_labels_service_spec.rb`
- `spec/services/contacts/bulk_remove_labels_service_spec.rb`
- `spec/services/labels/destroy_service_spec.rb`
- `spec/services/labels/update_service_spec.rb`

## Frontend files (44)

- `app/javascript/dashboard/api/labels.js`
- `app/javascript/dashboard/api/specs/labels.spec.js`
- `app/javascript/dashboard/components-next/Contacts/ContactLabels/ContactLabels.vue`
- `app/javascript/dashboard/components-next/Conversation/ConversationCard/CardLabels.vue`
- `app/javascript/dashboard/components-next/Conversation/ConversationCard/CardLabelsV5.vue`
- `app/javascript/dashboard/components-next/Conversation/ConversationCard/SLACardLabel.vue`
- `app/javascript/dashboard/components-next/label/AddLabel.vue`
- `app/javascript/dashboard/components-next/label/Label.vue`
- `app/javascript/dashboard/components-next/label/LabelItem.vue`
- `app/javascript/dashboard/components-next/label/story/AddLabel.story.vue`
- `app/javascript/dashboard/components-next/label/story/Label.story.vue`
- `app/javascript/dashboard/components-next/label/story/fixtures.js`
- `app/javascript/dashboard/components/ui/DatePicker/components/CalendarWeekLabel.vue`
- `app/javascript/dashboard/components/ui/Label.vue`
- `app/javascript/dashboard/composables/spec/useConversationLabels.spec.js`
- `app/javascript/dashboard/composables/useConversationLabels.js`
- `app/javascript/dashboard/helper/labelColor.js`
- `app/javascript/dashboard/routes/dashboard/conversation/labels/LabelBox.vue`
- `app/javascript/dashboard/routes/dashboard/settings/labels/AddLabel.vue`
- `app/javascript/dashboard/routes/dashboard/settings/labels/EditLabel.vue`
- `app/javascript/dashboard/routes/dashboard/settings/labels/Index.vue`
- `app/javascript/dashboard/routes/dashboard/settings/labels/labels.routes.js`
- `app/javascript/dashboard/routes/dashboard/settings/labels/specs/validations.spec.js`
- `app/javascript/dashboard/routes/dashboard/settings/labels/validations.js`
- `app/javascript/dashboard/routes/dashboard/settings/reports/LabelReports.vue`
- `app/javascript/dashboard/routes/dashboard/settings/reports/LabelReportsIndex.vue`
- `app/javascript/dashboard/routes/dashboard/settings/reports/LabelReportsShow.vue`
- `app/javascript/dashboard/store/modules/contactLabels.js`
- `app/javascript/dashboard/store/modules/conversationLabels.js`
- `app/javascript/dashboard/store/modules/labels.js`
- `app/javascript/dashboard/store/modules/specs/contactLabels/actions.spec.js`
- `app/javascript/dashboard/store/modules/specs/contactLabels/getters.spec.js`
- `app/javascript/dashboard/store/modules/specs/contactLabels/mutations.spec.js`
- `app/javascript/dashboard/store/modules/specs/conversationLabels/actions.spec.js`
- `app/javascript/dashboard/store/modules/specs/conversationLabels/getters.spec.js`
- `app/javascript/dashboard/store/modules/specs/conversationLabels/mutations.spec.js`
- `app/javascript/dashboard/store/modules/specs/labels/actions.spec.js`
- `app/javascript/dashboard/store/modules/specs/labels/fixtures.js`
- `app/javascript/dashboard/store/modules/specs/labels/getters.spec.js`
- `app/javascript/dashboard/store/modules/specs/labels/mutations.spec.js`
- `app/javascript/shared/components/ui/dropdown/AddLabel.vue`
- `app/javascript/shared/components/ui/label/LabelDropdown.vue`
- `app/javascript/shared/components/ui/label/LabelDropdownItem.vue`
- `app/javascript/v3/components/Form/WithLabel.vue`
