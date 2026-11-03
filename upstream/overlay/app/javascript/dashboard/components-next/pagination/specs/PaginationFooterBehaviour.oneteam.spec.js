/**
 * OneTeam behaviour spec for the list pagination footer.
 *
 * Covers the "showing x-y of z" and page count texts (with a custom
 * translation key), jumping to the first, previous, next and last page,
 * and the disabled buttons on the first and last page.
 */
import { mount } from '@vue/test-utils';
import PaginationFooter from '../PaginationFooter.vue';

vi.mock('vue-i18n', async importOriginal => ({
  ...(await importOriginal()),
  useI18n: () => ({
    t: (key, params, count) => `${key}${JSON.stringify(params)}#${count}`,
  }),
}));
vi.mock('shared/composables/useNumberFormatter', () => ({
  useNumberFormatter: () => ({
    formatCompactNumber: n => `c${n}`,
    formatFullNumber: n => `f${n}`,
  }),
}));

const Button = {
  name: 'NextButton',
  props: { icon: String, disabled: Boolean },
  emits: ['click'],
  template: '<button />',
};

/**
 * Mounts the footer with stubbed buttons.
 *
 * @param {object} props Footer props.
 * @returns {import('@vue/test-utils').VueWrapper} The mounted wrapper.
 */
const mountFooter = props =>
  mount(PaginationFooter, { props, global: { stubs: { Button } } });

const clickAll = wrapper =>
  wrapper.findAllComponents(Button).forEach(b => b.vm.$emit('click'));

describe('PaginationFooter behaviour', () => {
  it('shows the item range and page count', () => {
    const wrapper = mountFooter({ currentPage: 2, totalItems: 40 });
    const text = wrapper.text();
    expect(text).toContain(
      'PAGINATION_FOOTER.SHOWING{"startItem":"f17","endItem":"f32","totalItems":"c40"}#40'
    );
    expect(text).toContain(
      'PAGINATION_FOOTER.CURRENT_PAGE_INFO{"currentPage":"","totalPages":"c3"}#3'
    );
    expect(text).toContain('f2');
  });

  it('jumps to the first, previous, next and last page', () => {
    const wrapper = mountFooter({ currentPage: 2, totalItems: 40 });
    clickAll(wrapper);
    expect(wrapper.emitted('update:currentPage')).toEqual([[1], [1], [3], [3]]);
  });

  it('disables and ignores moves past the first and last page', () => {
    const wrapper = mountFooter({
      currentPage: 1,
      totalItems: 5,
      itemsPerPage: 5,
      currentPageInfo: 'CUSTOM.KEY',
    });
    expect(
      wrapper.findAllComponents(Button).map(b => b.props('disabled'))
    ).toEqual([true, true, true, true]);
    expect(wrapper.text()).toContain('CUSTOM.KEY');
    clickAll(wrapper);
    expect(wrapper.emitted('update:currentPage')).toEqual([[1], [1]]);
  });
});
