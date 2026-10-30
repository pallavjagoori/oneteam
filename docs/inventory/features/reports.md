# Reports and analytics

**Area:** Analytics

Conversation, agent, inbox, label and team reports, live reports, summary reports, report rollups, reporting events and year in review.

**Feature flags:** `report_rollup`, `reports`

## HTTP routes (22)

| Verb | Path | Controller#action |
| --- | --- | --- |
| GET | `/api/v1/accounts/:account_id/conversations/:id/reporting_events(.:format)` | `api/v1/accounts/conversations#reporting_events` |
| GET | `/api/v1/accounts/:account_id/reporting_events(.:format)` | `api/v1/accounts/reporting_events#index` |
| GET | `/api/v2/accounts/:account_id/summary_reports/agent(.:format)` | `api/v2/accounts/summary_reports#agent` |
| GET | `/api/v2/accounts/:account_id/summary_reports/team(.:format)` | `api/v2/accounts/summary_reports#team` |
| GET | `/api/v2/accounts/:account_id/summary_reports/inbox(.:format)` | `api/v2/accounts/summary_reports#inbox` |
| GET | `/api/v2/accounts/:account_id/summary_reports/channel(.:format)` | `api/v2/accounts/summary_reports#channel` |
| GET | `/api/v2/accounts/:account_id/reports/summary(.:format)` | `api/v2/accounts/reports#summary` |
| GET | `/api/v2/accounts/:account_id/reports/bot_summary(.:format)` | `api/v2/accounts/reports#bot_summary` |
| GET | `/api/v2/accounts/:account_id/reports/agents(.:format)` | `api/v2/accounts/reports#agents` |
| GET | `/api/v2/accounts/:account_id/reports/inboxes(.:format)` | `api/v2/accounts/reports#inboxes` |
| GET | `/api/v2/accounts/:account_id/reports/teams(.:format)` | `api/v2/accounts/reports#teams` |
| GET | `/api/v2/accounts/:account_id/reports/conversations(.:format)` | `api/v2/accounts/reports#conversations` |
| GET | `/api/v2/accounts/:account_id/reports/conversations_summary(.:format)` | `api/v2/accounts/reports#conversations_summary` |
| GET | `/api/v2/accounts/:account_id/reports/conversation_traffic(.:format)` | `api/v2/accounts/reports#conversation_traffic` |
| GET | `/api/v2/accounts/:account_id/reports/drilldown(.:format)` | `api/v2/accounts/reports#drilldown` |
| GET | `/api/v2/accounts/:account_id/reports/bot_metrics(.:format)` | `api/v2/accounts/reports#bot_metrics` |
| GET | `/api/v2/accounts/:account_id/reports/first_response_time_distribution(.:format)` | `api/v2/accounts/reports#first_response_time_distribution` |
| GET | `/api/v2/accounts/:account_id/reports/outgoing_messages_count(.:format)` | `api/v2/accounts/reports#outgoing_messages_count` |
| GET | `/api/v2/accounts/:account_id/reports(.:format)` | `api/v2/accounts/reports#index` |
| GET | `/api/v2/accounts/:account_id/year_in_review(.:format)` | `api/v2/accounts/year_in_reviews#show` |
| GET | `/api/v2/accounts/:account_id/live_reports/conversation_metrics(.:format)` | `api/v2/accounts/live_reports#conversation_metrics` |
| GET | `/api/v2/accounts/:account_id/live_reports/grouped_conversation_metrics(.:format)` | `api/v2/accounts/live_reports#grouped_conversation_metrics` |

## Database tables (2)

`reporting_events`, `reporting_events_rollups`

## Backend files (57)

### builders (17)

