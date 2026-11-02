/**
 * OneTeam behaviour spec for adding a contact to a company.
 *
 * Covers the search step (debounced trimmed search, options without
 * already-linked contacts, unnamed contacts, the loading, initial and
 * empty states, picking a result), and the confirm step summarising
 * the company and contact (current-company badge, contact details,
 * unnamed company) with cancel and confirm buttons.
 */
import { mount } from '@vue/test-utils';
import CompanyAddContact from '../CompanyAddContact.vue';

const ComboBox = {
  name: 'ComboBox',
  props: ['modelValue', 'options', 'disabled', 'emptyState'],
  emits: ['search', 'update:modelValue'],
  template: '<div class="combo" />',
};
const Button = {
  name: 'Button',
  props: ['label', 'disabled', 'isLoading'],
  emits: ['click'],
  template: '<button @click="$emit(\'click\')">{{ label }}</button>',
};
const Avatar = {
  name: 'Avatar',
  props: ['name', 'src'],
  template: '<i class="avatar" />',
};

const results = [
  {
    id: 1,
    name: 'Ann',
    email: 'ann@x.io',
    phoneNumber: '+1',
    linkedToCurrentCompany: false,
  },
  { id: 2, name: '', email: '', linkedToCurrentCompany: false },
  { id: 3, name: 'Linked', linkedToCurrentCompany: true },
];

const mountStep = (props = {}) =>
  mount(CompanyAddContact, {
    props: { searchResults: results, ...props },
    global: { stubs: { ComboBox, Button, Avatar } },
  });

describe('CompanyAddContact behaviour', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('searches with a debounce and shows the options', async () => {
    vi.useFakeTimers();
    const wrapper = mountStep();
    const combo = wrapper.findComponent(ComboBox);
    expect(combo.props('options')).toEqual([
      { value: 1, label: 'Ann · ann@x.io · +1' },
      { value: 2, label: 'COMPANIES.DETAIL.CONTACTS.UNNAMED_CONTACT' },
    ]);
    expect(combo.props('emptyState')).toBe(
      'COMPANIES.DETAIL.CONTACTS.DIALOGS.ADD.INITIAL'
    );

    await combo.vm.$emit('search', '  an ');
    expect(combo.props('emptyState')).toBe(
      'COMPANIES.DETAIL.CONTACTS.DIALOGS.ADD.EMPTY'
    );
    vi.advanceTimersByTime(300);
    expect(wrapper.emitted('search')[0]).toEqual(['an']);

    await wrapper.setProps({ isSearching: true, isBusy: true });
    expect(combo.props('emptyState')).toBe('COMPANIES.DETAIL.CONTACTS.LOADING');
    expect(combo.props('disabled')).toBe(true);
  });

  it('selects a known result and ignores unknown ids', async () => {
    const wrapper = mountStep();
    const combo = wrapper.findComponent(ComboBox);
    await combo.vm.$emit('update:modelValue', '1');
    expect(wrapper.emitted('selectContact')[0][0]).toEqual(results[0]);
    await combo.vm.$emit('update:modelValue', '99');
    expect(wrapper.emitted('selectContact')).toHaveLength(1);
    expect(combo.props('modelValue')).toBe(null);
  });

  it('summarises the company and selected contact', async () => {
    const wrapper = mountStep({
      company: { name: 'Acme', domain: 'acme.io', avatarUrl: 'a.png' },
      selectedContact: {
        ...results[0],
        thumbnail: 't.png',
        company: { name: 'Old Co' },
      },
    });
    expect(wrapper.findComponent(ComboBox).exists()).toBe(false);
    expect(wrapper.text()).toContain(
      'COMPANIES.DETAIL.CONTACTS.DIALOGS.ADD.CURRENT_COMPANY'
    );
    const avatars = wrapper.findAllComponents(Avatar);
    expect(avatars.map(a => [a.props('name'), a.props('src')])).toEqual([
      ['Acme', 'a.png'],
      ['Ann', 't.png'],
    ]);
    expect(wrapper.text()).toContain('acme.io');
    expect(wrapper.text()).toContain('ann@x.io • +1');

    const [cancel, add] = wrapper.findAllComponents(Button);
    await cancel.trigger('click');
    await add.trigger('click');
    expect(wrapper.emitted('cancelContactSelection')).toHaveLength(1);
    expect(wrapper.emitted('confirmContactSelection')).toHaveLength(1);
  });

  it('handles an unnamed company and a bare contact', () => {
    const wrapper = mountStep({ selectedContact: { id: 2 } });
    const avatars = wrapper.findAllComponents(Avatar);
    expect(avatars.map(a => a.props('name'))).toEqual([
      'COMPANIES.UNNAMED',
      'COMPANIES.DETAIL.CONTACTS.UNNAMED_CONTACT',
    ]);
    expect(wrapper.text()).not.toContain('CURRENT_COMPANY');
    expect(wrapper.findAll('.text-n-slate-11.truncate')).toHaveLength(0);
  });
});
