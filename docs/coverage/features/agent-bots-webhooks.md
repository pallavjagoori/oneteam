# Agent bots and webhooks: coverage gaps

## Frontend: 94.7% (820 of 866 lines)

| File | Coverage | Uncovered lines |
| --- | ---: | ---: |
| `app/javascript/dashboard/store/modules/agentBots.js` | 83.9% | 34 |
| `app/javascript/dashboard/store/modules/webhooks.js` | 94.3% | 5 |
| `app/javascript/dashboard/api/agentBots.js` | 85.2% | 4 |
| `app/javascript/dashboard/api/webhooks.js` | 85.7% | 1 |
| `app/javascript/dashboard/routes/dashboard/settings/agentBots/Index.vue` | 99.4% | 1 |
| `app/javascript/dashboard/routes/dashboard/settings/agentBots/components/AgentBotModal.vue` | 99.7% | 1 |

## Backend: 91.7% (451 of 492 lines)

| File | Coverage | Uncovered lines |
| --- | ---: | ---: |
| `app/controllers/api/v1/webhooks_controller.rb` | 0.0% | 23 |
| `app/listeners/webhook_listener.rb` | 87.7% | 10 |
| `app/jobs/webhooks/line_events_job.rb` | 86.7% | 2 |
| `app/models/concerns/webhook_secretable.rb` | 75.0% | 2 |
| `app/controllers/api/v1/accounts/agent_bots_controller.rb` | 96.8% | 1 |
| `app/dashboards/agent_bot_dashboard.rb` | 87.5% | 1 |
| `app/models/agent_bot.rb` | 95.8% | 1 |
| `app/policies/agent_bot_policy.rb` | 94.1% | 1 |
