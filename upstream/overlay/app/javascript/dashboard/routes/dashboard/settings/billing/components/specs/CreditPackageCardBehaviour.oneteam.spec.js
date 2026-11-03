/**
 * OneTeam behaviour spec for a Captain credit top-up package card.
 *
 * Covers the credits and price, the popular tag, the selected styles and
 * check mark, and selecting the package.
 */
import { mount } from '@vue/test-utils';
import CreditPackageCard from '../CreditPackageCard.vue';

/**
 * Mounts the card.
 *
 * @param {object} props Card props.
 * @returns {import('@vue/test-utils').VueWrapper} The mounted wrapper.
 */
const mountCard = props =>
  mount(CreditPackageCard, {
    props: { credits: 5000, amount: 50, name: 'topup', ...props },
    global: { mocks: { $t: key => key } },
  });

describe('CreditPackageCard behaviour', () => {
  it('shows a selected popular package', () => {
    const wrapper = mountCard({ isSelected: true, isPopular: true });
    expect(wrapper.text()).toContain('5,000');
    expect(wrapper.text()).toContain('$50');
    expect(wrapper.classes()).toContain('border-woot-500');
    expect(wrapper.get('.-top-3').classes()).toContain('bg-woot-500');
    expect(wrapper.find('svg').exists()).toBe(true);
    expect(wrapper.get('input').element.checked).toBe(true);
  });

  it('selects an unselected package', async () => {
    const wrapper = mountCard({ isPopular: true, currency: 'usd' });
    expect(wrapper.classes()).toContain('border-n-weak');
    expect(wrapper.get('.-top-3').classes()).toContain('bg-n-solid-3');
    expect(wrapper.find('svg').exists()).toBe(false);
    await wrapper.get('input').trigger('change');
    expect(wrapper.emitted('select')).toHaveLength(1);
    expect(mountCard().find('.-top-3').exists()).toBe(false);
  });
});
