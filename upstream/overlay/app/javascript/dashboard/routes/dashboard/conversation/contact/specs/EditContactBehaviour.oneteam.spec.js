/**
 * OneTeam behaviour spec for the edit contact drawer.
 *
 * Covers the title fallback, submitting the form, closing from the
 * form and the close button, and the Escape shortcut only while open.
 */
import { computed } from 'vue';
import { mount } from '@vue/test-utils';
import EditContact from '../EditContact.vue';

const env = vi.hoisted(() => ({ dispatch: vi.fn() }));

vi.mock('dashboard/composables/store', () => ({
  useStore: () => ({ dispatch: env.dispatch }),
  useMapGetter: () => computed(() => ({ isUpdating: false })),
}));
vi.mock('dashboard/composables/useKeyboardEvents', () => ({
  useKeyboardEvents: events => {
    env.keys = events;
  },
}));

/**
 * Mounts the drawer.
 *
 * @param {object} props props overrides
 * @returns {import('@vue/test-utils').VueWrapper}
 */
const mountDrawer = props =>
  mount(EditContact, {
    props: { show: true, contact: { id: 5, email: 'a@b.c' }, ...props },
    global: {
      mocks: { $t: key => key },
      stubs: {
        Transition: { template: '<div><slot /></div>' },
        ContactForm: {
          name: 'ContactForm',
          props: ['onSubmit'],
          emits: ['success', 'cancel'],
          template: '<form />',
        },
        Button: {
          emits: ['click'],
          template: '<button @click="$emit(\'click\')" />',
        },
      },
    },
  });

describe('EditContact behaviour', () => {
  it('submits the contact and refreshes its inboxes', async () => {
    const wrapper = mountDrawer();
    expect(wrapper.text()).toContain('EDIT_CONTACT.TITLE - a@b.c');
    await wrapper.findComponent({ name: 'ContactForm' }).props('onSubmit')({
      id: 5,
    });
    expect(env.dispatch).toHaveBeenCalledWith('contacts/update', { id: 5 });
    expect(env.dispatch).toHaveBeenCalledWith(
      'contacts/fetchContactableInbox',
      5
    );
  });

  it('closes from the form, the button and Escape while open', async () => {
    const wrapper = mountDrawer({ contact: { id: 5, name: 'Ann' } });
    expect(wrapper.text()).toContain('EDIT_CONTACT.TITLE - Ann');
    const form = wrapper.findComponent({ name: 'ContactForm' });
    form.vm.$emit('success');
    form.vm.$emit('cancel');
    await wrapper.find('button').trigger('click');
    env.keys.Escape.action();
    expect(wrapper.emitted('cancel')).toHaveLength(4);

    await wrapper.setProps({ show: false });
    env.keys.Escape.action();
    expect(wrapper.emitted('cancel')).toHaveLength(4);
    expect(wrapper.find('form').exists()).toBe(false);
  });
});
