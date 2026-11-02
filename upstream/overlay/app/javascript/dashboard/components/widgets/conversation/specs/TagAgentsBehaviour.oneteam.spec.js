/**
 * OneTeam behaviour spec for the @mention picker in the reply box.
 *
 * Covers listing agents and teams grouped under the All tab, the Agents
 * and Teams tabs with counts, searching by name, switching tabs with the
 * arrow keys (reversed in RTL, ignored while searching or at the ends),
 * team emoji icons versus avatars, the agent and team previews, and the
 * select, close and removeTrigger events.
 */
import { ref } from 'vue';
import { mount } from '@vue/test-utils';
import TagAgents from '../TagAgents.vue';

const agents = ref([]);
const teams = ref([]);
const isRTL = ref(false);
let shortcuts;

vi.mock('dashboard/composables/store', () => ({
  useStoreGetters: () => ({ 'agents/getVerifiedAgents': agents }),
  useMapGetter: name => (name === 'teams/getTeams' ? teams : isRTL),
}));
vi.mock('dashboard/composables/useKeyboardEvents', () => ({
  useKeyboardEvents: table => {
    shortcuts = table;
  },
}));

const Picker = {
  name: 'CaretAnchoredPicker',
  props: [
    'search',
    'caretPosition',
    'items',
    'searchPlaceholder',
    'emptyLabel',
  ],
  emits: ['update:search', 'select', 'close', 'removeTrigger'],
  template: `<div>
    <slot name="filters" />
    <div v-for="item in items" :key="item.id" class="row">
      <slot name="leading" :item="item" />
      <div class="preview"><slot name="preview" :item="item" /></div>
    </div>
    <div class="empty-preview"><slot name="preview" :item="null" /></div>
  </div>`,
};
const Avatar = {
  name: 'Avatar',
  props: ['src', 'name', 'size', 'status'],
  template: '<i class="avatar" />',
};
const EmojiIcon = {
  name: 'EmojiIcon',
  props: ['value', 'color'],
  template: '<i class="emoji" />',
};

const mountPicker = (props = {}) =>
  mount(TagAgents, {
    props,
    global: { stubs: { CaretAnchoredPicker: Picker, Avatar, EmojiIcon } },
  });

const key = name => ({ key: name, preventDefault: vi.fn() });