- `app/builders/v2/report_builder.rb`
- `app/builders/v2/reports/agent_summary_builder.rb`
- `app/builders/v2/reports/base_summary_builder.rb`
- `app/builders/v2/reports/bot_metrics_builder.rb`
- `app/builders/v2/reports/channel_summary_builder.rb`
- `app/builders/v2/reports/conversations/base_report_builder.rb`
- `app/builders/v2/reports/conversations/metric_builder.rb`
- `app/builders/v2/reports/conversations/report_builder.rb`
- `app/builders/v2/reports/drilldown_builder.rb`
- `app/builders/v2/reports/drilldown_record_serializer.rb`
- `app/builders/v2/reports/first_response_time_distribution_builder.rb`
- `app/builders/v2/reports/inbox_summary_builder.rb`
- `app/builders/v2/reports/outgoing_messages_count_builder.rb`
- `app/builders/v2/reports/team_summary_builder.rb`
- `app/builders/v2/reports/timeseries/base_timeseries_builder.rb`
- `app/builders/v2/reports/timeseries/report_builder.rb`
- `app/builders/year_in_review_builder.rb`

### controllers (5)

- `app/controllers/api/v2/accounts/live_reports_controller.rb`
- `app/controllers/api/v2/accounts/reports_controller.rb`
- `app/controllers/api/v2/accounts/summary_reports_controller.rb`
- `app/controllers/api/v2/accounts/year_in_reviews_controller.rb`
- `enterprise/app/controllers/api/v1/accounts/reporting_events_controller.rb` (EE)

### helpers (4)

- `app/helpers/api/v2/accounts/heatmap_helper.rb`
- `app/helpers/api/v2/accounts/reports_helper.rb`
- `app/helpers/report_helper.rb`
- `app/helpers/reporting_event_helper.rb`

### jobs (1)

- `app/jobs/migration/update_first_response_time_in_reporting_events_job.rb`

### lib (7)

- `lib/seeders/reports/conversation_creator.rb`
- `lib/seeders/reports/message_creator.rb`
- `lib/seeders/reports/report_data_seeder.rb`
- `lib/tasks/download_report.rake`
- `lib/tasks/reporting_events_rollup.rake`
- `lib/tasks/reporting_events_rollup_timezone_setup.rake`
- `lib/tasks/seed_reports_data.rake`

### listeners (1)

- `app/listeners/reporting_event_listener.rb`

### models (3)

- `app/models/concerns/reportable.rb`
- `app/models/reporting_event.rb`
- `app/models/reporting_events_rollup.rb`

### policies (2)

- `app/policies/report_policy.rb`
- `enterprise/app/policies/enterprise/report_policy.rb` (EE)

### presenters (1)

- `app/presenters/reports/time_format_presenter.rb`

### services (8)

- `app/services/reporting_events/backfill_service.rb`
- `app/services/reporting_events/event_metric_registry.rb`
- `app/services/reporting_events/metric_registry.rb`
- `app/services/reporting_events/rollup_service.rb`
- `app/services/reports/data_source.rb`
- `app/services/reports/drilldown_timestamp_validator.rb`
- `app/services/reports/raw_data_source.rb`
- `app/services/reports/report_metric_registry.rb`

### views (8)

- `app/views/api/v2/accounts/reports/agents.csv.erb`
- `app/views/api/v2/accounts/reports/conversation_traffic.erb`
- `app/views/api/v2/accounts/reports/conversations_summary.csv.erb`
- `app/views/api/v2/accounts/reports/inboxes.csv.erb`
- `app/views/api/v2/accounts/reports/teams.csv.erb`
- `enterprise/app/views/api/v1/accounts/conversations/reporting_events.json.jbuilder` (EE)
- `enterprise/app/views/api/v1/accounts/reporting_events/index.json.jbuilder` (EE)
- `enterprise/app/views/api/v1/models/_reporting_event.json.jbuilder` (EE)

## Ruby specs (29)

