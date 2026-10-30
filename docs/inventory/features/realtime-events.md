# Real-time updates and events

**Area:** Platform internals

The internal event bus, listeners that react to events, and ActionCable broadcasts to the dashboard and widget.

## HTTP routes (0)

None.

## Database tables (0)

None.

## Backend files (17)

### channels (3)

- `app/channels/application_cable/channel.rb`
- `app/channels/application_cable/connection.rb`
- `app/channels/room_channel.rb`

### dispatchers (6)

- `app/dispatchers/async_dispatcher.rb`
- `app/dispatchers/base_dispatcher.rb`
- `app/dispatchers/dispatcher.rb`
- `app/dispatchers/sync_dispatcher.rb`
- `enterprise/app/dispatchers/enterprise/async_dispatcher.rb` (EE)
- `enterprise/app/dispatchers/enterprise/sync_dispatcher.rb` (EE)

### jobs (2)

- `app/jobs/action_cable_broadcast_job.rb`
- `app/jobs/event_dispatcher_job.rb`

### lib (2)

- `lib/events/base.rb`
- `lib/events/types.rb`

### listeners (4)

- `app/listeners/action_cable_listener.rb`
- `app/listeners/base_listener.rb`
- `app/listeners/participation_listener.rb`
- `enterprise/app/listeners/enterprise/action_cable_listener.rb` (EE)

## Ruby specs (6)

- `spec/channels/room_channel_spec.rb`
- `spec/dispatchers/async_dispatcher_spec.rb`
- `spec/enterprise/listeners/action_cable_listener_spec.rb`
- `spec/jobs/event_dispatcher_job_spec.rb`
- `spec/listeners/action_cable_listener_spec.rb`
- `spec/listeners/participation_listener_spec.rb`

## Frontend files (11)

- `app/javascript/dashboard/composables/spec/useKeyboardEvents.spec.js`
- `app/javascript/dashboard/composables/useKeyboardEvents.js`
- `app/javascript/dashboard/constants/appEvents.js`
- `app/javascript/dashboard/helper/actionCable.js`
- `app/javascript/dashboard/helper/commandbar/events.js`
- `app/javascript/dashboard/helper/specs/actionCable.spec.js`
- `app/javascript/shared/constants/busEvents.js`
- `app/javascript/shared/constants/sharedFrameEvents.js`
- `app/javascript/shared/helpers/BaseActionCableConnector.js`
- `app/javascript/shared/helpers/CustomEventHelper.js`
- `app/javascript/shared/helpers/specs/CustomEventHelper.spec.js`
