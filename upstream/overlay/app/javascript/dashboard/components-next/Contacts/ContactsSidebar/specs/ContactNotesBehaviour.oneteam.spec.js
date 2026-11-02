/**
 * OneTeam behaviour spec for the notes tab in the contact sidebar.
 *
 * Covers the loading spinner, the empty state, listing notes with their
 * author ("you", a name, or "Bot"), adding a note from the save button or
 * Cmd/Ctrl+Enter (ignoring empty text and clearing the editor after),
 * the save button state, and deleting a note (ignoring a missing id).
 */
import { ref } from 'vue';
import { mount } from '@vue/test-utils';
import ContactNotes from '../ContactNotes.vue';

const env = vi.hoisted(() => ({}));

vi.mock('dashboard/composables/store', () => ({
  useStore: () => ({ dispatch: env.dispatch }),
  useMapGetter: name => env.getters[name],
}));
vi.mock('vue-router', async importOriginal => ({
  ...(await importOriginal()),
  useRoute: () => ({ params: { contactId: 5 } }),
}));
vi.mock('dashboard/composables/useKeyboardEvents', () => ({
  useKeyboardEvents: events => {
    env.keyboard = events;
  },
}));

const Editor = {
  name: 'Editor',
  props: ['modelValue', 'placeholder'],
  emits: ['update:modelValue'],
  template: '<div class="editor"><slot name="actions" /></div>',
};
const Button = {
  name: 'Button',
  props: { label: String, disabled: Boolean, isLoading: Boolean },
  emits: ['click'],
  template: '<button @click="$emit(\'click\')">{{ label }}</button>',
};
const ContactNoteItem = {
  name: 'ContactNoteItem',
  props: ['note', 'writtenBy'],
  emits: ['delete'],
  template: '<article>{{ writtenBy }}</article>',
};

const mountNotes = (notes = [], flags = {}) => {
  env.dispatch = vi.fn();
  env.getters = {
    getCurrentUser: ref({ id: 1 }),
    'contactNotes/getAllNotesByContactId': ref(id => (id === 5 ? notes : [])),
    'contactNotes/getUIFlags': ref(flags),
  };
  return mount(ContactNotes, {
    global: {
      stubs: {
        Editor,
        Button,
        ContactNoteItem,
        Spinner: { template: '<i class="spinner" />' },
      },
    },
  });
};

const editor = wrapper => wrapper.findComponent(Editor);
const save = wrapper => wrapper.findComponent(Button);

describe('ContactNotes behaviour', () => {
  it('shows a spinner while loading and the empty state after', () => {
    expect(mountNotes([], { isFetching: true }).find('.spinner').exists()).toBe(
      true
    );
    const empty = mountNotes();
    expect(empty.find('.spinner').exists()).toBe(false);
    expect(empty.find('p').text()).toBe(
      'CONTACTS_LAYOUT.SIDEBAR.NOTES.EMPTY_STATE'
    );
  });

  it('lists notes with their author', () => {
    const wrapper = mountNotes([
      { id: 1, user: { id: 1, name: 'Me' } },
      { id: 2, user: { id: 2, name: 'Ann' } },
      { id: 3 },
    ]);
    expect(wrapper.findAll('article').map(a => a.text())).toEqual([
      'CONTACTS_LAYOUT.SIDEBAR.NOTES.YOU',
      'Ann',
      'Bot',
    ]);
  });

  it('adds a note from the button or the keyboard', async () => {
    const wrapper = mountNotes();
    expect(editor(wrapper).props('placeholder')).toBe(
      'CONTACTS_LAYOUT.SIDEBAR.NOTES.PLACEHOLDER'
    );
    expect(save(wrapper).props('disabled')).toBe(true);
    env.keyboard['$mod+Enter'].action();
    expect(env.dispatch).not.toHaveBeenCalled();

    await editor(wrapper).vm.$emit('update:modelValue', 'Called them');
    expect(save(wrapper).props('disabled')).toBeFalsy();
    await save(wrapper).trigger('click');
    expect(env.dispatch).toHaveBeenCalledWith('contactNotes/create', {
      content: 'Called them',
      contactId: 5,
    });
    expect(editor(wrapper).props('modelValue')).toBe('');

    await editor(wrapper).vm.$emit('update:modelValue', 'Follow up');
    env.keyboard['$mod+Enter'].action();
    expect(env.dispatch).toHaveBeenLastCalledWith('contactNotes/create', {
      content: 'Follow up',
      contactId: 5,
    });
    expect(env.keyboard['$mod+Enter'].allowOnFocusedInput).toBe(true);
  });

  it('disables saving while a note is being created', async () => {
    const wrapper = mountNotes([], { isCreating: true });
    await editor(wrapper).vm.$emit('update:modelValue', 'Text');
    expect(save(wrapper).props()).toMatchObject({
      disabled: true,
      isLoading: true,
    });
  });

  it('deletes a note', async () => {
    const wrapper = mountNotes([{ id: 7, user: { id: 1 } }]);
    const item = wrapper.findComponent(ContactNoteItem);
    await item.vm.$emit('delete', null);
    expect(env.dispatch).not.toHaveBeenCalled();
    await item.vm.$emit('delete', 7);
    expect(env.dispatch).toHaveBeenCalledWith('contactNotes/delete', {
      noteId: 7,
      contactId: 5,
    });
  });
});
