/**
 * OneTeam behaviour spec for a contact card in the contacts list.
 *
 * Covers the summary line (company, email, phone, country and city by
 * name or code, unknown countries), avatar hover and selection checkbox,
 * viewing details, expanding (resetting unsaved edits), refreshing when
 * the company changes, and saving edits from the inline form.
 */
import { mount } from '@vue/test-utils';
import ContactsCard from '../ContactsCard.vue';

const Button = {
  name: 'Button',
  props: { label: String, icon: String, isLoading: Boolean, disabled: Boolean },
  emits: ['click'],
  template:
    '<button :data-icon="icon" @click="$emit(\'click\')">{{ label }}</button>',
};
const ContactsForm = {
  name: 'ContactsForm',
  props: ['contactData'],
  emits: ['update'],
  data: () => ({ isFormInvalid: false }),
  template: '<div class="form" />',
};

const mountCard = (props = {}) =>
  mount(ContactsCard, {
    props: {
      id: 4,
      name: 'Ada',
      email: 'ada@acme.io',
      phoneNumber: '+4420',
      companyId: 1,
      additionalAttributes: {
        companyName: 'Acme',
        country: 'GB',
        city: 'London',
      },
      ...props,
    },
    global: {
      stubs: {
        Button,
        ContactsForm,
        CardLayout: {
          template: '<div class="card"><slot /><slot name="after" /></div>',
        },
        Avatar: {
          template:
            '<div class="avatar"><slot name="overlay" :size="42" /></div>',
        },
        Checkbox: {
          props: ['modelValue'],
          template:
            '<input type="checkbox" class="check" :checked="modelValue" />',
        },
        Flag: {
          props: ['country'],
          template: '<i class="flag" :data-country="country" />',
        },
        ContactDeleteSection: {
          props: ['selectedContact'],
          template: '<div class="delete" />',
        },
      },
    },
  });
const button = (wrapper, label) =>
  wrapper
    .findAllComponents(Button)
    .find(b => b.props('label') === label || b.props('icon') === label);

describe('Contacts card behaviour', () => {
  it('summarises the contact', () => {
    const wrapper = mountCard();
    expect(wrapper.text()).toContain('Acme');
    expect(wrapper.text()).toContain('ada@acme.io');
    expect(wrapper.text()).toContain('+4420');
    expect(wrapper.text()).toContain('London, United Kingdom');
    expect(wrapper.find('.flag').attributes('data-country')).toBe('GB');
    expect(wrapper.find('.check').exists()).toBe(false);
  });

  it('handles country codes, missing cities and unknown countries', () => {
    expect(
      mountCard({ additionalAttributes: { countryCode: 'IN' } }).text()
    ).toContain('India');
    expect(
      mountCard({ additionalAttributes: { country: 'ZZ' } })
        .find('.flag')
        .exists()
    ).toBe(false);
    const bare = mountCard({
      additionalAttributes: null,
      email: '',
      phoneNumber: '',
    });
    expect(bare.find('.flag').exists()).toBe(false);
    expect(bare.text()).not.toContain('Acme');
  });

  it('reports avatar hover, selection and view details', async () => {
    const wrapper = mountCard({ selectable: true, isSelected: true });
    await wrapper.find('.relative .relative').trigger('mouseenter');
    await wrapper.find('.relative .relative').trigger('mouseleave');
    expect(wrapper.emitted('avatarHover')).toEqual([[true], [false]]);
    const check = wrapper.find('.check');
    check.element.checked = false;
    await check.trigger('change');
    expect(wrapper.emitted('select')).toEqual([[false]]);
    await button(wrapper, 'CONTACTS_LAYOUT.CARD.VIEW_DETAILS').trigger('click');
    expect(wrapper.emitted('showContact')).toEqual([[4]]);
  });

  it('saves inline edits and resets them when toggled', async () => {
    const wrapper = mountCard({ isExpanded: true });
    await wrapper
      .findComponent(ContactsForm)
      .vm.$emit('update', { email: 'new@acme.io' });
    await button(
      wrapper,
      'CONTACTS_LAYOUT.CARD.EDIT_DETAILS_FORM.UPDATE_BUTTON'
    ).trigger('click');
    expect(wrapper.emitted('updateContact')[0][0]).toMatchObject({
      id: 4,
      email: 'new@acme.io',
    });
    await button(wrapper, 'i-lucide-chevron-down').trigger('click');
    expect(wrapper.emitted('toggle')).toHaveLength(1);
    expect(wrapper.findComponent(ContactsForm).props('contactData').email).toBe(
      'ada@acme.io'
    );
  });

  it('refreshes the form when the company changes', async () => {
    const wrapper = mountCard();
    await wrapper.setProps({ companyId: 2 });
    expect(
      wrapper.findComponent(ContactsForm).props('contactData').companyId
    ).toBe(2);
  });
});
