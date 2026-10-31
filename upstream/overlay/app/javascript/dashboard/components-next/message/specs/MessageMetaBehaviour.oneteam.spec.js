/**
 * OneTeam behaviour spec for the message timestamp and delivery status.
 *
 * Covers the readable and exact timestamps, the private lock, hiding the
 * status for private, failed, deleted and incoming messages, and the sent,
 * delivered and read rules for every channel type.
 */
import { ref } from 'vue';
import { mount } from '@vue/test-utils';
import MessageMeta from '../MessageMeta.vue';

const env = vi.hoisted(() => ({ inbox: {}, context: {} }));

const CHANNELS = [
  'isAFacebookInbox',
  'isALineChannel',
  'isAPIInbox',
  'isASmsInbox',
  'isATelegramChannel',
  'isATwilioChannel',
  'isAWebWidgetInbox',
  'isAWhatsAppChannel',
  'isAnEmailChannel',
  'isAnInstagramChannel',
  'isATiktokChannel',
];

vi.mock('dashboard/composables/useInbox', () => ({
  useInbox: () => env.inbox,
}));
vi.mock('../provider.js', () => ({
  useMessageContext: () => env.context,
}));
vi.mock('shared/composables/useExactTimestamp', () => ({
  useExactTimestamp: () => value => `exact ${value}`,
}));
vi.mock('shared/helpers/timeHelper', () => ({
  messageTimestamp: (value, format) => `${format} ${value}`,
}));

const mountMeta = ({
  channel,
  status = 'sent',
  sourceId = 'src',
  ...context
} = {}) => {
  env.inbox = Object.fromEntries(
    CHANNELS.map(name => [name, ref(name === channel)])
  );
  env.context = {
    status: ref(status),
    isPrivate: ref(false),
    createdAt: ref(1700),
    sourceId: ref(sourceId),
    messageType: ref(1),
    contentAttributes: ref({}),
    ...Object.fromEntries(
      Object.entries(context).map(([key, value]) => [key, ref(value)])
    ),
  };
  return mount(MessageMeta, {
    global: {
      stubs: {
        MessageStatus: {
          props: ['status'],
          template: '<b class="status">{{ status }}</b>',
        },
        Icon: { props: ['icon'], template: '<i :class="icon" />' },
      },
      directives: {
        tooltip: {
          mounted: (el, b) => {
            el.dataset.tip = b.value.content;
          },
        },
      },
    },
  });
};
const shown = options => {
  const status = mountMeta(options).find('.status');
  return status.exists() ? status.text() : null;
};

describe('MessageMeta behaviour', () => {
  it('shows readable and exact timestamps', () => {
    const wrapper = mountMeta();
    expect(wrapper.find('time').text()).toBe('LLL d, h:mm a 1700');
    expect(wrapper.find('time').attributes('data-tip')).toBe('exact 1700');
    expect(wrapper.find('i').exists()).toBe(false);
  });

  it('hides the status for private, failed, deleted and incoming messages', () => {
    const privateNote = mountMeta({ isPrivate: true });
    expect(privateNote.find('i').classes()).toContain('i-lucide-lock-keyhole');
    expect(privateNote.find('.status').exists()).toBe(false);
    expect(shown({ status: 'failed' })).toBeNull();
    expect(shown({ contentAttributes: { deleted: true } })).toBeNull();
    expect(shown({ messageType: 0 })).toBeNull();
    expect(shown({ messageType: 3, channel: 'isALineChannel' })).toBe('sent');
    expect(shown({ contentAttributes: null, channel: 'isALineChannel' })).toBe(
      'sent'
    );
  });

  it.each([
    ['isAWhatsAppChannel', 'read', 'read'],
    ['isAWhatsAppChannel', 'delivered', 'delivered'],
    ['isAWhatsAppChannel', 'sent', 'sent'],
    ['isATwilioChannel', 'read', 'read'],
    ['isAFacebookInbox', 'delivered', 'delivered'],
    ['isAnInstagramChannel', 'sent', 'sent'],
    ['isATiktokChannel', 'read', 'read'],
    ['isASmsInbox', 'delivered', 'delivered'],
    ['isASmsInbox', 'read', 'progress'],
    ['isATelegramChannel', 'sent', 'sent'],
    ['isATelegramChannel', 'delivered', 'progress'],
    ['isAnEmailChannel', 'progress', 'sent'],
    ['isAPIInbox', 'sent', 'sent'],
    ['isAPIInbox', 'delivered', 'delivered'],
    ['isAPIInbox', 'read', 'read'],
    ['isAWebWidgetInbox', 'sent', 'delivered'],
    ['isAWebWidgetInbox', 'read', 'read'],
    ['isAWebWidgetInbox', 'progress', 'progress'],
    ['isALineChannel', 'delivered', 'delivered'],
    ['isALineChannel', 'progress', 'sent'],
    [null, 'read', 'progress'],
  ])('on %s shows %s messages as %s', (channel, status, expected) => {
    expect(shown({ channel, status })).toBe(expected);
  });

  it.each([
    'isAWhatsAppChannel',
    'isASmsInbox',
    'isATelegramChannel',
    'isAnEmailChannel',
  ])('on %s waits for a source id', channel => {
    expect(shown({ channel, sourceId: null })).toBe('progress');
  });
});
