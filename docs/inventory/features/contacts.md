# Contacts

**Area:** CRM

Contact records, import and export, merge, notes, avatars, contact inboxes and identity verification.

**Feature flags:** `crm`, `crm_integration`, `crm_v2`

## HTTP routes (39)

| Verb | Path | Controller#action |
| --- | --- | --- |
| POST | `/api/v1/accounts/:account_id/actions/contact_merge(.:format)` | `api/v1/accounts/actions/contact_merges#create` |
| DELETE | `/api/v1/accounts/:account_id/agent_bots/:id/avatar(.:format)` | `api/v1/accounts/agent_bots#avatar` |
| GET | `/api/v1/accounts/:account_id/conversations/:conversation_id/contact_info_request(.:format)` | `api/v1/accounts/conversations/contact_info_requests#show` |
| POST | `/api/v1/accounts/:account_id/conversations/:conversation_id/contact_info_request(.:format)` | `api/v1/accounts/conversations/contact_info_requests#create` |
| GET | `/api/v1/accounts/:account_id/search/contacts(.:format)` | `api/v1/accounts/search#contacts` |
| DELETE | `/api/v1/accounts/:account_id/companies/:id/avatar(.:format)` | `api/v1/accounts/companies#avatar` |
| GET | `/api/v1/accounts/:account_id/companies/:company_id/contacts/search(.:format)` | `api/v1/accounts/companies/contacts#search` |
| GET | `/api/v1/accounts/:account_id/companies/:company_id/contacts(.:format)` | `api/v1/accounts/companies/contacts#index` |
| POST | `/api/v1/accounts/:account_id/companies/:company_id/contacts(.:format)` | `api/v1/accounts/companies/contacts#create` |
| DELETE | `/api/v1/accounts/:account_id/companies/:company_id/contacts/:id(.:format)` | `api/v1/accounts/companies/contacts#destroy` |
| GET | `/api/v1/accounts/:account_id/companies/:company_id/notes(.:format)` | `api/v1/accounts/companies/notes#index` |
| GET | `/api/v1/accounts/:account_id/contacts/active(.:format)` | `api/v1/accounts/contacts#active` |
| GET | `/api/v1/accounts/:account_id/contacts/search(.:format)` | `api/v1/accounts/contacts#search` |
| POST | `/api/v1/accounts/:account_id/contacts/import(.:format)` | `api/v1/accounts/contacts#import` |
| POST | `/api/v1/accounts/:account_id/contacts/export(.:format)` | `api/v1/accounts/contacts#export` |
| GET | `/api/v1/accounts/:account_id/contacts/:id/contactable_inboxes(.:format)` | `api/v1/accounts/contacts#contactable_inboxes` |
| DELETE | `/api/v1/accounts/:account_id/contacts/:id/avatar(.:format)` | `api/v1/accounts/contacts#avatar` |
| GET | `/api/v1/accounts/:account_id/contacts/:contact_id/conversations(.:format)` | `api/v1/accounts/contacts/conversations#index` |
| POST | `/api/v1/accounts/:account_id/contacts/:contact_id/contact_inboxes(.:format)` | `api/v1/accounts/contacts/contact_inboxes#create` |
| GET | `/api/v1/accounts/:account_id/contacts/:contact_id/notes(.:format)` | `api/v1/accounts/contacts/notes#index` |
| POST | `/api/v1/accounts/:account_id/contacts/:contact_id/notes(.:format)` | `api/v1/accounts/contacts/notes#create` |
| GET | `/api/v1/accounts/:account_id/contacts/:contact_id/notes/new(.:format)` | `api/v1/accounts/contacts/notes#new` |
| GET | `/api/v1/accounts/:account_id/contacts/:contact_id/notes/:id/edit(.:format)` | `api/v1/accounts/contacts/notes#edit` |
| GET | `/api/v1/accounts/:account_id/contacts/:contact_id/notes/:id(.:format)` | `api/v1/accounts/contacts/notes#show` |
| PATCH | `/api/v1/accounts/:account_id/contacts/:contact_id/notes/:id(.:format)` | `api/v1/accounts/contacts/notes#update` |
| PUT | `/api/v1/accounts/:account_id/contacts/:contact_id/notes/:id(.:format)` | `api/v1/accounts/contacts/notes#update` |
| DELETE | `/api/v1/accounts/:account_id/contacts/:contact_id/notes/:id(.:format)` | `api/v1/accounts/contacts/notes#destroy` |
| GET | `/api/v1/accounts/:account_id/contacts/:contact_id/attachments(.:format)` | `api/v1/accounts/contacts/attachments#index` |
| GET | `/api/v1/accounts/:account_id/contacts(.:format)` | `api/v1/accounts/contacts#index` |
| POST | `/api/v1/accounts/:account_id/contacts(.:format)` | `api/v1/accounts/contacts#create` |
| GET | `/api/v1/accounts/:account_id/contacts/:id(.:format)` | `api/v1/accounts/contacts#show` |
| PATCH | `/api/v1/accounts/:account_id/contacts/:id(.:format)` | `api/v1/accounts/contacts#update` |
| PUT | `/api/v1/accounts/:account_id/contacts/:id(.:format)` | `api/v1/accounts/contacts#update` |
| DELETE | `/api/v1/accounts/:account_id/contacts/:id(.:format)` | `api/v1/accounts/contacts#destroy` |
| DELETE | `/api/v1/accounts/:account_id/inboxes/:id/avatar(.:format)` | `api/v1/accounts/inboxes#avatar` |
| DELETE | `/api/v1/profile/avatar(.:format)` | `api/v1/profiles#avatar` |
| DELETE | `/platform/api/v1/agent_bots/:id/avatar(.:format)` | `platform/api/v1/agent_bots#avatar` |
| DELETE | `/super_admin/users/:id/avatar(.:format)` | `super_admin/users#destroy_avatar` |
| DELETE | `/super_admin/agent_bots/:id/avatar(.:format)` | `super_admin/agent_bots#destroy_avatar` |