describe('TagAgents behaviour', () => {
  beforeEach(() => {
    agents.value = [
      {
        id: 1,
        name: 'Alice',
        email: 'alice@x.io',
        availability_status: 'online',
        role: 'agent',
        thumbnail: 'a.png',
      },
      { id: 2, name: 'Bob', email: '', availability_status: 'away' },
    ];
    teams.value = [
      {
        id: 7,
        name: 'Billing',
        description: 'Money',
        icon: '💰',
        icon_color: 'gold',
        allow_auto_assign: true,
        is_member: true,
      },
      { id: 8, name: 'Alpha', allow_auto_assign: false },
      { id: 9, name: null },
    ];
    isRTL.value = false;
  });

  it('groups agents and teams under All', () => {
    const wrapper = mountPicker();
    const picker = wrapper.findComponent(Picker);
    expect(picker.props('items').map(i => [i.id, i.group])).toEqual([
      ['user-1', 'CONVERSATION.MENTION.AGENTS'],
      ['user-2', 'CONVERSATION.MENTION.AGENTS'],
      ['team-7', 'CONVERSATION.MENTION.TEAMS'],
      ['team-8', 'CONVERSATION.MENTION.TEAMS'],
    ]);
    const tabs = wrapper.findAll('[role="tab"]');
    expect(tabs.map(t => t.text())).toEqual([
      'CONVERSATION.PICKER.MENTION.FILTER.ALL',
      'CONVERSATION.MENTION.AGENTS2',
      'CONVERSATION.MENTION.TEAMS2',
    ]);
    expect(tabs[0].attributes('aria-selected')).toBe('true');
  });

  it('renders avatars, team emoji and previews', () => {
    const wrapper = mountPicker();
    const rows = wrapper.findAll('.row');
    expect(rows[0].findAllComponents(Avatar)[0].props('src')).toBe('a.png');
    expect(rows[0].findAllComponents(Avatar)[1].props('status')).toBe('online');
    expect(rows[0].text()).toContain('alice@x.io');
    expect(rows[0].text()).toContain(
      'PROFILE_SETTINGS.FORM.AVAILABILITY.STATUS.ONLINE'
    );
    expect(rows[0].text()).toContain('agent');
    expect(rows[1].text()).toContain('CONVERSATION.PICKER.MENTION.ROLE');
    expect(rows[1].text()).not.toContain('PROFILE_SETTINGS');

    expect(rows[2].findAllComponents(EmojiIcon)).toHaveLength(2);
    expect(rows[2].text()).toContain('CONVERSATION.PICKER.MENTION.ENABLED');
    expect(rows[2].text()).toContain(
      'CONVERSATION.PICKER.MENTION.YOU_ARE_A_MEMBER'
    );
    expect(rows[3].findAllComponents(EmojiIcon)).toHaveLength(0);
    expect(rows[3].text()).toContain('CONVERSATION.PICKER.MENTION.DISABLED');
    expect(rows[3].text()).not.toContain('YOU_ARE_A_MEMBER');
    expect(wrapper.find('.empty-preview').text()).toBe('');
  });

  it('filters by the search text and the tabs', async () => {
    const wrapper = mountPicker({ searchKey: ' AL ' });
    const picker = wrapper.findComponent(Picker);
    expect(picker.props('items').map(i => i.id)).toEqual(['user-1', 'team-8']);

    await picker.vm.$emit('update:search', 'b');
    expect(picker.props('items').map(i => i.id)).toEqual(['user-2', 'team-7']);

    const tabs = wrapper.findAll('[role="tab"]');
    await tabs[1].trigger('click');
    expect(picker.props('items').map(i => i.id)).toEqual(['user-2']);
    await tabs[2].trigger('click');
    expect(picker.props('items').map(i => i.id)).toEqual(['team-7']);
  });

  it('switches tabs with the arrow keys', async () => {
    const wrapper = mountPicker();
    const picker = wrapper.findComponent(Picker);
    const left = key('ArrowLeft');
    shortcuts.ArrowLeft.action(left);
    expect(left.preventDefault).not.toHaveBeenCalled();

    const right = key('ArrowRight');
    shortcuts.ArrowRight.action(right);
    expect(right.preventDefault).toHaveBeenCalled();
    shortcuts.ArrowRight.action(key('ArrowRight'));
    await wrapper.vm.$nextTick();
    expect(picker.props('items').map(i => i.id)).toEqual(['team-7', 'team-8']);

    isRTL.value = true;
    shortcuts.ArrowLeft.action(key('ArrowLeft'));
    const end = key('ArrowLeft');
    shortcuts.ArrowLeft.action(end);
    expect(end.preventDefault).not.toHaveBeenCalled();
    shortcuts.ArrowRight.action(key('ArrowRight'));
    await wrapper.vm.$nextTick();
    expect(picker.props('items').map(i => i.id)).toEqual(['user-1', 'user-2']);
  });

  it('leaves the arrows to the caret while searching', async () => {
    const wrapper = mountPicker({ searchKey: 'a' });
    const event = key('ArrowRight');
    shortcuts.ArrowRight.action(event);
    expect(event.preventDefault).not.toHaveBeenCalled();
    expect(wrapper.findAll('[role="tab"]')[0].attributes('aria-selected')).toBe(
      'true'
    );
  });

  it('emits select, close and removeTrigger', async () => {
    const wrapper = mountPicker();
    const picker = wrapper.findComponent(Picker);
    await picker.vm.$emit('select', picker.props('items')[2]);
    expect(wrapper.emitted('selectAgent')[0][0]).toMatchObject({
      id: 7,
      type: 'team',
      displayName: 'Billing',
    });
    await picker.vm.$emit('close');
    await picker.vm.$emit('removeTrigger');
    expect(wrapper.emitted('close')).toHaveLength(1);
    expect(wrapper.emitted('removeTrigger')).toHaveLength(1);
  });
});
