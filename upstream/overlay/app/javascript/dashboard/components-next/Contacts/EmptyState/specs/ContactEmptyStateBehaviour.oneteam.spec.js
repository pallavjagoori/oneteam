/**
 * OneTeam behaviour spec for the contacts ContactEmptyState.
 *
 * Covers the sample contact cards, hiding the button, opening the create
 * dialog and forwarding the created contact.
 */
import { mount } from '@vue/test-utils';
import ContactEmptyState from '../ContactEmptyState.vue';

const open = vi.fn();

const DialogStub = {
  name: 'CreateNewContactDialog',
  emits: ['create'],
  setup: () => ({ dialogRef: { open } }),
  template: '<div />',
};

/**
 * Mounts the empty state.
 *
 * @param {object} props component props
 * @returns {import('@vue/test-utils').VueWrapper}
 */
const mountState = props =>
  mount(ContactEmptyState, {
    props: { title: 'No contacts', buttonLabel: 'Add', ...props },
    global: {
      stubs: {
        EmptyStateLayout: {
          template:
            '<div><slot name="empty-state-item" /><slot name="actions" /></div>',
        },
        ContactsCard: { props: ['name'], template: '<div class="card" />' },
        CreateNewContactDialog: DialogStub,
        Button: {
          emits: ['click'],
          template: '<button @click="$emit(\'click\')" />',
        },
      },
    },
  });

describe('ContactEmptyState behaviour', () => {
  it('shows five sample contacts and no button when hidden', () => {
    const wrapper = mountState({ showButton: false });
    expect(wrapper.findAll('.card')).toHaveLength(5);
    expect(wrapper.find('button').exists()).toBe(false);
  });

  it('opens the dialog and forwards a created contact', async () => {
    const wrapper = mountState({});
    await wrapper.find('button').trigger('click');
    expect(open).toHaveBeenCalled();
    wrapper.findComponent(DialogStub).vm.$emit('create', { id: 1 });
    expect(wrapper.emitted('create')).toEqual([[{ id: 1 }]]);
  });
});