## Database tables (3)

`contact_inboxes`, `contacts`, `notes`

## Backend files (91)

### actions (3)

- `app/actions/contact_identify_action.rb`
- `app/actions/contact_merge_action.rb`
- `enterprise/app/actions/enterprise/contact_merge_action.rb` (EE)

### builders (3)

- `app/builders/contact_inbox_builder.rb`
- `app/builders/contact_inbox_with_contact_builder.rb`
- `enterprise/app/builders/enterprise/contact_inbox_builder.rb` (EE)

### controllers (11)

- `app/controllers/api/v1/accounts/actions/contact_merges_controller.rb`
- `app/controllers/api/v1/accounts/companies/contacts_controller.rb`
- `app/controllers/api/v1/accounts/companies/notes_controller.rb`
- `app/controllers/api/v1/accounts/contact_inboxes_controller.rb`
- `app/controllers/api/v1/accounts/contacts/attachments_controller.rb`
- `app/controllers/api/v1/accounts/contacts/base_controller.rb`
- `app/controllers/api/v1/accounts/contacts/contact_inboxes_controller.rb`
- `app/controllers/api/v1/accounts/contacts/conversations_controller.rb`
- `app/controllers/api/v1/accounts/contacts/notes_controller.rb`
- `app/controllers/api/v1/accounts/contacts_controller.rb`
- `app/controllers/api/v1/accounts/conversations/contact_info_requests_controller.rb`

### drops (1)

- `app/drops/contact_drop.rb`

### fields (1)

- `app/fields/avatar_field.rb`

### helpers (1)

- `app/helpers/contact_helper.rb`

### jobs (12)

- `app/jobs/account/contacts_export_job.rb`
- `app/jobs/avatar/avatar_from_favicon_job.rb`
- `app/jobs/avatar/avatar_from_gravatar_job.rb`
- `app/jobs/avatar/avatar_from_url_job.rb`
- `app/jobs/companies/fetch_avatars_job.rb`
- `app/jobs/companies/sync_contact_names_job.rb`
- `app/jobs/contact_ip_lookup_job.rb`
- `app/jobs/contacts/bulk_action_job.rb`
- `app/jobs/internal/process_stale_contacts_job.rb`
- `app/jobs/internal/remove_stale_contact_inboxes_job.rb`
- `app/jobs/internal/remove_stale_contacts_job.rb`
- `app/jobs/migration/backfill_companies_contacts_count_job.rb`

### lib (1)

