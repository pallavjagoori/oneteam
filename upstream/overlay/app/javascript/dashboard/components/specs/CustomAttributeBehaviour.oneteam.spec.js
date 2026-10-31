/**
 * OneTeam behaviour spec for the custom attribute row in the contact and
 * conversation sidebars.
 *
 * Covers how each attribute type is shown (text, number, link, date,
 * checkbox, list), editing with validation (required, URL, regex with an
 * optional cue), copy and delete actions, focusing from the event bus,
 * and resetting when the value or contact changes.
 */
import { mount, flushPromises } from '@vue/test-utils';
import CustomAttribute from '../CustomAttribute.vue';
import { emitter } from 'shared/helpers/mitt';

const env = vi.hoisted(() => ({ clickaway: null }));

const NextButton = {
  name: 'NextButton',
  props: ['icon'],
  emits: ['click'],
  template: '<button :data-icon="icon" @click="$emit(\'click\')" />',
};
const Multiselect = {
  name: 'MultiselectDropdown',
  props: ['options', 'selectedItem'],
  emits: ['select'],
  template: '<div class="multi" />',
};

const mountAttr = (props = {}) =>
  mount(CustomAttribute, {
    props: { label: 'Plan', attributeKey: 'plan', ...props },
    attachTo: document.body,
    global: {
      stubs: {
        NextButton,
        MultiselectDropdown: Multiselect,
        HelperTextPopup: { props: ['message'], template: '<i class="help" />' },
      },
      directives: {
        tooltip: {},
        onClickaway: {
          mounted: (_, binding) => {
            env.clickaway = binding.value;
          },
        },
      },
    },
  });

const icon = (wrapper, name) => wrapper.find(`[data-icon="${name}"]`);
const edit = async wrapper => {
  await icon(wrapper, 'i-lucide-pen').trigger('click');
  await flushPromises();
  return wrapper.find('input');
};

