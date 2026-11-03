/**
 * OneTeam behaviour spec for one company custom attribute row.
 *
 * Covers picking the list, checkbox, date or fallback editor, updating
 * and deleting the value through the companies store, and the success,
 * API and default error alerts.
 */
import { mount, flushPromises } from '@vue/test-utils';
import CompanyCustomAttributeItem from '../CompanyCustomAttributeItem.vue';
import { useAlert } from 'dashboard/composables';

const store = vi.hoisted(() => ({
  update: vi.fn(),
  deleteCustomAttributes: vi.fn(),
}));

vi.mock('dashboard/composables', () => ({ useAlert: vi.fn() }));
vi.mock('dashboard/stores/companies', () => ({
  useCompaniesStore: () => store,
}));

const editor = name => ({
  name,
  props: ['attribute', 'isEditingView'],
  emits: ['update', 'delete'],
  template: `<i class="${name}" />`,
});
const stubs = {
  ListAttribute: editor('ListAttribute'),
  CheckboxAttribute: editor('CheckboxAttribute'),
  DateAttribute: editor('DateAttribute'),
  OtherAttribute: editor('OtherAttribute'),
};
const mountItem = (type, isEditingView = false) =>
  mount(CompanyCustomAttributeItem, {
    props: {
      companyId: 4,
      isEditingView,
      attribute: {
        attributeKey: 'tier',
        attributeDisplayName: 'Tier',
        attributeDisplayType: type,
      },
    },
    global: { stubs },
  });

describe('CompanyCustomAttributeItem behaviour', () => {
  it('picks the editor for each type', () => {
    expect(mountItem('list').find('.ListAttribute').exists()).toBe(true);
    expect(mountItem('checkbox').find('.CheckboxAttribute').exists()).toBe(
      true
    );
    expect(mountItem('date').find('.DateAttribute').exists()).toBe(true);
    const other = mountItem('text', true);
    expect(other.find('.OtherAttribute').exists()).toBe(true);
    expect(other.classes()).toContain('min-h-10');
    expect(mountItem('text').classes()).toContain('min-h-11');
    expect(other.text()).toContain('Tier');
  });

  it('updates and deletes with alerts', async () => {
    store.update
      .mockResolvedValueOnce()
      .mockRejectedValueOnce({ response: { message: 'Bad' } })
      .mockRejectedValueOnce(new Error('x'));
    store.deleteCustomAttributes
      .mockResolvedValueOnce()
      .mockRejectedValueOnce({ response: { message: 'Nope' } })
      .mockRejectedValueOnce(new Error('x'));
    const field = mountItem('text').findComponent(stubs.OtherAttribute);
    for (let i = 0; i < 3; i += 1) {
      field.vm.$emit('update', 'Gold');
      field.vm.$emit('delete');
    }
    await flushPromises();
    expect(store.update).toHaveBeenCalledWith({
      id: 4,
      customAttributes: { tier: 'Gold' },
    });
    expect(store.deleteCustomAttributes).toHaveBeenCalledWith({
      id: 4,
      customAttributes: ['tier'],
    });
    [
      'COMPANIES.DETAIL.ATTRIBUTES.MESSAGES.UPDATE_SUCCESS',
      'Bad',
      'COMPANIES.DETAIL.ATTRIBUTES.MESSAGES.UPDATE_ERROR',
      'COMPANIES.DETAIL.ATTRIBUTES.MESSAGES.DELETE_SUCCESS',
      'Nope',
      'COMPANIES.DETAIL.ATTRIBUTES.MESSAGES.DELETE_ERROR',
    ].forEach(message => expect(useAlert).toHaveBeenCalledWith(message));
  });
});