- `lib/test_data/contact_batch_service.rb`

### models (8)

- `app/models/concerns/avatarable.rb`
- `app/models/concerns/contact_company_association.rb`
- `app/models/contact.rb`
- `app/models/contact_inbox.rb`
- `app/models/note.rb`
- `enterprise/app/models/enterprise/account_billing_identity.rb` (EE)
- `enterprise/app/models/enterprise/concerns/contact.rb` (EE)
- `enterprise/app/models/enterprise/contact_inbox.rb` (EE)

### policies (2)

- `app/policies/contact_policy.rb`
- `enterprise/app/policies/enterprise/contact_policy.rb` (EE)

### services (12)

- `app/services/companies/contact_membership_service.rb`
- `app/services/contact_inbox_source_id_resolver.rb`
- `app/services/contacts/bulk_action_service.rb`
- `app/services/contacts/bulk_delete_service.rb`
- `app/services/contacts/company_association_service.rb`
- `app/services/contacts/contactable_inboxes_service.rb`
- `app/services/contacts/sync_attributes.rb`
- `app/services/crm/leadsquared/mappers/contact_mapper.rb`
- `app/services/internal/remove_stale_contact_inboxes_service.rb`
- `app/services/internal/remove_stale_contacts_service.rb`
- `app/services/shopify/shop_identity.rb`
- `enterprise/app/services/enterprise/contacts/contactable_inboxes_service.rb` (EE)

### views (36)

- `app/views/api/v1/accounts/actions/contact_merges/create.json.jbuilder`
- `app/views/api/v1/accounts/agent_bots/avatar.json.jbuilder`
- `app/views/api/v1/accounts/companies/avatar.json.jbuilder`
- `app/views/api/v1/accounts/companies/contacts/_contact.json.jbuilder`
- `app/views/api/v1/accounts/companies/contacts/create.json.jbuilder`
- `app/views/api/v1/accounts/companies/contacts/index.json.jbuilder`
- `app/views/api/v1/accounts/companies/contacts/search.json.jbuilder`
- `app/views/api/v1/accounts/companies/notes/index.json.jbuilder`
- `app/views/api/v1/accounts/contacts/active.json.jbuilder`
- `app/views/api/v1/accounts/contacts/attachments/index.json.jbuilder`
- `app/views/api/v1/accounts/contacts/avatar.json.jbuilder`
- `app/views/api/v1/accounts/contacts/contact_inboxes/create.json.jbuilder`
- `app/views/api/v1/accounts/contacts/contactable_inboxes.json.jbuilder`
- `app/views/api/v1/accounts/contacts/conversations/index.json.jbuilder`
- `app/views/api/v1/accounts/contacts/create.json.jbuilder`
- `app/views/api/v1/accounts/contacts/index.json.jbuilder`
- `app/views/api/v1/accounts/contacts/notes/create.json.jbuilder`
- `app/views/api/v1/accounts/contacts/notes/index.json.jbuilder`
- `app/views/api/v1/accounts/contacts/notes/show.json.jbuilder`
- `app/views/api/v1/accounts/contacts/notes/update.json.jbuilder`
- `app/views/api/v1/accounts/contacts/search.json.jbuilder`
- `app/views/api/v1/accounts/contacts/show.json.jbuilder`
- `app/views/api/v1/accounts/contacts/update.json.jbuilder`
- `app/views/api/v1/accounts/search/_contact.json.jbuilder`
- `app/views/api/v1/accounts/search/contacts.json.jbuilder`
- `app/views/api/v1/models/_contact.json.jbuilder`
- `app/views/api/v1/models/_contact_inbox.json.jbuilder`
- `app/views/api/v1/models/_note.json.jbuilder`
- `app/views/api/v1/profiles/avatar.json.jbuilder`
- `app/views/fields/avatar_field/_index.html.erb`
- `app/views/fields/avatar_field/_show.html.erb`
- `app/views/mailers/administrator_notifications/account_notification_mailer/contact_export_complete.liquid`
- `app/views/mailers/administrator_notifications/account_notification_mailer/contact_import_complete.liquid`
- `app/views/mailers/administrator_notifications/account_notification_mailer/contact_import_failed.liquid`
- `app/views/platform/api/v1/agent_bots/avatar.json.jbuilder`
- `app/views/public/api/v1/models/_contact.json.jbuilder`

