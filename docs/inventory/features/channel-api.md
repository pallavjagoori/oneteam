# API channel

**Area:** Channels

API inboxes that let other systems push and pull conversations, plus the public client API used by them.

## HTTP routes (22)

| Verb | Path | Controller#action |
| --- | --- | --- |
| POST | `/public/api/v1/inboxes/:inbox_id/contacts/:contact_id/conversations/:id/toggle_status(.:format)` | `public/api/v1/inboxes/conversations#toggle_status` |
| POST | `/public/api/v1/inboxes/:inbox_id/contacts/:contact_id/conversations/:id/toggle_typing(.:format)` | `public/api/v1/inboxes/conversations#toggle_typing` |
| POST | `/public/api/v1/inboxes/:inbox_id/contacts/:contact_id/conversations/:id/update_last_seen(.:format)` | `public/api/v1/inboxes/conversations#update_last_seen` |
| GET | `/public/api/v1/inboxes/:inbox_id/contacts/:contact_id/conversations/:conversation_id/messages(.:format)` | `public/api/v1/inboxes/messages#index` |
| POST | `/public/api/v1/inboxes/:inbox_id/contacts/:contact_id/conversations/:conversation_id/messages(.:format)` | `public/api/v1/inboxes/messages#create` |
| PATCH | `/public/api/v1/inboxes/:inbox_id/contacts/:contact_id/conversations/:conversation_id/messages/:id(.:format)` | `public/api/v1/inboxes/messages#update` |
| PUT | `/public/api/v1/inboxes/:inbox_id/contacts/:contact_id/conversations/:conversation_id/messages/:id(.:format)` | `public/api/v1/inboxes/messages#update` |
| GET | `/public/api/v1/inboxes/:inbox_id/contacts/:contact_id/conversations(.:format)` | `public/api/v1/inboxes/conversations#index` |
| POST | `/public/api/v1/inboxes/:inbox_id/contacts/:contact_id/conversations(.:format)` | `public/api/v1/inboxes/conversations#create` |
| GET | `/public/api/v1/inboxes/:inbox_id/contacts/:contact_id/conversations/:id(.:format)` | `public/api/v1/inboxes/conversations#show` |
| POST | `/public/api/v1/inboxes/:inbox_id/contacts(.:format)` | `public/api/v1/inboxes/contacts#create` |
| GET | `/public/api/v1/inboxes/:inbox_id/contacts/:id(.:format)` | `public/api/v1/inboxes/contacts#show` |
| PATCH | `/public/api/v1/inboxes/:inbox_id/contacts/:id(.:format)` | `public/api/v1/inboxes/contacts#update` |
| PUT | `/public/api/v1/inboxes/:inbox_id/contacts/:id(.:format)` | `public/api/v1/inboxes/contacts#update` |
| GET | `/public/api/v1/inboxes(.:format)` | `public/api/v1/inboxes#index` |
| POST | `/public/api/v1/inboxes(.:format)` | `public/api/v1/inboxes#create` |
| GET | `/public/api/v1/inboxes/new(.:format)` | `public/api/v1/inboxes#new` |
| GET | `/public/api/v1/inboxes/:id/edit(.:format)` | `public/api/v1/inboxes#edit` |
| GET | `/public/api/v1/inboxes/:id(.:format)` | `public/api/v1/inboxes#show` |
| PATCH | `/public/api/v1/inboxes/:id(.:format)` | `public/api/v1/inboxes#update` |
| PUT | `/public/api/v1/inboxes/:id(.:format)` | `public/api/v1/inboxes#update` |
| DELETE | `/public/api/v1/inboxes/:id(.:format)` | `public/api/v1/inboxes#destroy` |

## Database tables (1)

`channel_api`

## Backend files (16)

### controllers (4)

- `app/controllers/public/api/v1/inboxes/contacts_controller.rb`
- `app/controllers/public/api/v1/inboxes/conversations_controller.rb`
- `app/controllers/public/api/v1/inboxes/messages_controller.rb`
- `app/controllers/public/api/v1/inboxes_controller.rb`

### models (1)

- `app/models/channel/api.rb`

### views (11)

- `app/views/public/api/v1/inboxes/contacts/create.json.jbuilder`
- `app/views/public/api/v1/inboxes/contacts/show.json.jbuilder`
- `app/views/public/api/v1/inboxes/contacts/update.json.jbuilder`
- `app/views/public/api/v1/inboxes/conversations/create.json.jbuilder`
- `app/views/public/api/v1/inboxes/conversations/index.json.jbuilder`
- `app/views/public/api/v1/inboxes/conversations/show.json.jbuilder`
- `app/views/public/api/v1/inboxes/conversations/toggle_status.json.jbuilder`
- `app/views/public/api/v1/inboxes/messages/create.json.jbuilder`
- `app/views/public/api/v1/inboxes/messages/index.json.jbuilder`
- `app/views/public/api/v1/inboxes/messages/update.json.jbuilder`
- `app/views/public/api/v1/inboxes/show.json.jbuilder`

## Ruby specs (1)

- `spec/models/channel/api_spec.rb`

## Frontend files (0)

