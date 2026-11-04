/**
 * OneTeam behaviour spec for the widget TranslatingContent wrapper.
 *
 * Covers the plain slot, the translating shimmer and label, and the
 * height morph between states with and without reduced motion.
 */
import { mount } from '@vue/test-utils';
import TranslatingContent from '../TranslatingContent.vue';

const TransitionStub = {
  emits: ['beforeLeave', 'enter'],
  template: `<div>
    <button class="before-leave" @click="$emit('beforeLeave')" />
    <button class="enter" @click="$emit('enter')" />
    <slot />
  </div>`,
};

/**
 * Mounts the wrapper with some text.
 *
 * @param {object} props component props
 * @returns {import('@vue/test-utils').VueWrapper}
 */
const mountContent = props =>
  mount(TranslatingContent, {
    props,
    slots: { default: '<p>Hola</p>' },
    global: {
      mocks: { $t: key => key },
      stubs: { Transition: TransitionStub },
    },
  });

describe('TranslatingContent behaviour', () => {
  let reduced;

  beforeEach(() => {
    reduced = false;
    window.matchMedia = vi.fn(() => ({ matches: reduced }));
    HTMLElement.prototype.animate = vi.fn();
  });

  it('renders the plain slot when idle', () => {
    const wrapper = mountContent({});
    expect(wrapper.html()).toBe('<p>Hola</p>');
  });

  it('shows the shimmer and label while translating', () => {
    const wrapper = mountContent({ translating: true });
    expect(wrapper.attributes('aria-busy')).toBe('true');
    expect(wrapper.text()).toContain('TRANSLATING');
    expect(wrapper.find('.animate-text-shimmer').exists()).toBe(true);
  });

  it('morphs the height between states', async () => {
    const wrapper = mountContent({ translated: true });
    expect(wrapper.text()).not.toContain('TRANSLATING');
    await wrapper.find('.before-leave').trigger('click');
    await wrapper.find('.enter').trigger('click');
    expect(HTMLElement.prototype.animate).toHaveBeenCalledWith(
      { height: ['0px', '0px'] },
      expect.objectContaining({ duration: 300 })
    );
  });

  it('skips the morph for reduced motion', async () => {
    reduced = true;
    const wrapper = mountContent({ translated: true });
    await wrapper.find('.enter').trigger('click');
    expect(HTMLElement.prototype.animate).not.toHaveBeenCalled();
  });
});