## Ruby specs (42)

- `spec/actions/contact_identify_action_spec.rb`
- `spec/actions/contact_merge_action_spec.rb`
- `spec/builders/contact_inbox_builder_spec.rb`
- `spec/builders/contact_inbox_with_contact_builder_spec.rb`
- `spec/controllers/api/v1/accounts/actions/contact_merges_controller_spec.rb`
- `spec/controllers/api/v1/accounts/companies/contacts_controller_spec.rb`
- `spec/controllers/api/v1/accounts/contact_inboxes_controller_spec.rb`
- `spec/controllers/api/v1/accounts/contacts/attachments_controller_spec.rb`
- `spec/controllers/api/v1/accounts/contacts/contact_inboxes_controller_spec.rb`
- `spec/controllers/api/v1/accounts/contacts/conversations_controller_spec.rb`
- `spec/controllers/api/v1/accounts/contacts/notes_controller_spec.rb`
- `spec/controllers/api/v1/accounts/contacts_company_spec.rb`
- `spec/controllers/api/v1/accounts/contacts_controller_spec.rb`
- `spec/controllers/public/api/v1/inbox/contacts_controller_spec.rb`
- `spec/drops/contact_drop_spec.rb`
- `spec/enterprise/actions/contact_merge_action_spec.rb`
- `spec/enterprise/controllers/enterprise/api/v1/accounts/contacts/conversations_controller_spec.rb`
- `spec/enterprise/jobs/avatar/avatar_from_favicon_job_spec.rb`
- `spec/enterprise/policies/contact_policy_spec.rb`
- `spec/helpers/contact_helper_spec.rb`
- `spec/jobs/account/contacts_export_job_spec.rb`
- `spec/jobs/avatar/avatar_from_gravatar_job_spec.rb`
- `spec/jobs/avatar/avatar_from_url_job_spec.rb`
- `spec/jobs/companies/fetch_avatars_job_spec.rb`
- `spec/jobs/companies/sync_contact_names_job_spec.rb`
- `spec/jobs/contacts/bulk_action_job_spec.rb`
- `spec/jobs/internal/process_stale_contacts_job_spec.rb`
- `spec/jobs/internal/remove_stale_contacts_job_spec.rb`
- `spec/models/contact_company_association_spec.rb`
- `spec/models/contact_inbox_spec.rb`
- `spec/models/contact_spec.rb`
- `spec/models/note_spec.rb`
- `spec/policies/contact_policy_spec.rb`
- `spec/services/contacts/bulk_action_service_spec.rb`
- `spec/services/contacts/bulk_delete_service_spec.rb`
- `spec/services/contacts/company_association_service_spec.rb`
- `spec/services/contacts/contactable_inboxes_service_spec.rb`
- `spec/services/contacts/sync_attributes_spec.rb`
- `spec/services/crm/leadsquared/mappers/contact_mapper_spec.rb`
- `spec/services/internal/remove_stale_contact_inboxes_service_spec.rb`
- `spec/services/internal/remove_stale_contacts_service_spec.rb`
- `spec/services/shopify/shop_identity_spec.rb`

## Frontend files (100)

