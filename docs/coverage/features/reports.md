# Reports and analytics: coverage gaps

## Frontend: 47.8% (593 of 1241 lines)

| File | Coverage | Uncovered lines |
| --- | ---: | ---: |
| `app/javascript/dashboard/routes/dashboard/settings/reports/components/heatmaps/BaseHeatmapContainer.vue` | 1.8% | 112 |
| `app/javascript/dashboard/routes/dashboard/settings/reports/components/heatmaps/HeatmapDateRangeSelector.vue` | 2.5% | 77 |
| `app/javascript/dashboard/store/modules/reports.js` | 26.3% | 73 |
| `app/javascript/dashboard/routes/dashboard/settings/reports/components/SummaryReports.vue` | 1.9% | 53 |
| `app/javascript/dashboard/routes/dashboard/settings/reports/components/StatsLiveReportsContainer.vue` | 15.8% | 48 |
| `app/javascript/dashboard/routes/dashboard/settings/reports/components/WootReports.vue` | 2.6% | 37 |
| `app/javascript/dashboard/routes/dashboard/settings/reports/Index.vue` | 11.5% | 23 |
| `app/javascript/dashboard/routes/dashboard/settings/reports/components/heatmaps/BaseHeatmap.vue` | 11.5% | 23 |
| `app/javascript/dashboard/routes/dashboard/settings/reports/components/overview/AgentTable.vue` | 8.0% | 23 |
| `app/javascript/dashboard/routes/dashboard/settings/reports/components/overview/TeamTable.vue` | 8.3% | 22 |
| `app/javascript/dashboard/routes/dashboard/settings/reports/BotReports.vue` | 9.1% | 20 |
| `app/javascript/dashboard/routes/dashboard/settings/reports/SLAReports.vue` | 9.1% | 20 |
| `app/javascript/dashboard/routes/dashboard/settings/reports/components/BotMetrics.vue` | 5.3% | 18 |
| `app/javascript/dashboard/routes/dashboard/settings/reports/ReportContainer.vue` | 84.3% | 14 |
| `app/javascript/dashboard/routes/dashboard/settings/reports/components/AgentLiveReportContainer.vue` | 8.3% | 11 |
| `app/javascript/dashboard/routes/dashboard/settings/reports/components/TeamLiveReportContainer.vue` | 8.3% | 11 |
| `app/javascript/dashboard/routes/dashboard/settings/reports/components/ChartElements/ChartStats.vue` | 36.4% | 7 |
| `app/javascript/dashboard/routes/dashboard/settings/reports/components/ReportDrilldownDrawer.vue` | 90.6% | 6 |
| `app/javascript/dashboard/routes/dashboard/settings/reports/composables/useReportDrilldown.js` | 91.4% | 6 |
| `app/javascript/dashboard/routes/dashboard/settings/reports/AgentReportsIndex.vue` | 0.0% | 5 |
| `app/javascript/dashboard/routes/dashboard/settings/reports/AgentReportsShow.vue` | 0.0% | 5 |
| `app/javascript/dashboard/routes/dashboard/settings/reports/InboxReportsIndex.vue` | 0.0% | 5 |
| `app/javascript/dashboard/routes/dashboard/settings/reports/TeamReportsIndex.vue` | 0.0% | 5 |
| `app/javascript/dashboard/routes/dashboard/settings/reports/InboxReportsShow.vue` | 0.0% | 3 |
| `app/javascript/dashboard/routes/dashboard/settings/reports/TeamReportsShow.vue` | 0.0% | 3 |
| `app/javascript/dashboard/routes/dashboard/settings/reports/components/overview/AgentCell.vue` | 50.0% | 3 |
| `app/javascript/dashboard/routes/dashboard/settings/reports/components/ReportDrilldownCard.vue` | 97.4% | 2 |
| `app/javascript/dashboard/routes/dashboard/settings/reports/components/heatmaps/ConversationHeatmapContainer.vue` | 0.0% | 2 |
| `app/javascript/dashboard/routes/dashboard/settings/reports/components/heatmaps/ResolutionHeatmapContainer.vue` | 0.0% | 2 |
| `app/javascript/dashboard/routes/dashboard/settings/reports/components/overview/MetricCard.vue` | 80.0% | 2 |
| `app/javascript/dashboard/store/modules/SLAReports.js` | 92.3% | 2 |
| `app/javascript/dashboard/composables/useReportMetrics.js` | 92.3% | 1 |
| `app/javascript/dashboard/routes/dashboard/settings/reports/AgentReports.vue` | 0.0% | 1 |
| `app/javascript/dashboard/routes/dashboard/settings/reports/InboxReports.vue` | 0.0% | 1 |
| `app/javascript/dashboard/routes/dashboard/settings/reports/LiveReports.vue` | 50.0% | 1 |
| `app/javascript/dashboard/routes/dashboard/settings/reports/TeamReports.vue` | 0.0% | 1 |

## Backend: 56.1% (1241 of 2211 lines)

| File | Coverage | Uncovered lines |
| --- | ---: | ---: |
| `lib/seeders/reports/report_data_seeder.rb` | 0.0% | 264 |
| `lib/tasks/reporting_events_rollup.rake` | 15.8% | 149 |
| `lib/seeders/reports/message_creator.rb` | 0.0% | 112 |
| `lib/tasks/reporting_events_rollup_timezone_setup.rake` | 19.5% | 99 |
| `lib/seeders/reports/conversation_creator.rb` | 0.0% | 89 |
| `app/services/reporting_events/metric_registry.rb` | 0.0% | 85 |
| `lib/tasks/download_report.rake` | 20.3% | 63 |
| `app/jobs/migration/update_first_response_time_in_reporting_events_job.rb` | 0.0% | 37 |
| `app/controllers/api/v2/accounts/year_in_reviews_controller.rb` | 0.0% | 21 |
| `app/helpers/report_helper.rb` | 81.8% | 12 |
| `lib/tasks/seed_reports_data.rake` | 26.7% | 11 |
| `app/helpers/api/v2/accounts/reports_helper.rb` | 75.8% | 8 |
| `app/builders/v2/report_builder.rb` | 90.9% | 5 |
| `app/builders/v2/reports/drilldown_builder.rb` | 95.9% | 4 |
| `app/builders/v2/reports/drilldown_record_serializer.rb` | 97.5% | 2 |
| `app/controllers/api/v2/accounts/reports_controller.rb` | 97.8% | 2 |
| `app/services/reports/data_source.rb` | 94.3% | 2 |
| `app/builders/v2/reports/timeseries/base_timeseries_builder.rb` | 96.6% | 1 |
| `app/controllers/api/v2/accounts/summary_reports_controller.rb` | 96.7% | 1 |
| `app/services/reporting_events/event_metric_registry.rb` | 95.7% | 1 |
| `app/services/reports/drilldown_timestamp_validator.rb` | 96.4% | 1 |
| `app/services/reports/report_metric_registry.rb` | 95.8% | 1 |