- `spec/builders/v2/report_builder_spec.rb`
- `spec/builders/v2/reports/agent_summary_builder_spec.rb`
- `spec/builders/v2/reports/bot_metrics_builder_spec.rb`
- `spec/builders/v2/reports/channel_summary_builder_spec.rb`
- `spec/builders/v2/reports/conversations/metric_builder_spec.rb`
- `spec/builders/v2/reports/conversations/report_builder_spec.rb`
- `spec/builders/v2/reports/drilldown_builder_spec.rb`
- `spec/builders/v2/reports/first_response_time_distribution_builder_spec.rb`
- `spec/builders/v2/reports/inbox_summary_builder_spec.rb`
- `spec/builders/v2/reports/team_summary_builder_spec.rb`
- `spec/builders/v2/reports/timeseries/report_builder_spec.rb`
- `spec/builders/year_in_review_builder_spec.rb`
- `spec/controllers/api/v2/accounts/live_reports_controller_spec.rb`
- `spec/controllers/api/v2/accounts/report_controller_spec.rb`
- `spec/controllers/api/v2/accounts/reports_controller_spec.rb`
- `spec/controllers/api/v2/accounts/summary_reports_controller_spec.rb`
- `spec/enterprise/controllers/api/v1/accounts/reporting_events_controller_spec.rb`
- `spec/enterprise/controllers/enterprise/api/v2/accounts/reports_controller_spec.rb`
- `spec/enterprise/policies/report_policy_spec.rb`
- `spec/helpers/reporting_event_helper_spec.rb`
- `spec/listeners/reporting_event_listener_spec.rb`
- `spec/models/reporting_event_spec.rb`
- `spec/models/reporting_events_rollup_spec.rb`
- `spec/policies/report_policy_spec.rb`
- `spec/presenters/reports/time_format_presenter_spec.rb`
- `spec/services/reporting_events/backfill_service_spec.rb`
- `spec/services/reporting_events/event_metric_registry_spec.rb`
- `spec/services/reporting_events/rollup_service_spec.rb`
- `spec/services/reports/report_metric_registry_spec.rb`

## Frontend files (74)

