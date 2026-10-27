# CSAT surveys

**Area:** Customer feedback

Customer satisfaction surveys after resolution, the public survey page, CSAT templates and CSAT reports.

**Feature flags:** `csat_review_notes`

## HTTP routes (11)

| Verb | Path | Controller#action |
| --- | --- | --- |
| GET | `/survey/responses/:id(.:format)` | `survey/responses#show` |
| GET | `/api/v1/accounts/:account_id/csat_survey_responses/metrics(.:format)` | `api/v1/accounts/csat_survey_responses#metrics` |
| GET | `/api/v1/accounts/:account_id/csat_survey_responses/download(.:format)` | `api/v1/accounts/csat_survey_responses#download` |
| PATCH | `/api/v1/accounts/:account_id/csat_survey_responses/:id(.:format)` | `api/v1/accounts/csat_survey_responses#update` |
| GET | `/api/v1/accounts/:account_id/csat_survey_responses(.:format)` | `api/v1/accounts/csat_survey_responses#index` |
| POST | `/api/v1/accounts/:account_id/inboxes/:inbox_id/csat_template/analyze(.:format)` | `api/v1/accounts/inbox_csat_templates#analyze` |
| GET | `/api/v1/accounts/:account_id/inboxes/:inbox_id/csat_template(.:format)` | `api/v1/accounts/inbox_csat_templates#show` |
| POST | `/api/v1/accounts/:account_id/inboxes/:inbox_id/csat_template(.:format)` | `api/v1/accounts/inbox_csat_templates#create` |
| GET | `/public/api/v1/csat_survey/:id(.:format)` | `public/api/v1/csat_survey#show` |
| PATCH | `/public/api/v1/csat_survey/:id(.:format)` | `public/api/v1/csat_survey#update` |
| PUT | `/public/api/v1/csat_survey/:id(.:format)` | `public/api/v1/csat_survey#update` |

## Database tables (1)

`csat_survey_responses`

## Backend files (25)

### builders (1)

- `app/builders/csat_surveys/response_builder.rb`

### controllers (5)

- `app/controllers/api/v1/accounts/csat_survey_responses_controller.rb`
- `app/controllers/api/v1/accounts/inbox_csat_templates_controller.rb`
- `app/controllers/public/api/v1/csat_survey_controller.rb`
- `app/controllers/survey/responses_controller.rb`
- `enterprise/app/controllers/enterprise/api/v1/accounts/csat_survey_responses_controller.rb` (EE)

### listeners (1)

- `app/listeners/csat_survey_listener.rb`

### models (1)

- `app/models/csat_survey_response.rb`

### policies (2)

- `app/policies/csat_survey_response_policy.rb`
- `enterprise/app/policies/enterprise/csat_survey_response_policy.rb` (EE)

### services (6)

- `app/services/csat_survey_service.rb`
- `app/services/csat_template_management_service.rb`
- `app/services/csat_template_name_service.rb`
- `app/services/csat_template_utility_analysis_service.rb`
- `app/services/csat_template_utility_rubric.rb`
- `app/services/message_templates/template/csat_survey.rb`

### views (9)

- `app/views/api/v1/accounts/csat_survey_responses/download.csv.erb`
- `app/views/api/v1/accounts/csat_survey_responses/index.json.jbuilder`
- `app/views/api/v1/accounts/csat_survey_responses/metrics.json.jbuilder`
- `app/views/api/v1/accounts/csat_survey_responses/update.json.jbuilder`
- `app/views/api/v1/models/_csat_survey_response.json.jbuilder`
- `app/views/public/api/v1/csat_survey/show.json.jbuilder`
- `app/views/public/api/v1/csat_survey/update.json.jbuilder`
- `app/views/public/api/v1/models/_csat_survey.json.jbuilder`
- `app/views/survey/responses/show.html.erb`

## Ruby specs (14)

