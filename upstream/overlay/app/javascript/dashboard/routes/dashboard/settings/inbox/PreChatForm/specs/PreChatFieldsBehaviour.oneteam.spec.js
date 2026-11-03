/**
 * OneTeam behaviour spec for the pre-chat form field table.
 *
 * Covers listing fields (enabled and disabled styling, editable inputs
 * only when enabled), emitting toggle and required changes, following new
 * fields from the parent, and reporting the new order after a drag.
 */
import { mount } from '@vue/test-utils';
import Draggable from 'vuedraggable';
import PreChatFields from '../PreChatFields.vue';

const Switch = {
  name: 'ToggleSwitch',
  props: ['modelValue'],
  emits: ['change'],
  template: '<i />',
};
const fields = () => [
  {
    name: 'email',
    type: 'email',
    enabled: true,
    required: false,
    label: 'Email',
  },
  {
    name: 'phone',
    type: 'text',
    enabled: false,
    required: false,
    label: 'Phone',
  },
];
const mountFields = preChatFields =>
  mount(PreChatFields, {
    props: { preChatFields },
    global: { stubs: { ToggleSwitch: Switch, Icon: true } },
  });

describe('PreChatFields behaviour', () => {
  it('lists fields and emits changes', async () => {
    const wrapper = mountFields(fields());
    const rows = wrapper.findAll('tr');
    expect(rows).toHaveLength(2);
    expect(rows[0].text()).toContain('email');
    expect(rows[1].find('td:nth-child(3)').classes()).toContain(
      'text-n-slate-11'
    );
    const [, , phoneLabel] = rows[1].findAll('input');
    expect(phoneLabel.attributes('disabled')).toBeDefined();
    expect(rows[0].findAll('input')[1].attributes('disabled')).toBeUndefined();

    wrapper.findComponent(Switch).vm.$emit('change', true);
    await rows[0].find('input[type="checkbox"]').trigger('click');
    const updates = wrapper.emitted('update');
    expect(updates[0].slice(1)).toEqual([
      'enabled',
      expect.objectContaining({ name: 'email' }),
    ]);
    expect(updates[1][1]).toBe('required');

    await rows[0].findAll('input[type="text"]')[1].setValue('you@x.io');
    expect(wrapper.findAll('input[type="text"]')[1].element.value).toBe(
      'you@x.io'
    );
  });

  it('follows new fields and reports drags', async () => {
    const wrapper = mountFields(fields());
    const reordered = fields().reverse();
    await wrapper.setProps({ preChatFields: reordered });
    expect(wrapper.find('tr').text()).toContain('phone');
    const draggable = wrapper.findComponent(Draggable);
    draggable.vm.$emit('update:modelValue', fields());
    draggable.vm.$emit('end');
    expect(wrapper.emitted('dragEnd')[0][0][0].name).toBe('email');
  });
});
