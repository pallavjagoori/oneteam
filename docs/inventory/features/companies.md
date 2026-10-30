# Companies

**Area:** CRM

Company records linked to contacts, with enrichment.

**Feature flags:** `companies`, `company_enrichment`

## HTTP routes (9)

| Verb | Path | Controller#action |
| --- | --- | --- |
| GET | `/api/v1/accounts/:account_id/companies/search(.:format)` | `api/v1/accounts/companies#search` |
| GET | `/api/v1/accounts/:account_id/companies/:company_id/conversations(.:format)` | `api/v1/accounts/companies/conversations#index` |
| POST | `/api/v1/accounts/:account_id/companies/:company_id/enrichment(.:format)` | `api/v1/accounts/companies/enrichments#create` |
| GET | `/api/v1/accounts/:account_id/companies(.:format)` | `api/v1/accounts/companies#index` |
| POST | `/api/v1/accounts/:account_id/companies(.:format)` | `api/v1/accounts/companies#create` |
| GET | `/api/v1/accounts/:account_id/companies/:id(.:format)` | `api/v1/accounts/companies#show` |
| PATCH | `/api/v1/accounts/:account_id/companies/:id(.:format)` | `api/v1/accounts/companies#update` |
| PUT | `/api/v1/accounts/:account_id/companies/:id(.:format)` | `api/v1/accounts/companies#update` |
| DELETE | `/api/v1/accounts/:account_id/companies/:id(.:format)` | `api/v1/accounts/companies#destroy` |

## Database tables (1)

`companies`

## Backend files (24)

### controllers (4)

- `app/controllers/api/v1/accounts/companies/base_controller.rb`
- `app/controllers/api/v1/accounts/companies/conversations_controller.rb`
- `app/controllers/api/v1/accounts/companies_controller.rb`
- `enterprise/app/controllers/api/v1/accounts/companies/enrichments_controller.rb` (EE)

### jobs (5)

- `app/jobs/account/branding_enrichment_job.rb`
- `app/jobs/companies/delete_job.rb`
- `app/jobs/migration/company_account_batch_job.rb`
- `app/jobs/migration/company_backfill_job.rb`
- `enterprise/app/jobs/companies/enrich_job.rb` (EE)

### lib (1)

- `lib/tasks/companies.rake`

### models (2)

- `app/models/company.rb`
- `enterprise/app/models/enterprise/concerns/company.rb` (EE)

### policies (2)

- `app/policies/company_policy.rb`
- `enterprise/app/policies/enterprise/company_policy.rb` (EE)

### services (3)

- `app/services/companies/business_email_detector_service.rb`
- `enterprise/app/services/companies/enrichment_service.rb` (EE)
- `enterprise/app/services/enterprise/clearbit_lookup_service.rb` (EE)

### views (7)

- `app/views/api/v1/accounts/companies/conversations/index.json.jbuilder`
- `app/views/api/v1/accounts/companies/create.json.jbuilder`
- `app/views/api/v1/accounts/companies/index.json.jbuilder`
- `app/views/api/v1/accounts/companies/search.json.jbuilder`
- `app/views/api/v1/accounts/companies/show.json.jbuilder`
- `app/views/api/v1/accounts/companies/update.json.jbuilder`
- `app/views/api/v1/models/_company.json.jbuilder`

## Ruby specs (9)

- `spec/controllers/api/v1/accounts/companies_controller_spec.rb`
- `spec/enterprise/services/companies/enrichment_service_spec.rb`
- `spec/enterprise/services/enterprise/clearbit_lookup_service_spec.rb`
- `spec/jobs/companies/delete_job_spec.rb`
- `spec/jobs/migration/company_account_batch_job_spec.rb`
- `spec/jobs/migration/company_backfill_job_spec.rb`
- `spec/models/company_spec.rb`
- `spec/policies/company_policy_spec.rb`
- `spec/services/companies/business_email_detector_service_spec.rb`

## Frontend files (27)

- `app/javascript/dashboard/api/companies.js`
- `app/javascript/dashboard/api/specs/companies.spec.js`
- `app/javascript/dashboard/components-next/Companies/CompaniesCard/CompaniesCard.vue`
- `app/javascript/dashboard/components-next/Companies/CompaniesHeader/CompanyHeader.vue`
- `app/javascript/dashboard/components-next/Companies/CompaniesHeader/components/CompanyMoreActions.vue`
- `app/javascript/dashboard/components-next/Companies/CompaniesHeader/components/CompanySortMenu.vue`
- `app/javascript/dashboard/components-next/Companies/CompaniesListLayout.vue`
- `app/javascript/dashboard/components-next/Companies/CompanyCreateDialog.vue`
- `app/javascript/dashboard/components-next/Companies/CompanyDetail/CompanyConversationList.vue`
- `app/javascript/dashboard/components-next/Companies/CompanyDetail/CompanyDetailHeader.vue`
- `app/javascript/dashboard/components-next/Companies/CompanyDetail/CompanyEditPanel.vue`
- `app/javascript/dashboard/components-next/Companies/CompanyDetail/CompanyFacts.vue`
- `app/javascript/dashboard/components-next/Companies/CompanyDetail/CompanyNotesFeed.vue`
- `app/javascript/dashboard/components-next/Companies/CompanyDetail/CompanyPeopleList.vue`
- `app/javascript/dashboard/components-next/Companies/CompanyDetail/ConfirmCompanyDeleteDialog.vue`
- `app/javascript/dashboard/components-next/Companies/CompanySearchInput.vue`
- `app/javascript/dashboard/components-next/Companies/CompanySelector.vue`
- `app/javascript/dashboard/components-next/Companies/helpers/companyHelper.js`
- `app/javascript/dashboard/components-next/Companies/helpers/specs/companyHelper.spec.js`
- `app/javascript/dashboard/composables/useCompaniesPaywall.js`
- `app/javascript/dashboard/routes/dashboard/companies/pages/CompaniesIndex.vue`
- `app/javascript/dashboard/routes/dashboard/companies/pages/CompanyDetailView.vue`
- `app/javascript/dashboard/routes/dashboard/companies/routes.js`
- `app/javascript/dashboard/routes/dashboard/onboarding/account-details/useAccountEnrichment.js`
- `app/javascript/dashboard/routes/dashboard/onboarding/specs/account-details/useAccountEnrichment.spec.js`
- `app/javascript/dashboard/stores/companies.js`
- `app/javascript/dashboard/stores/specs/companies.spec.js`
