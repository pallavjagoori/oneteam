/**
 * OneTeam behaviour spec for the ui Wizard step list.
 *
 * Covers the active step from the route, completed steps and the
 * fallback to the first step.
 */
import { mount } from '@vue/test-utils';
import Wizard from '../Wizard.vue';

const route = vi.hoisted(() => ({ name: '' }));

vi.mock('vue-router', async importOriginal => ({
  ...(await importOriginal()),
  useRoute: () => route,
}));

const items = [
  { route: 'one', title: 'One', body: 'First' },
  { route: 'two', title: 'Two', body: 'Second' },
  { route: 'three', title: 'Three', body: 'Third' },
];

/**
 * Mounts the wizard with an Icon stub.
 *
 * @returns {import('@vue/test-utils').VueWrapper}
 */
const mountWizard = () =>
  mount(Wizard, {
    props: { items },
    global: { stubs: { Icon: { template: '<i class="check" />' } } },
  });

describe('Wizard behaviour', () => {
  it('marks earlier steps done and highlights the active one', () => {
    route.name = 'two';
    const wrapper = mountWizard();
    expect(wrapper.findAll('.check')).toHaveLength(1);
    const titles = wrapper.findAll('h3');
    expect(titles[1].classes()).toContain('text-n-blue-11');
    expect(titles[2].classes()).toContain('text-n-slate-12');
    expect(wrapper.text()).toContain('3');
  });

  it('falls back to the first step for an unknown route', () => {
    route.name = 'elsewhere';
    const wrapper = mountWizard();
    expect(wrapper.findAll('.check')).toHaveLength(0);
    expect(wrapper.findAll('h3')[0].classes()).toContain('text-n-blue-11');
  });

  it('renders nothing without items', () => {
    expect(mount(Wizard).findAll('h3')).toHaveLength(0);
  });
});
