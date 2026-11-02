/**
 * OneTeam behaviour spec for the contact notes panel in the
 * conversation sidebar.
 *
 * Covers fetching notes when the contact changes, the loading, list and
 * empty states, author labels (you, another agent, the bot), opening
 * the add-note modal, saving with the button or Cmd/Ctrl+Enter (skipped
 * while empty or saving), closing the modal, and deleting notes.
 */
import { ref } from 'vue';
import { flushPromises, mount } from '@vue/test-utils';
import ContactNotes from '../ContactNotes.vue';

const uiFlags = ref({});
const notesById = ref({});
const dispatch = vi.fn();
let shortcuts;

vi.mock('dashboard/composables/store', () => ({
  useStore: () => ({ dispatch }),
  useMapGetter: name =>
    ({
      getCurrentUser: ref({ id: 7 }),
      'contactNotes/getUIFlags': uiFlags,
      'contactNotes/getAllNotesByContactId': ref(id => notesById.value[id]),
    })[name],
}));
vi.mock('dashboard/composables/useKeyboardEvents', () => ({
  useKeyboardEvents: table => {
    shortcuts = table;
  },
}));

const NextButton = {
  name: 'NextButton',
  props: ['label', 'disabled', 'isLoading'],
  emits: ['click'],
  template:
    '<button :disabled="disabled" @click="$emit(\'click\')">{{ label }}</button>',
};
const WootModal = {
  name: 'WootModal',
  props: ['show', 'onClose'],
  emits: ['update:show'],
  template: '<div v-if="show" class="modal"><slot /></div>',
};
const Editor = {
  name: 'Editor',
  props: ['modelValue'],
  emits: ['update:modelValue'],
  template: '<div class="editor" />',
};
const NoteItem = {
  name: 'ContactNoteItem',
  props: ['note', 'writtenBy'],
  emits: ['delete'],
  template: '<div class="note">{{ writtenBy }}</div>',
};

const mountPanel = contactId =>
  mount(ContactNotes, {
    props: { contactId },
    global: {
      stubs: {
        NextButton,
        WootModal,
        Editor,
        ContactNoteItem: NoteItem,
        Spinner: { template: '<i class="spinner" />' },
      },
    },
  });

const addButton = wrapper => wrapper.findAllComponents(NextButton)[0];
const saveButton = wrapper => wrapper.find('.modal').findComponent(NextButton);

describe('ContactNotes behaviour', () => {
  beforeEach(() => {
    uiFlags.value = {};
    notesById.value = {
      3: [
        { id: 1, user: { id: 7 } },
        { id: 2, user: { id: 8, name: 'Lee' } },
        { id: 3 },
      ],
    };
    dispatch.mockResolvedValue();
  });

  it('fetches and lists notes with author labels', async () => {
    const wrapper = mountPanel(3);
    expect(dispatch).toHaveBeenCalledWith('contactNotes/get', {
      contactId: 3,
    });
    expect(wrapper.findAll('.note').map(n => n.text())).toEqual([
      'CONTACTS_LAYOUT.SIDEBAR.NOTES.YOU',
      'Lee',
      'CONVERSATION.BOT',
    ]);
    await wrapper.findAllComponents(NoteItem)[1].vm.$emit('delete', 2);
    expect(dispatch).toHaveBeenCalledWith('contactNotes/delete', {
      noteId: 2,
      contactId: 3,
    });
    dispatch.mockClear();
    await wrapper.findAllComponents(NoteItem)[1].vm.$emit('delete', null);
    expect(dispatch).not.toHaveBeenCalled();
  });

  it('shows loading and empty states', async () => {
    uiFlags.value = { isFetching: true };
    const wrapper = mountPanel(3);
    expect(wrapper.find('.spinner').exists()).toBe(true);
    expect(addButton(wrapper).props('disabled')).toBe(true);

    uiFlags.value = {};
    await wrapper.setProps({ contactId: 4 });
    expect(dispatch).toHaveBeenCalledWith('contactNotes/get', {
      contactId: 4,
    });
    expect(wrapper.text()).toContain(
      'CONTACTS_LAYOUT.SIDEBAR.NOTES.CONVERSATION_EMPTY_STATE'
    );
  });

  it('does nothing without a contact', async () => {
    const wrapper = mountPanel('');
    expect(dispatch).not.toHaveBeenCalled();
    expect(addButton(wrapper).props('disabled')).toBe(true);
    expect(wrapper.text()).toContain('CONVERSATION_EMPTY_STATE');
    await addButton(wrapper).vm.$emit('click');
    expect(wrapper.find('.modal').exists()).toBe(false);
    await shortcuts['$mod+Enter'].action();
    const items = wrapper.findAllComponents(NoteItem);
    expect(items).toHaveLength(0);
    expect(dispatch).not.toHaveBeenCalled();
  });

  it('adds a note from the modal and with the shortcut', async () => {
    const wrapper = mountPanel(3);
    await addButton(wrapper).trigger('click');
    expect(wrapper.find('.modal').exists()).toBe(true);
    expect(saveButton(wrapper).props('disabled')).toBe(true);

    await shortcuts['$mod+Enter'].action();
    expect(dispatch).not.toHaveBeenCalledWith(
      'contactNotes/create',
      expect.anything()
    );

    await wrapper.findComponent(Editor).vm.$emit('update:modelValue', 'Hi');
    await saveButton(wrapper).trigger('click');
    await flushPromises();
    expect(dispatch).toHaveBeenCalledWith('contactNotes/create', {
      content: 'Hi',
      contactId: 3,
    });
    expect(wrapper.find('.modal').exists()).toBe(false);

    await addButton(wrapper).trigger('click');
    await wrapper.findComponent(Editor).vm.$emit('update:modelValue', 'Yo');
    await shortcuts['$mod+Enter'].action();
    await flushPromises();
    expect(dispatch).toHaveBeenLastCalledWith('contactNotes/create', {
      content: 'Yo',
      contactId: 3,
    });
  });

  it('skips saving while a note is being created and closes the modal', async () => {
    const wrapper = mountPanel(3);
    await addButton(wrapper).trigger('click');
    await wrapper.findComponent(Editor).vm.$emit('update:modelValue', 'Hi');
    uiFlags.value = { isCreating: true };
    await shortcuts['$mod+Enter'].action();
    expect(dispatch).not.toHaveBeenCalledWith(
      'contactNotes/create',
      expect.anything()
    );

    wrapper.findComponent(WootModal).props('onClose')();
    await wrapper.vm.$nextTick();
    expect(wrapper.find('.modal').exists()).toBe(false);

    await addButton(wrapper).trigger('click');
    await wrapper.findComponent(WootModal).vm.$emit('update:show', false);
    expect(wrapper.find('.modal').exists()).toBe(false);
  });
});
