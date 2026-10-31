/**
 * OneTeam behaviour spec for the help-center sidebar theme toggle.
 *
 * Covers labels read from the page (with fallbacks), restoring the saved
 * theme, following the system colour scheme, picking a theme (saved or
 * cleared), closing on outside clicks, and browsers without matchMedia
 * or with blocked storage. The click-away directive itself is library code,
 * so its handler is called directly.
 */
import { flushPromises, mount } from '@vue/test-utils';
import SidebarThemeToggle from '../SidebarThemeToggle.vue';

let media;
const wrappers = [];

const mountToggle = async () => {
  const wrapper = mount(SidebarThemeToggle, { attachTo: document.body });
  wrappers.push(wrapper);
  await flushPromises();
  return wrapper;
};
const html = () => document.documentElement.classList;
const options = wrapper => wrapper.findAll('.absolute button');

describe('Sidebar theme toggle behaviour', () => {
  beforeEach(() => {
    localStorage.clear();
    media = {
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    };
    window.matchMedia = vi.fn(() => media);
  });

  afterEach(() => {
    wrappers.splice(0).forEach(w => w.unmount());
    document.body.innerHTML = '';
    delete window.matchMedia;
    vi.restoreAllMocks();
  });

  it('uses fallback labels and the system theme', async () => {
    const wrapper = await mountToggle();
    expect(wrapper.find('button').attributes('aria-label')).toBe('Appearance');
    expect(wrapper.find('button span').classes()).toContain('i-lucide-monitor');
    expect(html().contains('light')).toBe(true);
    await wrapper.find('button').trigger('click');
    expect(options(wrapper).map(b => b.text())).toEqual([
      'System',
      'Light',
      'Dark',
    ]);
    expect(options(wrapper)[0].find('.i-lucide-check').exists()).toBe(true);
  });

  it('reads labels from the page and restores a saved theme', async () => {
    document.body.innerHTML =
      '<div id="sidebar-theme-toggle" data-label-trigger="Theme" data-label-dark="Night"></div>';
    localStorage.theme = 'dark';
    const wrapper = await mountToggle();
    expect(wrapper.find('button').attributes('aria-label')).toBe('Theme');
    expect(wrapper.find('button span').classes()).toContain('i-lucide-moon');
    expect(html().contains('dark')).toBe(true);
    await wrapper.find('button').trigger('click');
    expect(options(wrapper)[2].text()).toBe('Night');
  });

  it('follows the system colour scheme only in system mode', async () => {
    media.matches = true;
    const wrapper = await mountToggle();
    expect(html().contains('dark')).toBe(true);
    const onChange = media.addEventListener.mock.calls[0][1];
    onChange({ matches: false });
    expect(html().contains('light')).toBe(true);

    await wrapper.find('button').trigger('click');
    await options(wrapper)[2].trigger('click');
    expect(localStorage.theme).toBe('dark');
    expect(options(wrapper)).toHaveLength(0);
    onChange({ matches: false });
    expect(html().contains('dark')).toBe(true);

    await wrapper.find('button').trigger('click');
    await options(wrapper)[1].trigger('click');
    expect(localStorage.theme).toBe('light');
    expect(html().contains('light')).toBe(true);
    expect(wrapper.vm.triggerIcon).toBe('i-lucide-sun');

    await wrapper.find('button').trigger('click');
    await options(wrapper)[0].trigger('click');
    expect(localStorage.theme).toBeUndefined();

    wrapper.vm.mode = 'unknown';
    expect(wrapper.vm.triggerIcon).toBe('i-lucide-monitor');

    wrapper.unmount();
    expect(media.removeEventListener).toHaveBeenCalledWith('change', onChange);
  });

  it('closes from the click-away handler and toggles from the trigger', async () => {
    const wrapper = await mountToggle();
    await wrapper.find('button').trigger('click');
    expect(wrapper.find('button').attributes('aria-expanded')).toBe('true');
    await wrapper.find('button').trigger('click');
    expect(options(wrapper)).toHaveLength(0);
    await wrapper.find('button').trigger('click');
    wrapper.vm.close();
    await wrapper.vm.$nextTick();
    expect(options(wrapper)).toHaveLength(0);
  });

  it('works without matchMedia or storage', async () => {
    delete window.matchMedia;
    vi.spyOn(window, 'localStorage', 'get').mockImplementation(() => {
      throw new Error('blocked');
    });
    const wrapper = await mountToggle();
    expect(wrapper.vm.mode).toBe('system');
    await wrapper.find('button').trigger('click');
    await options(wrapper)[2].trigger('click');
    expect(html().contains('dark')).toBe(true);
    wrapper.unmount();
  });
});
