/**
 * OneTeam behaviour spec for the contacts list page body.
 *
 * Covers rendering a card per contact, expanding one card at a time,
 * showing the selection checkbox on hover or when selected, forwarding
 * selection, opening contact details from plain, segment and label
 * routes, and saving contacts (success, duplicate email or phone, API
 * messages, generic errors).
 */
import { computed } from 'vue';
import { flushPromises, mount } from '@vue/test-utils';
import { useAlert } from 'dashboard/composables';
import {
  DuplicateContactException,
  ExceptionWithMessage,
} from 'shared/helpers/CustomErrors';
import ContactsList from '../ContactsList.vue';

const env = vi.hoisted(() => ({}));

vi.mock('dashboard/composables', () => ({ useAlert: vi.fn() }));
vi.mock('dashboard/composables/store', () => ({
  useStore: () => ({ dispatch: (...args) => env.dispatch(...args) }),
  useMapGetter: () => computed(() => ({ isUpdating: true })),
}));
vi.mock('vue-router', () => ({
  useRouter: () => ({ push: env.push }),
  useRoute: () => env.route,
}));

const Card = {
  name: 'ContactsCard',
  props: {
    id: Number,
    isExpanded: Boolean,
    isUpdating: Boolean,
    selectable: Boolean,
    isSelected: Boolean,
  },
  emits: ['toggle', 'updateContact', 'showContact', 'select', 'avatarHover'],
  template: '<div class="card" />',
};

const mountList = (props = {}) =>
  mount(ContactsList, {
    props: {
      contacts: [
        { id: 1, name: 'Ada' },
        { id: 2, name: 'Bo' },
      ],
      selectedContactIds: [2],
      ...props,
    },
    global: { stubs: { ContactsCard: Card } },
  });
const cards = wrapper => wrapper.findAllComponents(Card);

describe('Contacts list behaviour', () => {
  beforeEach(() => {
    env.dispatch = vi.fn().mockResolvedValue();
    env.push = vi.fn();
    env.route = {
      name: 'contacts_dashboard_index',
      params: {},
      query: { page: 2 },
    };
  });

  it('renders cards with selection and expansion state', async () => {
    const wrapper = mountList();
    expect(cards(wrapper).map(c => c.props('isSelected'))).toEqual([
      false,
      true,
    ]);
    expect(cards(wrapper).map(c => c.props('selectable'))).toEqual([
      false,
      true,
    ]);
    expect(cards(wrapper)[0].props('isUpdating')).toBe(true);
    await cards(wrapper)[0].vm.$emit('avatarHover', true);
    expect(cards(wrapper)[0].props('selectable')).toBe(true);
    await cards(wrapper)[0].vm.$emit('avatarHover', false);
    expect(cards(wrapper)[0].props('selectable')).toBe(false);
    await cards(wrapper)[0].vm.$emit('toggle');
    expect(cards(wrapper).map(c => c.props('isExpanded'))).toEqual([
      true,
      false,
    ]);
    await cards(wrapper)[1].vm.$emit('toggle');
    expect(cards(wrapper).map(c => c.props('isExpanded'))).toEqual([
      false,
      true,
    ]);
    await cards(wrapper)[1].vm.$emit('toggle');
    expect(cards(wrapper).map(c => c.props('isExpanded'))).toEqual([
      false,
      false,
    ]);
    await cards(wrapper)[0].vm.$emit('select', true);
    expect(wrapper.emitted('toggleContact')).toEqual([
      [{ id: 1, value: true }],
    ]);
  });

  it('copes with a null selection list', () => {
    const wrapper = mountList({ selectedContactIds: null });
    expect(cards(wrapper).map(c => c.props('isSelected'))).toEqual([
      false,
      false,
    ]);
  });

  it('opens contact details from each kind of list', async () => {
    const wrapper = mountList();
    await cards(wrapper)[0].vm.$emit('showContact', 1);
    expect(env.push).toHaveBeenLastCalledWith({
      name: 'contacts_edit',
      params: { contactId: 1 },
      query: { page: 2 },
    });
    env.route = {
      name: 'contacts_dashboard_segments_index',
      params: { segmentId: 7 },
      query: {},
    };
    const segments = mountList();
    await cards(segments)[0].vm.$emit('showContact', 1);
    expect(env.push).toHaveBeenLastCalledWith({
      name: 'contacts_edit_segment',
      params: { contactId: 1, segmentId: 7 },
      query: {},
    });
    env.route = {
      name: 'contacts_dashboard_labels_index',
      params: { label: 'vip' },
      query: {},
    };
    const labels = mountList();
    await cards(labels)[0].vm.$emit('showContact', 1);
    expect(env.push).toHaveBeenLastCalledWith({
      name: 'contacts_edit_label',
      params: { contactId: 1, label: 'vip' },
      query: {},
    });
  });

  it('saves contacts and explains failures', async () => {
    const wrapper = mountList();
    const save = async () => {
      await cards(wrapper)[0].vm.$emit('updateContact', {
        id: 1,
        name: 'Ada L',
      });
      await flushPromises();
    };
    await save();
    expect(env.dispatch).toHaveBeenCalledWith('contacts/update', {
      id: 1,
      name: 'Ada L',
      resolveLegacyCompany: true,
    });
    expect(useAlert).toHaveBeenLastCalledWith(
      'CONTACTS_LAYOUT.CARD.EDIT_DETAILS_FORM.SUCCESS_MESSAGE'
    );
    const prefix = 'CONTACTS_LAYOUT.CARD.EDIT_DETAILS_FORM.FORM';
    env.dispatch.mockRejectedValueOnce(
      new DuplicateContactException(['email'])
    );
    await save();
    expect(useAlert).toHaveBeenLastCalledWith(
      `${prefix}.EMAIL_ADDRESS.DUPLICATE`
    );
    env.dispatch.mockRejectedValueOnce(
      new DuplicateContactException(['phone_number'])
    );
    await save();
    expect(useAlert).toHaveBeenLastCalledWith(
      `${prefix}.PHONE_NUMBER.DUPLICATE`
    );
    useAlert.mockClear();
    env.dispatch.mockRejectedValueOnce(
      new DuplicateContactException(['identifier'])
    );
    await save();
    expect(useAlert).not.toHaveBeenCalled();
    env.dispatch.mockRejectedValueOnce(new ExceptionWithMessage('Blocked'));
    await save();
    expect(useAlert).toHaveBeenLastCalledWith('Blocked');
    env.dispatch.mockRejectedValueOnce(new Error('x'));
    await save();
    expect(useAlert).toHaveBeenLastCalledWith(`${prefix}.ERROR_MESSAGE`);
  });
});
