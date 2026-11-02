/**
 * OneTeam behaviour spec for a message row in search results.
 *
 * Covers the link to the conversation (with the message id when given),
 * the conversation number, the inbox name and channel icon, the private
 * note badge, the created time with its exact-time tooltip, the slot
 * content, and audio attachments (with transcripts) shown apart from
 * file attachments.
 */
import { computed } from 'vue';
import { mount } from '@vue/test-utils';
import { getInboxIconByType } from 'dashboard/helper/inbox';
import SearchResultMessageItem from '../SearchResultMessageItem.vue';

const env = vi.hoisted(() => ({ inbox: null, tooltips: [] }));

vi.mock('shared/helpers/timeHelper', () => ({
  dynamicTime: time => `t${time}`,
}));
vi.mock('shared/composables/useExactTimestamp', () => ({
  useExactTimestamp: () => time => `exact${time}`,
}));
vi.mock('dashboard/helper/inbox', () => ({
  getInboxIconByType: vi.fn(() => 'i-ri-mail-fill'),
}));
vi.mock('dashboard/composables/useInbox', () => ({
  useInbox: () => ({ inbox: computed(() => env.inbox) }),
}));

const RouterLink = {
  name: 'RouterLink',
  props: ['to'],
  template: '<a :href="to"><slot /></a>',
};
const Icon = {
  name: 'Icon',
  props: ['icon'],
  template: '<i :data-icon="icon" />',
};
const FileChip = {
  name: 'FileChip',
  props: ['attachment'],
  template: '<span class="file">{{ attachment.id }}</span>',
};
const AudioChip = {
  name: 'AudioChip',
  props: { attachment: Object, showTranscribedText: Boolean },
  template: '<span class="audio">{{ attachment.id }}</span>',
};
const TranscribedText = {
  name: 'TranscribedText',
  props: ['text'],
  template: '<q>{{ text }}</q>',
};

const mountItem = (props, inbox = null) => {
  env.inbox = inbox;
  return mount(SearchResultMessageItem, {
    props,
    slots: { default: '<p class="body">Hello</p>' },
    global: {
      stubs: {
        RouterLink,
        Icon,
        FileChip,
        AudioChip,
        TranscribedText,
        CardLayout: false,
      },
      directives: {
        tooltip: {
          mounted: (el, binding) => env.tooltips.push(binding.value.content),
        },
      },
    },
  });
};

const icons = wrapper =>
  wrapper.findAllComponents(Icon).map(i => i.props('icon'));

describe('SearchResultMessageItem behaviour', () => {
  it('shows a message with its inbox, privacy, time and attachments', () => {
    const wrapper = mountItem(
      {
        id: 12,
        accountId: 1,
        inboxId: 3,
        messageId: 99,
        isPrivate: true,
        createdAt: 500,
        attachments: [
          { id: 1, fileType: 'audio', transcribedText: 'Hi there' },
          { id: 2, fileType: 'audio' },
          { id: 3, fileType: 'file' },
        ],
      },
      {
        name: 'Support',
        channelType: 'Channel::Email',
        medium: '',
        voiceEnabled: false,
      }
    );
    expect(wrapper.find('a').attributes('href')).toBe(
      '/app/accounts/1/conversations/12?messageId=99'
    );
    expect(wrapper.text()).toContain('12');
    expect(wrapper.text()).toContain('Support');
    expect(getInboxIconByType).toHaveBeenCalledWith(
      'Channel::Email',
      '',
      'fill',
      false
    );
    expect(icons(wrapper)).toEqual([
      'i-lucide-hash',
      'i-ri-mail-fill',
      'i-lucide-lock-keyhole',
    ]);
    expect(wrapper.text()).toContain('SEARCH.PRIVATE');
    expect(wrapper.text()).toContain('t500');
    expect(env.tooltips).toContain('exact500');
    expect(wrapper.find('.body').text()).toBe('Hello');
    expect(wrapper.findAll('.audio').map(a => a.text())).toEqual(['1', '2']);
    expect(wrapper.findComponent(AudioChip).props('showTranscribedText')).toBe(
      false
    );
    expect(wrapper.findAll('q').map(q => q.text())).toEqual(['Hi there']);
    expect(wrapper.findAll('.file').map(f => f.text())).toEqual(['3']);

    // Clicking a chip plays or opens it instead of following the row link.
    const audioClick = new MouseEvent('click', { cancelable: true });
    wrapper.find('.audio').element.dispatchEvent(audioClick);
    expect(audioClick.defaultPrevented).toBe(true);
    const fileClick = new MouseEvent('click', { bubbles: true });
    const rowClick = vi.fn();
    wrapper.find('a').element.addEventListener('click', rowClick);
    wrapper.find('.file').element.dispatchEvent(fileClick);
    expect(rowClick).not.toHaveBeenCalled();
  });

  it('leaves out what is missing', () => {
    const wrapper = mountItem({ id: 4, accountId: 1 });
    // frontendURL always appends "?" plus the (here empty) query string.
    expect(wrapper.find('a').attributes('href')).toBe(
      '/app/accounts/1/conversations/4?'
    );
    expect(icons(wrapper)).toEqual(['i-lucide-hash']);
    expect(wrapper.vm.inboxIcon).toBe(null);
    expect(wrapper.findAll('.w-px')).toHaveLength(0);
    expect(wrapper.text()).not.toContain('SEARCH.PRIVATE');
    expect(wrapper.find('.audio').exists()).toBe(false);
    expect(wrapper.find('.file').exists()).toBe(false);
  });

  it('shows the inbox name without an icon when the type has none', () => {
    getInboxIconByType.mockReturnValueOnce(null);
    const wrapper = mountItem({ id: 4 }, { name: 'Web' });
    expect(wrapper.text()).toContain('Web');
    expect(icons(wrapper)).toEqual(['i-lucide-hash']);
    expect(wrapper.findAll('.w-px')).toHaveLength(1);
  });
});
