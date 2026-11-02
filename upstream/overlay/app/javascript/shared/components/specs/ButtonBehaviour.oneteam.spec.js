/**
 * OneTeam behaviour spec for the shared (widget and survey) button.
 *
 * Covers the default blue style, custom background and text colours
 * (which replace the brand background), the "clear" text style, full
 * width, other types, and the disabled state.
 */
import { mount } from '@vue/test-utils';
import Button from '../Button.vue';

const mountButton = props =>
  mount(Button, { props, slots: { default: 'Send' } });

describe('shared Button behaviour', () => {
  it('uses the brand colour by default', () => {
    const button = mountButton();
    expect(button.text()).toBe('Send');
    expect(button.classes()).toEqual(
      expect.arrayContaining(['text-white', 'bg-n-brand'])
    );
    expect(button.attributes('style')).toBeUndefined();
    expect(button.attributes('disabled')).toBeUndefined();
  });

  it('applies custom colours instead of the brand background', () => {
    const button = mountButton({
      bgColor: 'rgb(255, 0, 0)',
      textColor: 'rgb(0, 0, 255)',
    });
    expect(button.classes()).not.toContain('bg-n-brand');
    expect(button.attributes('style')).toBe(
      'background-color: rgb(255, 0, 0); color: rgb(0, 0, 255);'
    );
    expect(mountButton({ textColor: 'red' }).attributes('style')).toBe(
      'color: red;'
    );
  });

  it('supports clear, other, block and disabled variants', () => {
    const clear = mountButton({ type: 'clear', block: true, disabled: true });
    expect(clear.classes()).toEqual(
      expect.arrayContaining(['mx-auto', 'text-xs', 'w-full'])
    );
    expect(clear.classes()).not.toContain('text-white');
    expect(clear.attributes('disabled')).toBeDefined();
    const other = mountButton({ type: 'ruby' });
    expect(other.classes()).toContain('text-white');
    expect(other.classes()).not.toContain('bg-n-brand');
  });
});
