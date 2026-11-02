/**
 * OneTeam behaviour spec for the searchable multi-select dropdown list
 * (used for agents, teams, labels and similar pickers).
 *
 * Covers focusing the search on open, filtering by name (including
 * options without a name), the "no results" message, marking selected
 * options (matching both id and assignee type, so a bot and an agent
 * with the same id differ), picking an option, and the thumbnail
 * variants: avatar, bot avatar with badge, emoji icon and plain icon.
 */
import { mount } from '@vue/test-utils';
import MultiselectDropdownItems from '../MultiselectDropdownItems.vue';

const NextButton = {
  name: 'NextButton',
  props: ['variant', 'icon'],
  emits: ['click'],
  template:
    '<button :data-variant="variant" :data-icon="icon" @click="$emit(\'click\')"><slot /></button>',
};
const Avatar = {
  name: 'Avatar',
  props: ['src', 'name', 'status', 'iconName'],
  template: '<span class="avatar"><slot name="badge" /></span>',
};

const options = [
  { id: 1, name: 'Ann', thumbnail: 'ann.png', availability_status: 'online' },
  {
    id: 1,
    name: 'Helper bot',
    assignee_type: 'AgentBot',
    thumbnail: 'bot.png',
  },
  { id: 2, name: 'Quiet bot', assignee_type: 'AgentBot', icon: 'i-bot' },
  { id: 3, name: 'Billing', icon: '💳', icon_color: '#f00' },
  { id: 4 },
];

const mountList = (props = {}) =>
  mount(MultiselectDropdownItems, {
    attachTo: document.body,
    props: { options, ...props },
    global: {
      stubs: {
        NextButton,
        Button: NextButton,
        Avatar,
        WootDropdownMenu: { template: '<ul><slot /></ul>' },
        WootDropdownItem: { template: '<li><slot /></li>' },
        EmojiIcon: {
          props: ['value', 'color'],
          template: '<b class="emoji">{{ value }}</b>',
        },
        Icon: { props: ['icon'], template: '<i :class="icon" />' },
      },
    },
  });

describe('MultiselectDropdownItems behaviour', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('focuses the search and filters by name', async () => {
    const wrapper = mountList();
    const input = wrapper.find('input');
    expect(document.activeElement).toBe(input.element);
    expect(input.attributes('placeholder')).toBe('Search');
    expect(wrapper.findAll('li')).toHaveLength(5);

    await input.setValue('BOT');
    expect(wrapper.findAll('li').map(li => li.text())).toEqual([
      'Helper bot',
      'Quiet bot',
    ]);
    expect(wrapper.find('h4').exists()).toBe(false);

    await input.setValue('zzz');
    expect(wrapper.find('h4').text()).toBe('No results found');
    wrapper.unmount();

    const custom = mountList({
      options: undefined,
      inputPlaceholder: 'Find agent',
      noSearchResult: 'Nobody',
    });
    expect(custom.find('h4').exists()).toBe(false);
    await custom.find('input').setValue('x');
    expect(custom.find('h4').text()).toBe('Nobody');
  });

  it('marks selected options by id and type and emits picks', async () => {
    const wrapper = mountList({
      selectedItems: [null, { id: 1, assignee_type: 'AgentBot' }, { id: 4 }],
    });
    const buttons = wrapper.findAll('button');
    expect(buttons.map(b => b.attributes('data-variant'))).toEqual([
      'ghost',
      'faded',
      'ghost',
      'ghost',
      'faded',
    ]);
    expect(buttons[1].attributes('data-icon')).toBe('i-lucide-check');
    await buttons[3].trigger('click');
    expect(wrapper.emitted('select')[0][0]).toEqual(options[3]);
  });

  it('shows avatars, bot badges and icons', () => {
    const wrapper = mountList();
    const avatars = wrapper.findAllComponents(Avatar);
    expect(avatars.map(a => a.props('name'))).toEqual([
      'Ann',
      'Helper bot',
      'Quiet bot',
      undefined,
    ]);
    expect(avatars[0].props()).toMatchObject({
      src: 'ann.png',
      status: 'online',
      iconName: undefined,
    });
    expect(avatars[1].props('iconName')).toBe('i-lucide-bot');
    expect(avatars[1].find('.i-lucide-bot').exists()).toBe(true);
    expect(avatars[2].find('.i-lucide-bot').exists()).toBe(false);
    expect(wrapper.findAll('li')[3].find('i').classes()).toContain('💳');
    wrapper.unmount();

    const emoji = mountList({ showEmojiIcon: true });
    expect(emoji.find('.emoji').text()).toBe('💳');
    emoji.unmount();

    const plain = mountList({ hasThumbnail: false });
    expect(plain.findComponent(Avatar).exists()).toBe(false);
    expect(plain.findAll('i')).toHaveLength(2);
  });
});