- `app/javascript/dashboard/api/liveReports.js`
- `app/javascript/dashboard/api/reports.js`
- `app/javascript/dashboard/api/slaReports.js`
- `app/javascript/dashboard/api/specs/reports.spec.js`
- `app/javascript/dashboard/api/specs/slaReports.spec.js`
- `app/javascript/dashboard/api/summaryReports.js`
- `app/javascript/dashboard/composables/spec/fixtures/reportFixtures.js`
- `app/javascript/dashboard/composables/spec/useReportMetrics.spec.js`
- `app/javascript/dashboard/composables/useReportMetrics.js`
- `app/javascript/dashboard/helper/AnalyticsHelper/events.js`
- `app/javascript/dashboard/helper/AnalyticsHelper/index.js`
- `app/javascript/dashboard/helper/AnalyticsHelper/specs/events.spec.js`
- `app/javascript/dashboard/helper/AnalyticsHelper/specs/helper.spec.js`
- `app/javascript/dashboard/routes/dashboard/settings/reports/AgentReports.vue`
- `app/javascript/dashboard/routes/dashboard/settings/reports/AgentReportsIndex.vue`
- `app/javascript/dashboard/routes/dashboard/settings/reports/AgentReportsShow.vue`
- `app/javascript/dashboard/routes/dashboard/settings/reports/BotReports.vue`
- `app/javascript/dashboard/routes/dashboard/settings/reports/InboxReports.vue`
- `app/javascript/dashboard/routes/dashboard/settings/reports/InboxReportsIndex.vue`
- `app/javascript/dashboard/routes/dashboard/settings/reports/InboxReportsShow.vue`
- `app/javascript/dashboard/routes/dashboard/settings/reports/Index.vue`
- `app/javascript/dashboard/routes/dashboard/settings/reports/LiveReports.vue`
- `app/javascript/dashboard/routes/dashboard/settings/reports/ReportContainer.vue`
- `app/javascript/dashboard/routes/dashboard/settings/reports/SLAReports.vue`
- `app/javascript/dashboard/routes/dashboard/settings/reports/TeamReports.vue`
- `app/javascript/dashboard/routes/dashboard/settings/reports/TeamReportsIndex.vue`
- `app/javascript/dashboard/routes/dashboard/settings/reports/TeamReportsShow.vue`
- `app/javascript/dashboard/routes/dashboard/settings/reports/components/AgentLiveReportContainer.vue`
- `app/javascript/dashboard/routes/dashboard/settings/reports/components/BotMetrics.vue`
- `app/javascript/dashboard/routes/dashboard/settings/reports/components/ChartElements/ChartStats.vue`
- `app/javascript/dashboard/routes/dashboard/settings/reports/components/ReportDrilldownCard.vue`
- `app/javascript/dashboard/routes/dashboard/settings/reports/components/ReportDrilldownDrawer.vue`
- `app/javascript/dashboard/routes/dashboard/settings/reports/components/ReportHeader.vue`
- `app/javascript/dashboard/routes/dashboard/settings/reports/components/ReportMetricCard.vue`
- `app/javascript/dashboard/routes/dashboard/settings/reports/components/ReportsWrapper.vue`
- `app/javascript/dashboard/routes/dashboard/settings/reports/components/StatsLiveReportsContainer.vue`
- `app/javascript/dashboard/routes/dashboard/settings/reports/components/SummaryReportLink.vue`
- `app/javascript/dashboard/routes/dashboard/settings/reports/components/SummaryReports.vue`
- `app/javascript/dashboard/routes/dashboard/settings/reports/components/TeamLiveReportContainer.vue`
- `app/javascript/dashboard/routes/dashboard/settings/reports/components/WootReports.vue`
- `app/javascript/dashboard/routes/dashboard/settings/reports/components/heatmaps/BaseHeatmap.vue`
- `app/javascript/dashboard/routes/dashboard/settings/reports/components/heatmaps/BaseHeatmapContainer.vue`
- `app/javascript/dashboard/routes/dashboard/settings/reports/components/heatmaps/ConversationHeatmapContainer.vue`
- `app/javascript/dashboard/routes/dashboard/settings/reports/components/heatmaps/HeatmapDateRangeSelector.vue`
- `app/javascript/dashboard/routes/dashboard/settings/reports/components/heatmaps/ResolutionHeatmapContainer.vue`
- `app/javascript/dashboard/routes/dashboard/settings/reports/components/overview/AgentCell.vue`
- `app/javascript/dashboard/routes/dashboard/settings/reports/components/overview/AgentTable.vue`
- `app/javascript/dashboard/routes/dashboard/settings/reports/components/overview/MetricCard.vue`
- `app/javascript/dashboard/routes/dashboard/settings/reports/components/overview/TeamTable.vue`
- `app/javascript/dashboard/routes/dashboard/settings/reports/components/specs/ReportDrilldownCard.spec.js`
- `app/javascript/dashboard/routes/dashboard/settings/reports/components/specs/ReportDrilldownDrawer.spec.js`
- `app/javascript/dashboard/routes/dashboard/settings/reports/components/specs/ReportMetricCard.spec.js`
- `app/javascript/dashboard/routes/dashboard/settings/reports/components/specs/SummaryReportLink.spec.js`
- `app/javascript/dashboard/routes/dashboard/settings/reports/composables/specs/useReportDrilldown.spec.js`
- `app/javascript/dashboard/routes/dashboard/settings/reports/composables/useReportDrilldown.js`
- `app/javascript/dashboard/routes/dashboard/settings/reports/constants.js`
- `app/javascript/dashboard/routes/dashboard/settings/reports/reports.routes.js`
- `app/javascript/dashboard/routes/dashboard/settings/reports/specs/ReportContainer.spec.js`
- `app/javascript/dashboard/store/modules/SLAReports.js`
- `app/javascript/dashboard/store/modules/conversationStats.js`
- `app/javascript/dashboard/store/modules/reports.js`
- `app/javascript/dashboard/store/modules/specs/conversationStats/actions.spec.js`
- `app/javascript/dashboard/store/modules/specs/conversationStats/getters.spec.js`
- `app/javascript/dashboard/store/modules/specs/conversationStats/mutations.spec.js`
- `app/javascript/dashboard/store/modules/specs/conversationStats/races.spec.js`
- `app/javascript/dashboard/store/modules/specs/reports/actions.spec.js`
- `app/javascript/dashboard/store/modules/specs/slaReports/actions.spec.js`
- `app/javascript/dashboard/store/modules/specs/slaReports/fixtures.js`
- `app/javascript/dashboard/store/modules/specs/slaReports/getters.spec.js`
- `app/javascript/dashboard/store/modules/specs/slaReports/mutations.spec.js`
- `app/javascript/dashboard/store/modules/specs/summaryReports.spec.js`
- `app/javascript/dashboard/store/modules/summaryReports.js`
- `app/javascript/shared/helpers/ReportsDataHelper.js`
- `app/javascript/shared/helpers/specs/ReportsDataHelper.spec.js`