describe('CustomAttribute behaviour', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('shows a text value with its description and actions', async () => {
    const wrapper = mountAttr({
      value: 'Gold',
      description: 'Billing plan',
      showActions: true,
    });
    expect(wrapper.find('p').text()).toBe('Gold');
    expect(wrapper.find('.help').exists()).toBe(true);
    expect(wrapper.find('.is-editable').exists()).toBe(true);
    await icon(wrapper, 'i-lucide-clipboard').trigger('click');
    expect(wrapper.emitted('copy')).toEqual([['Gold']]);
    await icon(wrapper, 'i-lucide-trash-2').trigger('click');
    expect(wrapper.emitted('delete')).toEqual([['plan']]);
  });

  it('shows dashes and no copy or delete without a value', () => {
    const wrapper = mountAttr({ value: null, showActions: true });
    expect(wrapper.find('p').text()).toBe('---');
    expect(icon(wrapper, 'i-lucide-clipboard').exists()).toBe(false);
    expect(icon(wrapper, 'i-lucide-pen').exists()).toBe(true);
    const plain = mountAttr();
    expect(plain.find('p').text()).toBe('---');
    expect(icon(plain, 'i-lucide-pen').exists()).toBe(false);
  });

  it('edits and saves a text value, focusing the input', async () => {
    const wrapper = mountAttr({ value: 'Gold', showActions: true });
    const input = await edit(wrapper);
    expect(document.activeElement).toBe(input.element);
    expect(input.attributes('type')).toBe('text');
    await input.setValue('Silver');
    await input.trigger('keyup.enter');
    expect(wrapper.emitted('update')).toEqual([['plan', 'Silver']]);
    expect(wrapper.find('input').exists()).toBe(false);
  });

  it('requires a value and shows the error after blur', async () => {
    const wrapper = mountAttr({ value: 'Gold', showActions: true });
    const input = await edit(wrapper);
    await input.setValue('');
    await input.trigger('blur');
    expect(wrapper.text()).toContain('CUSTOM_ATTRIBUTES.VALIDATIONS.REQUIRED');
    expect(input.classes()).toContain('error');
    expect(wrapper.find('span').classes()).toContain('text-n-ruby-11');
    await icon(wrapper, 'i-lucide-check').trigger('click');
    expect(wrapper.emitted('update')).toBeUndefined();

    // Clicking away closes the editor and clears the error.
    env.clickaway();
    await flushPromises();
    expect(wrapper.find('input').exists()).toBe(false);
    expect(wrapper.find('span').classes()).toContain('text-n-slate-12');
  });

  it('checks the regex and shows the cue or a default message', async () => {
    const wrapper = mountAttr({
      value: 'A1',
      showActions: true,
      attributeRegex: '/^[A-Z]\\d$/',
      regexCue: 'Like A1',
    });
    let input = await edit(wrapper);
    await input.setValue('bad');
    await input.trigger('keyup.enter');
    expect(wrapper.text()).toContain('Like A1');
    await input.setValue('B2');
    await input.trigger('keyup.enter');
    expect(wrapper.emitted('update')).toEqual([['plan', 'B2']]);

    await wrapper.setProps({ regexCue: null });
    input = await edit(wrapper);
    await input.setValue('bad');
    await input.trigger('keyup.enter');
    expect(wrapper.text()).toContain(
      'CUSTOM_ATTRIBUTES.VALIDATIONS.INVALID_INPUT'
    );
  });

  it('rejects every value when the regex itself is invalid', async () => {
    const wrapper = mountAttr({
      value: 'x',
      showActions: true,
      attributeRegex: '/[/',
    });
    const input = await edit(wrapper);
    await input.trigger('keyup.enter');
    expect(wrapper.emitted('update')).toBeUndefined();
  });

  it('shows a link and validates URLs', async () => {
    const wrapper = mountAttr({
      attributeType: 'link',
      value: 'https://example.com',
      showActions: true,
    });
    expect(wrapper.find('a').attributes('href')).toBe('https://example.com');
    expect(wrapper.find('a').text()).toBe('https://example.com');
    const input = await edit(wrapper);
    expect(input.attributes('type')).toBe('url');
    await input.setValue('nope');
    await input.trigger('keyup.enter');
    expect(wrapper.text()).toContain(
      'CUSTOM_ATTRIBUTES.VALIDATIONS.INVALID_URL'
    );

    const bad = mountAttr({ attributeType: 'link', value: 'nope' });
    expect(bad.find('a').attributes('href')).toBe('');
    expect(bad.find('a').text()).toBe('---');
  });

  it('shows and saves dates', async () => {
    const wrapper = mountAttr({
      attributeType: 'date',
      value: '2024-03-05',
      showActions: true,
    });
    expect(wrapper.find('p').text()).toBe(
      new Date('2024-03-05').toLocaleDateString()
    );
    const input = await edit(wrapper);
    expect(input.element.value).toBe('2024-03-05');
    await input.setValue('2024-04-01');
    await input.trigger('keyup.enter');
    const [key, date] = wrapper.emitted('update')[0];
    expect(key).toBe('plan');
    expect(date).toEqual(new Date(2024, 3, 1));

    const empty = mountAttr({ attributeType: 'date', value: '' });
    expect(empty.find('p').text()).toBe('---');
    expect(empty.vm.editedValue).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('toggles a checkbox and saves at once', async () => {
    const wrapper = mountAttr({ attributeType: 'checkbox', value: true });
    await flushPromises();
    expect(wrapper.find('p').exists()).toBe(false);
    expect(wrapper.vm.displayValue).toBe(true);
    const box = wrapper.find('input[type="checkbox"]');
    expect(box.element.checked).toBe(true);
    await box.setValue(false);
    expect(wrapper.emitted('update')).toEqual([['plan', false]]);

    const off = mountAttr({ attributeType: 'checkbox', value: 'false' });
    expect(off.vm.displayValue).toBe(false);
  });

  it('picks a list value', async () => {
    const wrapper = mountAttr({
      attributeType: 'list',
      values: ['Free', 'Pro'],
      value: 'Pro',
    });
    await flushPromises();
    const list = wrapper.findComponent({ name: 'MultiselectDropdown' });
    expect(list.props('options')).toEqual([
      { id: 1, name: 'Free' },
      { id: 2, name: 'Pro' },
    ]);
    expect(list.props('selectedItem')).toEqual({ id: 2, name: 'Pro' });
    expect(wrapper.find('p').exists()).toBe(false);
    list.vm.$emit('select', null);
    expect(wrapper.emitted('update')).toBeUndefined();
    list.vm.$emit('select', { id: 1, name: 'Free' });
    expect(wrapper.emitted('update')).toEqual([['plan', 'Free']]);
  });

  it('opens the editor when the bus asks to focus this attribute', async () => {
    const wrapper = mountAttr({
      value: 5,
      attributeType: 'number',
      showActions: true,
    });
    emitter.emit('FOCUS_CUSTOM_ATTRIBUTE', 'other');
    await flushPromises();
    expect(wrapper.find('input').exists()).toBe(false);
    emitter.emit('FOCUS_CUSTOM_ATTRIBUTE', 'plan');
    await flushPromises();
    expect(wrapper.find('input').attributes('type')).toBe('number');
    wrapper.unmount();
    emitter.emit('FOCUS_CUSTOM_ATTRIBUTE', 'plan');
  });

  it('skips focusing when the editor is gone before the next tick', async () => {
    const wrapper = mountAttr({ value: 'x', showActions: true });
    wrapper.vm.onEdit();
    wrapper.vm.isEditing = false;
    await flushPromises();
    expect(wrapper.find('input').exists()).toBe(false);
  });

  it('resets when the value or contact changes', async () => {
    const wrapper = mountAttr({
      value: 'Gold',
      showActions: true,
      contactId: 1,
    });
    const input = await edit(wrapper);
    await input.setValue('');
    await input.trigger('blur');
    await wrapper.setProps({ contactId: 2 });
    expect(wrapper.text()).not.toContain('VALIDATIONS.REQUIRED');
    await wrapper.setProps({ value: 'Bronze' });
    expect(wrapper.find('input').exists()).toBe(false);
    expect(wrapper.vm.editedValue).toBe('Bronze');
  });
});
