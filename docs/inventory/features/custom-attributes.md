# Custom attributes

**Area:** Operations

Custom attribute definitions for conversations and contacts.

**Feature flags:** `custom_attributes`

## HTTP routes (10)

| Verb | Path | Controller#action |
| --- | --- | --- |
| POST | `/api/v1/accounts/:account_id/conversations/:id/custom_attributes(.:format)` | `api/v1/accounts/conversations#custom_attributes` |
| POST | `/api/v1/accounts/:account_id/conversations/:id/destroy_custom_attributes(.:format)` | `api/v1/accounts/conversations#destroy_custom_attributes` |
| POST | `/api/v1/accounts/:account_id/companies/:id/destroy_custom_attributes(.:format)` | `api/v1/accounts/companies#destroy_custom_attributes` |
| POST | `/api/v1/accounts/:account_id/contacts/:id/destroy_custom_attributes(.:format)` | `api/v1/accounts/contacts#destroy_custom_attributes` |
| GET | `/api/v1/accounts/:account_id/custom_attribute_definitions(.:format)` | `api/v1/accounts/custom_attribute_definitions#index` |
| POST | `/api/v1/accounts/:account_id/custom_attribute_definitions(.:format)` | `api/v1/accounts/custom_attribute_definitions#create` |
| GET | `/api/v1/accounts/:account_id/custom_attribute_definitions/:id(.:format)` | `api/v1/accounts/custom_attribute_definitions#show` |
| PATCH | `/api/v1/accounts/:account_id/custom_attribute_definitions/:id(.:format)` | `api/v1/accounts/custom_attribute_definitions#update` |
| PUT | `/api/v1/accounts/:account_id/custom_attribute_definitions/:id(.:format)` | `api/v1/accounts/custom_attribute_definitions#update` |
| DELETE | `/api/v1/accounts/:account_id/custom_attribute_definitions/:id(.:format)` | `api/v1/accounts/custom_attribute_definitions#destroy` |

## Database tables (1)

`custom_attribute_definitions`

## Backend files (15)

### controllers (2)

- `app/controllers/api/v1/accounts/custom_attribute_definitions_controller.rb`
- `app/controllers/concerns/conversation_custom_attributes_concern.rb`

### models (2)

- `app/models/custom_attribute_definition.rb`
- `enterprise/app/models/enterprise/concerns/custom_attribute_definition.rb` (EE)

### policies (1)

- `app/policies/custom_attribute_definition_policy.rb`

### services (1)

- `app/services/filters/custom_attribute_filter_helper.rb`

### views (9)

- `app/views/api/v1/accounts/companies/destroy_custom_attributes.json.jbuilder`
- `app/views/api/v1/accounts/contacts/destroy_custom_attributes.json.jbuilder`
- `app/views/api/v1/accounts/conversations/custom_attributes.json.jbuilder`
- `app/views/api/v1/accounts/conversations/destroy_custom_attributes.json.jbuilder`
- `app/views/api/v1/accounts/custom_attribute_definitions/create.json.jbuilder`
- `app/views/api/v1/accounts/custom_attribute_definitions/index.json.jbuilder`
- `app/views/api/v1/accounts/custom_attribute_definitions/show.json.jbuilder`
- `app/views/api/v1/accounts/custom_attribute_definitions/update.json.jbuilder`
- `app/views/api/v1/models/_custom_attribute_definition.json.jbuilder`

## Ruby specs (3)

- `spec/controllers/api/v1/accounts/custom_attribute_definitions_controller_spec.rb`
- `spec/enterprise/models/custom_attribute_definition_spec.rb`
- `spec/models/custom_attribute_definition_spec.rb`

## Frontend files (18)

- `app/javascript/dashboard/components-next/Companies/CompanyDetail/CompanyCustomAttributeItem.vue`
- `app/javascript/dashboard/components-next/Companies/CompanyDetail/CompanyCustomAttributes.vue`
- `app/javascript/dashboard/components-next/Contacts/ContactsSidebar/ContactCustomAttributeItem.vue`
- `app/javascript/dashboard/components-next/Contacts/ContactsSidebar/ContactCustomAttributes.vue`
- `app/javascript/dashboard/components-next/CustomAttributes/AttributeBadge.vue`
- `app/javascript/dashboard/components-next/CustomAttributes/CheckboxAttribute.vue`
- `app/javascript/dashboard/components-next/CustomAttributes/DateAttribute.vue`
- `app/javascript/dashboard/components-next/CustomAttributes/ListAttribute.vue`
- `app/javascript/dashboard/components-next/CustomAttributes/OtherAttribute.vue`
- `app/javascript/dashboard/components-next/CustomAttributes/story/CustomAttributes.story.vue`
- `app/javascript/dashboard/components-next/CustomAttributes/story/fixtures.js`
- `app/javascript/dashboard/components/CustomAttribute.vue`
- `app/javascript/dashboard/routes/dashboard/conversation/customAttributes/CustomAttributes.vue`
- `app/javascript/dashboard/routes/dashboard/settings/attributes/AddAttribute.vue`
- `app/javascript/dashboard/routes/dashboard/settings/attributes/EditAttribute.vue`
- `app/javascript/dashboard/routes/dashboard/settings/attributes/Index.vue`
- `app/javascript/dashboard/routes/dashboard/settings/attributes/attributes.routes.js`
- `app/javascript/dashboard/routes/dashboard/settings/attributes/constants.js`
