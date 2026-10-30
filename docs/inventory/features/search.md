# Search

**Area:** Conversations

Search across conversations, messages, contacts and articles.

**Feature flags:** `search_with_gin`, `advanced_search`, `advanced_search_indexing`

## HTTP routes (4)

| Verb | Path | Controller#action |
| --- | --- | --- |
| GET | `/api/v1/accounts/:account_id/conversations/search(.:format)` | `api/v1/accounts/conversations#search` |
| GET | `/api/v1/accounts/:account_id/search/conversations(.:format)` | `api/v1/accounts/search#conversations` |
| GET | `/api/v1/accounts/:account_id/search/messages(.:format)` | `api/v1/accounts/search#messages` |
| GET | `/api/v1/accounts/:account_id/search(.:format)` | `api/v1/accounts/search#index` |

## Database tables (0)

None.

## Backend files (14)

### controllers (1)

- `app/controllers/api/v1/accounts/search_controller.rb`

### jobs (1)

- `app/jobs/migration/add_search_indexes_job.rb`

### lib (1)

- `enterprise/lib/tasks/search.rake` (EE)

### presenters (2)

- `app/presenters/messages/search_data_presenter.rb`
- `enterprise/app/presenters/enterprise/messages/search_data_presenter.rb` (EE)

### services (2)

- `app/services/search_service.rb`
- `enterprise/app/services/enterprise/search_service.rb` (EE)

### views (7)

- `app/views/api/v1/accounts/conversations/search.json.jbuilder`
- `app/views/api/v1/accounts/search/_conversation_search_result.json.jbuilder`
- `app/views/api/v1/accounts/search/_inbox.json.jbuilder`
- `app/views/api/v1/accounts/search/_message.json.jbuilder`
- `app/views/api/v1/accounts/search/conversations.json.jbuilder`
- `app/views/api/v1/accounts/search/index.json.jbuilder`
- `app/views/api/v1/accounts/search/messages.json.jbuilder`

## Ruby specs (6)

- `spec/config/searchkick_spec.rb`
- `spec/controllers/api/v1/accounts/search_controller_spec.rb`
- `spec/enterprise/presenters/messages/search_data_presenter_spec.rb`
- `spec/presenters/messages/search_data_presenter_spec.rb`
- `spec/requests/search_indexing_spec.rb`
- `spec/services/search_service_spec.rb`

## Frontend files (25)

- `app/javascript/dashboard/api/search.js`
- `app/javascript/dashboard/api/specs/search.spec.js`
- `app/javascript/dashboard/components/ui/Dropdown/DropdownSearch.vue`
- `app/javascript/dashboard/modules/search/components/MessageContent.vue`
- `app/javascript/dashboard/modules/search/components/RecentSearches.vue`
- `app/javascript/dashboard/modules/search/components/SearchDateRangeSelector.vue`
- `app/javascript/dashboard/modules/search/components/SearchHeader.vue`
- `app/javascript/dashboard/modules/search/components/SearchInboxSelector.vue`
- `app/javascript/dashboard/modules/search/components/SearchInput.vue`
- `app/javascript/dashboard/modules/search/components/SearchResultConversationItem.vue`
- `app/javascript/dashboard/modules/search/components/SearchResultConversationsList.vue`
- `app/javascript/dashboard/modules/search/components/SearchResultMessageItem.vue`
- `app/javascript/dashboard/modules/search/components/SearchResultMessagesList.vue`
- `app/javascript/dashboard/modules/search/components/SearchResultSection.vue`
- `app/javascript/dashboard/modules/search/components/SearchTabs.vue`
- `app/javascript/dashboard/modules/search/components/SearchView.vue`
- `app/javascript/dashboard/modules/search/components/TranscribedText.vue`
- `app/javascript/dashboard/modules/search/helpers/searchHelper.js`
- `app/javascript/dashboard/modules/search/helpers/specs/searchHelper.spec.js`
- `app/javascript/dashboard/modules/search/search.routes.js`
- `app/javascript/dashboard/routes/dashboard/conversation/search/SwitchLayout.vue`
- `app/javascript/dashboard/store/modules/conversationSearch.js`
- `app/javascript/dashboard/store/modules/specs/conversationSearch/actions.spec.js`
- `app/javascript/dashboard/store/modules/specs/conversationSearch/getters.spec.js`
- `app/javascript/dashboard/store/modules/specs/conversationSearch/mutations.spec.js`
