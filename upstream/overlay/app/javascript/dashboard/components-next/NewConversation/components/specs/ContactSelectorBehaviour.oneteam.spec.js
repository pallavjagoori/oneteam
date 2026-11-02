/**
 * OneTeam behaviour spec for the new conversation's contact picker.
 *
 * Covers searching contacts (switching to a phone keyboard for "+"),
 * listing matches with their email, picking and clearing a contact,
 * closing the dropdown on an outside click, disabling search while an
 * inbox is being chosen, the error placeholder style, the "creating
 * contact" note, and the chosen contact's label (email, phone or name)
 * with a clear button only when the contact was not preset.
 */
import { mount } from '@vue/test-utils';
import ContactSelector from '../ContactSelector.vue';

vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: key => key }) }));

const TagInput = {
  name: 'TagInput',
  props: {
    menuItems: Array,
    showDropdown: Boolean,
    isLoading: Boolean,
    disabled: Boolean,
    type: String,
    placeholder: String,
  },
  emits: ['input', 'onClickOutside', 'add', 'remove'],
  template: '<div class="tag-input" />',
};
const Button = {
  name: 'Button',
  emits: ['click'],
  template: '<button @click="$emit(\'click\')" />',
};

const P = 'COMPOSE_NEW_CONVERSATION.FORM.CONTACT_SELECTOR';
const mountSelector = (props = {}) =>
  mount(ContactSelector, {
    props: {
      contacts: [
        {
          id: 1,
          name: 'Ann',
          email: 'ann@x.co',
          thumbnail: 'a.png',
          phone: '1',
        },
        { id: 2, name: 'Bo' },
      ],
      showContactsDropdown: true,
      isLoading: false,
      isCreatingContact: false,
      showInboxesDropdown: false,
      ...props,
    },
    global: { stubs: { TagInput, Button } },
  });

const input = wrapper => wrapper.findComponent(TagInput);

describe('ContactSelector behaviour', () => {
  it('searches and lists contacts', async () => {
    const wrapper = mountSelector({ isLoading: true });
    expect(wrapper.find('label').text()).toBe(`${P}.LABEL`);
    expect(input(wrapper).props()).toEqual(
      expect.objectContaining({
        placeholder: `${P}.TAG_INPUT_PLACEHOLDER`,
        showDropdown: true,
        isLoading: true,
        disabled: false,
        type: 'email',
      })
    );
    expect(input(wrapper).props('menuItems')).toEqual([
      {
        id: 1,
        label: 'Ann (ann@x.co)',
        value: 1,
        thumbnail: { name: 'Ann', src: 'a.png' },
        phone: '1',
        name: 'Ann',
        email: 'ann@x.co',
        action: 'contact',
      },
      {
        id: 2,
        label: 'Bo',
        value: 2,
        thumbnail: { name: 'Bo', src: undefined },
        name: 'Bo',
        email: undefined,
        action: 'contact',
      },
    ]);

    await input(wrapper).vm.$emit('input', '+44');
    expect(input(wrapper).props('type')).toBe('tel');
    await input(wrapper).vm.$emit('input', 'ann');
    expect(input(wrapper).props('type')).toBe('email');
    expect(wrapper.emitted('searchContacts')).toEqual([['+44'], ['ann']]);
  });

  it('picks, clears and closes', async () => {
    const wrapper = mountSelector();
    await input(wrapper).vm.$emit('add', { id: 1 });
    await input(wrapper).vm.$emit('remove');
    await input(wrapper).vm.$emit('onClickOutside');
    expect(wrapper.emitted('setSelectedContact')).toEqual([[{ id: 1 }]]);
    expect(wrapper.emitted('clearSelectedContact')).toHaveLength(1);
    expect(wrapper.emitted('updateDropdown')).toEqual([['contacts', false]]);
  });

  it('disables search while an inbox is chosen and marks errors', () => {
    expect(
      input(
        mountSelector({
          contactableInboxesList: [{ id: 1 }],
          showInboxesDropdown: true,
        })
      ).props('disabled')
    ).toBe(true);
    expect(
      input(mountSelector({ showInboxesDropdown: true })).props('disabled')
    ).toBe(false);
    expect(
      input(mountSelector({ contactableInboxesList: null })).props('disabled')
    ).toBe(false);
    expect(input(mountSelector({ hasErrors: true })).classes()).toContain(
      '[&_input]:placeholder:!text-n-ruby-9'
    );
    expect(input(mountSelector()).classes()).not.toContain(
      '[&_input]:placeholder:!text-n-ruby-9'
    );
    expect(input(mountSelector({ contacts: null })).props('menuItems')).toBe(
      undefined
    );
  });

  it('notes a contact being created', () => {
    const wrapper = mountSelector({
      isCreatingContact: true,
      selectedContact: { name: 'Ann' },
    });
    expect(wrapper.text()).toContain(`${P}.CONTACT_CREATING`);
    expect(wrapper.find('.tag-input').exists()).toBe(false);
  });

  it('labels the chosen contact and clears it unless preset', async () => {
    const label = selectedContact =>
      mountSelector({ selectedContact }).find('span').text();
    expect(label({ name: 'Ann', email: 'ann@x.co' })).toBe('Ann (ann@x.co)');
    expect(label({ name: 'Ann', phoneNumber: '+1' })).toBe('Ann (+1)');
    expect(label({ name: 'Ann' })).toBe('Ann');
    expect(label({})).toBe('');
    // The label only renders with a contact; without one it is empty.
    expect(mountSelector().vm.selectedContactLabel).toBe('');

    const wrapper = mountSelector({ selectedContact: { name: 'Ann' } });
    await wrapper.find('button').trigger('click');
    expect(wrapper.emitted('clearSelectedContact')).toHaveLength(1);

    const preset = mountSelector({
      selectedContact: { name: 'Ann' },
      contactId: '5',
    });
    expect(preset.find('button').exists()).toBe(false);
    expect(preset.find('.px-3').exists()).toBe(true);
  });
});