- `app/javascript/dashboard/api/contactNotes.js`
- `app/javascript/dashboard/api/contacts.js`
- `app/javascript/dashboard/api/dataImports.js`
- `app/javascript/dashboard/api/specs/contacts.spec.js`
- `app/javascript/dashboard/components-next/Companies/CompanyDetail/CompanyAddContact.vue`
- `app/javascript/dashboard/components-next/Contacts/ContactsCard/ContactDeleteSection.vue`
- `app/javascript/dashboard/components-next/Contacts/ContactsCard/ContactsCard.vue`
- `app/javascript/dashboard/components-next/Contacts/ContactsCard/story/ContactsCard.story.vue`
- `app/javascript/dashboard/components-next/Contacts/ContactsCard/story/fixtures.js`
- `app/javascript/dashboard/components-next/Contacts/ContactsDetailsLayout.vue`
- `app/javascript/dashboard/components-next/Contacts/ContactsForm/ConfirmContactDeleteDialog.vue`
- `app/javascript/dashboard/components-next/Contacts/ContactsForm/ContactExportDialog.vue`
- `app/javascript/dashboard/components-next/Contacts/ContactsForm/ContactImportDialog.vue`
- `app/javascript/dashboard/components-next/Contacts/ContactsForm/ContactMergeForm.vue`
- `app/javascript/dashboard/components-next/Contacts/ContactsForm/ContactsForm.vue`
- `app/javascript/dashboard/components-next/Contacts/ContactsForm/CreateNewContactDialog.vue`
- `app/javascript/dashboard/components-next/Contacts/ContactsForm/CreateSegmentDialog.vue`
- `app/javascript/dashboard/components-next/Contacts/ContactsForm/DeleteSegmentDialog.vue`
- `app/javascript/dashboard/components-next/Contacts/ContactsForm/story/ContactMergeForm.story.vue`
- `app/javascript/dashboard/components-next/Contacts/ContactsForm/story/ContactsForm.story.vue`
- `app/javascript/dashboard/components-next/Contacts/ContactsForm/story/fixtures.js`
- `app/javascript/dashboard/components-next/Contacts/ContactsHeader/ContactHeader.vue`
- `app/javascript/dashboard/components-next/Contacts/ContactsHeader/ContactListHeaderWrapper.vue`
- `app/javascript/dashboard/components-next/Contacts/ContactsHeader/components/ContactMoreActions.vue`
- `app/javascript/dashboard/components-next/Contacts/ContactsHeader/components/ContactSortMenu.vue`
- `app/javascript/dashboard/components-next/Contacts/ContactsHeader/story/ContactHeader.story.vue`
- `app/javascript/dashboard/components-next/Contacts/ContactsListLayout.vue`
- `app/javascript/dashboard/components-next/Contacts/ContactsLoadMore.vue`
- `app/javascript/dashboard/components-next/Contacts/ContactsSidebar/ContactHistory.vue`
- `app/javascript/dashboard/components-next/Contacts/ContactsSidebar/ContactMedia.vue`
- `app/javascript/dashboard/components-next/Contacts/ContactsSidebar/ContactMerge.vue`
- `app/javascript/dashboard/components-next/Contacts/ContactsSidebar/ContactNotes.vue`
- `app/javascript/dashboard/components-next/Contacts/ContactsSidebar/components/ContactNoteItem.vue`
- `app/javascript/dashboard/components-next/Contacts/ContactsSidebar/components/story/ContactNoteItem.story.vue`
- `app/javascript/dashboard/components-next/Contacts/ContactsSidebar/components/story/fixtures.js`
- `app/javascript/dashboard/components-next/Contacts/EmptyState/ContactEmptyState.story.vue`
- `app/javascript/dashboard/components-next/Contacts/EmptyState/ContactEmptyState.vue`
- `app/javascript/dashboard/components-next/Contacts/EmptyState/contactEmptyStateContent.js`
- `app/javascript/dashboard/components-next/Contacts/Pages/ContactDetails.vue`
- `app/javascript/dashboard/components-next/Contacts/Pages/ContactsList.vue`
- `app/javascript/dashboard/components-next/Conversation/ConversationCard/CardAvatar.vue`
- `app/javascript/dashboard/components-next/NewConversation/components/ContactSelector.vue`
- `app/javascript/dashboard/components-next/avatar/Avatar.story.vue`
- `app/javascript/dashboard/components-next/avatar/Avatar.vue`
- `app/javascript/dashboard/components-next/avatar/specs/Avatar.spec.js`
- `app/javascript/dashboard/components-next/message/bubbles/Contact.vue`
- `app/javascript/dashboard/composables/spec/useContactConversationNavigation.spec.js`
- `app/javascript/dashboard/composables/useContactConversationNavigation.js`
- `app/javascript/dashboard/modules/contact/ContactDeleteModal.vue`
- `app/javascript/dashboard/modules/contact/ContactMergeModal.vue`
- `app/javascript/dashboard/modules/contact/components/MergeContact.vue`
- `app/javascript/dashboard/modules/contact/components/MergeContactSummary.vue`
- `app/javascript/dashboard/modules/search/components/SearchContactAgentSelector.vue`
- `app/javascript/dashboard/modules/search/components/SearchResultContactItem.vue`
- `app/javascript/dashboard/modules/search/components/SearchResultContactsList.vue`
- `app/javascript/dashboard/routes/dashboard/contacts/components/ContactsBulkActionBar.vue`
- `app/javascript/dashboard/routes/dashboard/contacts/pages/ContactManageView.vue`
- `app/javascript/dashboard/routes/dashboard/contacts/pages/ContactsIndex.vue`
- `app/javascript/dashboard/routes/dashboard/contacts/routes.js`
- `app/javascript/dashboard/routes/dashboard/conversation/ContactConversations.vue`
- `app/javascript/dashboard/routes/dashboard/conversation/ContactDetailsItem.vue`
- `app/javascript/dashboard/routes/dashboard/conversation/ContactPanel.vue`
- `app/javascript/dashboard/routes/dashboard/conversation/contact/ContactForm.vue`
- `app/javascript/dashboard/routes/dashboard/conversation/contact/ContactInfo.vue`
- `app/javascript/dashboard/routes/dashboard/conversation/contact/ContactInfoRow.vue`
- `app/javascript/dashboard/routes/dashboard/conversation/contact/ContactNotes.vue`
- `app/javascript/dashboard/routes/dashboard/conversation/contact/EditContact.vue`
- `app/javascript/dashboard/routes/dashboard/conversation/contact/ViewAllConversations.vue`
- `app/javascript/dashboard/routes/dashboard/conversation/contact/specs/ViewAllConversations.spec.js`
- `app/javascript/dashboard/routes/dashboard/settings/data/NewImportDialog.vue`
- `app/javascript/dashboard/routes/dashboard/settings/data/components/ImportDetailHeader.vue`
- `app/javascript/dashboard/routes/dashboard/settings/data/components/ImportErrorsSection.vue`
- `app/javascript/dashboard/routes/dashboard/settings/data/components/ImportLogSection.vue`
- `app/javascript/dashboard/routes/dashboard/settings/data/components/ImportProgress.vue`
- `app/javascript/dashboard/routes/dashboard/settings/data/components/ImportSkipLogsSection.vue`
- `app/javascript/dashboard/routes/dashboard/settings/data/components/ImportSummaryTiles.vue`
- `app/javascript/dashboard/routes/dashboard/settings/data/importSources.js`
- `app/javascript/dashboard/routes/dashboard/settings/data/importStatus.js`
- `app/javascript/dashboard/routes/dashboard/settings/data/specs/ImportDetailHeader.spec.js`
- `app/javascript/dashboard/routes/dashboard/settings/data/specs/NewImportDialog.spec.js`
- `app/javascript/dashboard/routes/dashboard/settings/data/specs/importSources.spec.js`
- `app/javascript/dashboard/routes/dashboard/settings/data/specs/importStatus.spec.js`
- `app/javascript/dashboard/store/modules/contactConversations.js`
- `app/javascript/dashboard/store/modules/contactNotes.js`
- `app/javascript/dashboard/store/modules/contacts/actions.js`
- `app/javascript/dashboard/store/modules/contacts/getters.js`
- `app/javascript/dashboard/store/modules/contacts/index.js`
- `app/javascript/dashboard/store/modules/contacts/mutations.js`
- `app/javascript/dashboard/store/modules/specs/contactConversations/actions.spec.js`
- `app/javascript/dashboard/store/modules/specs/contactConversations/fixtures.js`
- `app/javascript/dashboard/store/modules/specs/contactConversations/getters.spec.js`
- `app/javascript/dashboard/store/modules/specs/contactConversations/mutations.spec.js`
- `app/javascript/dashboard/store/modules/specs/contactNotes/actions.spec.js`
- `app/javascript/dashboard/store/modules/specs/contactNotes/fixtures.js`
- `app/javascript/dashboard/store/modules/specs/contactNotes/getters.spec.js`
- `app/javascript/dashboard/store/modules/specs/contactNotes/mutations.spec.js`
- `app/javascript/dashboard/store/modules/specs/contacts/actions.spec.js`
- `app/javascript/dashboard/store/modules/specs/contacts/fixtures.js`
- `app/javascript/dashboard/store/modules/specs/contacts/getters.spec.js`
- `app/javascript/dashboard/store/modules/specs/contacts/mutations.spec.js`