- `spec/builders/csat_surveys/response_builder_spec.rb`
- `spec/controllers/api/v1/accounts/csat_survey_responses_controller_spec.rb`
- `spec/controllers/api/v1/accounts/inbox_csat_templates_controller_spec.rb`
- `spec/controllers/public/api/v1/csat_survey_controller_spec.rb`
- `spec/controllers/service/responses_controller_spec.rb`
- `spec/controllers/survey/responses_controller_spec.rb`
- `spec/enterprise/controllers/enterprise/api/v1/accounts/csat_survey_responses_controller_spec.rb`
- `spec/enterprise/policies/csat_survey_response_policy_spec.rb`
- `spec/listeners/csat_survey_listener_spec.rb`
- `spec/models/csat_survey_response_spec.rb`
- `spec/policies/csat_survey_response_policy_spec.rb`
- `spec/services/csat_survey_service_spec.rb`
- `spec/services/csat_template_utility_analysis_service_spec.rb`
- `spec/services/message_templates/template/csat_survey_spec.rb`

## Frontend files (38)

- `app/javascript/dashboard/api/csatReports.js`
- `app/javascript/dashboard/api/specs/csatReports.spec.js`
- `app/javascript/dashboard/components-next/message/bubbles/CSAT.vue`
- `app/javascript/dashboard/components-next/template-preview/CSATTemplate.vue`
- `app/javascript/dashboard/routes/dashboard/settings/inbox/settingsPage/components/CSATDisplayTypeSelector.vue`
- `app/javascript/dashboard/routes/dashboard/settings/inbox/settingsPage/components/CSATEmojiInput.vue`
- `app/javascript/dashboard/routes/dashboard/settings/inbox/settingsPage/components/CSATStarInput.vue`
- `app/javascript/dashboard/routes/dashboard/settings/reports/CsatResponses.vue`
- `app/javascript/dashboard/routes/dashboard/settings/reports/components/Csat/CsatFilterHelpers.js`
- `app/javascript/dashboard/routes/dashboard/settings/reports/components/Csat/CsatFilters.vue`
- `app/javascript/dashboard/routes/dashboard/settings/reports/components/CsatContactCell.vue`
- `app/javascript/dashboard/routes/dashboard/settings/reports/components/CsatEmptyState.vue`
- `app/javascript/dashboard/routes/dashboard/settings/reports/components/CsatExpandedRow.vue`
- `app/javascript/dashboard/routes/dashboard/settings/reports/components/CsatMetricCard.story.vue`
- `app/javascript/dashboard/routes/dashboard/settings/reports/components/CsatMetricCard.vue`
- `app/javascript/dashboard/routes/dashboard/settings/reports/components/CsatMetrics.vue`
- `app/javascript/dashboard/routes/dashboard/settings/reports/components/CsatRatingDistribution.story.vue`
- `app/javascript/dashboard/routes/dashboard/settings/reports/components/CsatRatingDistribution.vue`
- `app/javascript/dashboard/routes/dashboard/settings/reports/components/CsatReviewNotesPaywall.vue`
- `app/javascript/dashboard/routes/dashboard/settings/reports/components/CsatTable.vue`
- `app/javascript/dashboard/routes/dashboard/settings/reports/components/CsatTableLoader.vue`
- `app/javascript/dashboard/routes/dashboard/settings/reports/components/specs/CSATMetrics.spec.js`
- `app/javascript/dashboard/store/modules/csat.js`
- `app/javascript/dashboard/store/modules/specs/csat/actions.spec.js`
- `app/javascript/dashboard/store/modules/specs/csat/getters.spec.js`
- `app/javascript/dashboard/store/modules/specs/csat/mutations.spec.js`
- `app/javascript/entrypoints/survey.js`
- `app/javascript/survey/App.vue`
- `app/javascript/survey/api/endPoints.js`
- `app/javascript/survey/api/specs/endPoints.spec.js`
- `app/javascript/survey/api/survey.js`
- `app/javascript/survey/assets/scss/woot.scss`
- `app/javascript/survey/components/Banner.vue`
- `app/javascript/survey/components/Feedback.vue`
- `app/javascript/survey/components/Rating.vue`
- `app/javascript/survey/helpers/axios.js`
- `app/javascript/survey/store/index.js`
- `app/javascript/survey/views/Response.vue`
