/**
 * OneTeam behaviour spec for the conversation sidebar label box.
 *
 * Covers the spinner while labels load, the applied labels and removing
 * one, opening and closing the label picker (add button, L shortcut,
 * Escape, outside click), adding and removing labels from the picker,
 * label creation only for admins, and Captain label suggestions
 * (loading skeletons, the empty note, accepting or rejecting one and
 * accepting all).
 */
import { mount } from '@vue/test-utils';
import { ref } from 'vue';
import LabelBox from '../LabelBox.vue';

const uiFlags = ref({ isFetching: false });
const isAdmin = ref(true);
const labels = {
  savedLabels: ref(['vip']),
  activeLabels: ref([{ id: 1, title: 'vip', description: 'd', color: '#f00' }]),
  accountLabels: ref([
    { id: 1, title: 'vip' },
    { id: 2, title: 'bug' },
  ]),
  addLabelToConversation: vi.fn(),
  removeLabelFromConversation: vi.fn(),
};
let keys;
let clickaway;

vi.mock('dashboard/composables/store', () => ({
  useMapGetter: () => uiFlags,
}));
vi.mock('dashboard/composables/useAdmin', () => ({
  useAdmin: () => ({ isAdmin }),
}));
vi.mock('dashboard/composables/useConversationLabels', () => ({
  useConversationLabels: () => labels,
}));
vi.mock('dashboard/composables/useKeyboardEvents', () => ({
  useKeyboardEvents: map => {
    keys = map;
  },
}));

const LabelDropdown = {
  name: 'LabelDropdown',
  props: ['accountLabels', 'selectedLabels', 'allowCreation'],
  emits: ['add', 'remove'],
  template: '<div class="picker" />',
};
const WootLabel = {
  name: 'WootLabel',
  props: { title: String, description: String, color: String },
  emits: ['remove'],
  template: '<span class="label">{{ title }}</span>',
};
const SuggestionChip = {
  name: 'SuggestionChip',
  props: ['title', 'color', 'index'],
  emits: ['accept', 'reject'],
  template: '<span class="chip">{{ title }}</span>',
};

const mountBox = (props = {}) =>
  mount(LabelBox, {
    props,
    global: {
      directives: {
        onClickaway: {
          mounted(_, binding) {
            clickaway = binding.value;
          },
        },
      },
      stubs: {
        AddLabel: {
          emits: ['add'],
          template: '<button class="add" @click="$emit(\'add\')" />',
        },
        LabelDropdown,
        WootLabel,
        SuggestionChip,
        SuggestionSkeleton: { template: '<i class="skeleton" />' },
        Spinner: { template: '<i class="spinner" />' },
        Icon: true,
        TransitionGroup: { template: '<div><slot /></div>' },
      },
    },
  });

const isOpen = wrapper => wrapper.find('.picker').exists();

describe('LabelBox behaviour', () => {
  beforeEach(() => {
    uiFlags.value = { isFetching: false };
    isAdmin.value = true;
    vi.clearAllMocks();
  });

  it('shows a spinner while labels load', () => {
    uiFlags.value = { isFetching: true };
    const wrapper = mountBox();
    expect(wrapper.find('.spinner').exists()).toBe(true);
    expect(wrapper.find('.add').exists()).toBe(false);
  });

  it('lists applied labels and removes one', async () => {
    const wrapper = mountBox();
    const label = wrapper.findComponent(WootLabel);
    expect(label.props()).toEqual(
      expect.objectContaining({ title: 'vip', description: 'd', color: '#f00' })
    );
    await label.vm.$emit('remove', 'vip');
    expect(labels.removeLabelFromConversation).toHaveBeenCalledWith('vip');
  });

  it('opens the picker and adds or removes labels', async () => {
    const wrapper = mountBox();
    expect(isOpen(wrapper)).toBe(false);
    await wrapper.find('.add').trigger('click');
    const picker = wrapper.findComponent(LabelDropdown);
    expect(picker.props()).toEqual({
      accountLabels: labels.accountLabels.value,
      selectedLabels: ['vip'],
      allowCreation: true,
    });
    await picker.vm.$emit('add', { id: 2 });
    await picker.vm.$emit('remove', 'vip');
    expect(labels.addLabelToConversation).toHaveBeenCalledWith({ id: 2 });
    expect(labels.removeLabelFromConversation).toHaveBeenCalledWith('vip');

    await wrapper.find('.add').trigger('click');
    expect(isOpen(wrapper)).toBe(false);

    isAdmin.value = false;
    await wrapper.find('.add').trigger('click');
    expect(wrapper.findComponent(LabelDropdown).props('allowCreation')).toBe(
      false
    );
  });

  it('closes the picker on Escape and outside click', async () => {
    const wrapper = mountBox();
    await wrapper.find('.add').trigger('click');
    await wrapper.find('.label-wrap').trigger('keyup', { key: 'Escape' });
    expect(isOpen(wrapper)).toBe(false);

    await wrapper.find('.add').trigger('click');
    clickaway();
    await wrapper.vm.$nextTick();
    expect(isOpen(wrapper)).toBe(false);
  });

  it('toggles with the L shortcut and closes with Escape', async () => {
    const wrapper = mountBox();
    const event = { preventDefault: vi.fn() };
    keys.KeyL.action(event);
    await wrapper.vm.$nextTick();
    expect(event.preventDefault).toHaveBeenCalled();
    expect(isOpen(wrapper)).toBe(true);

    keys.Escape.action();
    await wrapper.vm.$nextTick();
    expect(isOpen(wrapper)).toBe(false);
    keys.Escape.action();
    await wrapper.vm.$nextTick();
    expect(isOpen(wrapper)).toBe(false);
    expect(keys.Escape.allowOnFocusedInput).toBe(true);
  });

  it('shows Captain suggestions', async () => {
    expect(mountBox().find('.chip').exists()).toBe(false);

    const loading = mountBox({ isSuggestionActive: true, isSuggesting: true });
    expect(loading.findAll('.skeleton')).toHaveLength(2);

    const empty = mountBox({ isSuggestionActive: true });
    expect(empty.text()).toContain('CONVERSATION.SUGGESTIONS.EMPTY');

    const bug = { id: 2, title: 'bug', color: '#0f0' };
    const one = mountBox({ isSuggestionActive: true, suggestedLabels: [bug] });
    expect(one.text()).not.toContain('CONVERSATION.SUGGESTIONS.ACCEPT_ALL');
    const chip = one.findComponent(SuggestionChip);
    expect(chip.props()).toEqual({ title: 'bug', color: '#0f0', index: 0 });
    await chip.vm.$emit('accept');
    await chip.vm.$emit('reject');
    expect(one.emitted('acceptSuggestion')).toEqual([[bug]]);
    expect(one.emitted('rejectSuggestion')).toEqual([[bug]]);

    const many = mountBox({
      isSuggestionActive: true,
      suggestedLabels: [bug, { id: 3, title: 'sales' }],
    });
    const all = many.findAll('button').at(-1);
    expect(all.text()).toContain('CONVERSATION.SUGGESTIONS.ACCEPT_ALL');
    await all.trigger('click');
    expect(many.emitted('acceptAllSuggestions')).toHaveLength(1);
  });
});
