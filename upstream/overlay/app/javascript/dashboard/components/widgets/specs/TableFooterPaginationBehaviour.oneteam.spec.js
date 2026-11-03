/**
 * OneTeam behaviour spec for TableFooterPagination.
 *
 * Covers the disabled states and the page change emitted by each button.
 */
import { mount } from '@vue/test-utils';
import TableFooterPagination from '../TableFooterPagination.vue';

const NextButtonStub = {
  name: 'NextButton',
  props: { icon: String, disabled: Boolean },
  emits: ['click'],
  template: '<button @click="$emit(\'click\')" />',
};

/**
 * Mounts the pagination and returns its buttons keyed by icon.
 *
 * @param {object} props component props
 * @returns {{ wrapper: object, buttons: Record<string, object> }}
 */
const mountPagination = props => {
  const wrapper = mount(TableFooterPagination, {
    props,
    global: { stubs: { NextButton: NextButtonStub } },
  });
  const buttons = {};
  wrapper.findAllComponents(NextButtonStub).forEach(button => {
    buttons[button.props('icon').replace('i-lucide-', '')] = button;
  });
  return { wrapper, buttons };
};

describe('TableFooterPagination behaviour', () => {
  it('disables the first and previous buttons on page one', async () => {
    const { wrapper, buttons } = mountPagination({
      currentPage: 1,
      totalPages: 1,
    });
    expect(buttons['chevrons-left'].props('disabled')).toBe(true);
    expect(buttons['chevrons-right'].props('disabled')).toBe(true);
    await buttons['chevrons-left'].trigger('click');
    await buttons['chevron-left'].trigger('click');
    await buttons['chevrons-right'].trigger('click');
    expect(wrapper.emitted('pageChange')).toBeUndefined();
  });

  it('emits each page change from a middle page', async () => {
    const { wrapper, buttons } = mountPagination({
      currentPage: 3,
      totalPages: 5,
    });
    await buttons['chevrons-left'].trigger('click');
    await buttons['chevron-left'].trigger('click');
    await buttons['chevron-right'].trigger('click');
    await buttons['chevrons-right'].trigger('click');
    expect(wrapper.emitted('pageChange')).toEqual([[1], [2], [4], [5]]);
  });

  it('disables next on the last page', () => {
    const { buttons } = mountPagination({ currentPage: 5, totalPages: 5 });
    expect(buttons['chevron-right'].props('disabled')).toBe(true);
  });
});
