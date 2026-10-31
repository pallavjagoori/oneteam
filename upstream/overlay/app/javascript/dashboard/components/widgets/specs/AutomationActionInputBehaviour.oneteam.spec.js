/**
 * OneTeam behaviour spec for one automation/macro action row.
 *
 * Covers the action picker (options, current selection, changing the
 * action resets it), the value input for each input type, hiding the input,
 * the remove button (hidden for macros), the email input with the "insert
 * contact email" token, the team message and textarea editors, and the
 * error message.
 */
import { mount } from '@vue/test-utils';
import AutomationActionInput from '../AutomationActionInput.vue';

const field = (name, props = []) => ({
  name,
  props: ['modelValue', ...props],
  emits: ['update:modelValue'],
  template: `<div class="${name}" />`,
});
const stubs = {
  SingleSelect: field('SingleSelect', ['options', 'disableDeselect']),
  MultiSelect: field('MultiSelect', ['options']),
  NextInput: field('NextInput', ['type', 'placeholder']),
  AutomationActionFileInput: field('AutomationActionFileInput', [
    'initialFileName',
  ]),
  AutomationActionTeamMessageInput: field('AutomationActionTeamMessageInput', [
    'teams',
  ]),
  WootMessageEditor: field('WootMessageEditor'),
  NextButton: {
    name: 'NextButton',
    props: ['label', 'icon'],
    emits: ['click'],
    template:
      '<button :data-icon="icon" @click="$emit(\'click\')">{{ label }}</button>',
  },
};

const actionTypes = [
  {
    key: 'assign_team',
    label: 'Assign team',
    inputType: 'search_select',
    icon: 'i-team',
  },
  { key: 'add_label', label: 'Add label', inputType: 'multi_select' },
  { key: 'webhook', label: 'Webhook', inputType: 'url' },
  { key: 'attach', label: 'Attach', inputType: 'attachment' },
  { key: 'send_email', label: 'Email', inputType: 'email' },
  { key: 'team_message', label: 'Team message', inputType: 'team_message' },
  { key: 'send_message', label: 'Message', inputType: 'textarea' },
  { key: 'resolve', label: 'Resolve', inputType: null },
];

const mountInput = (actionName, props = {}) =>
  mount(AutomationActionInput, {
    props: {
      actionTypes,
      dropdownValues: [{ id: 1, name: 'Sales' }],
      modelValue: { action_name: actionName, action_params: [] },
      ...props,
    },
    global: { stubs },
  });
const picker = wrapper =>
  wrapper.findAllComponents({ name: 'SingleSelect' })[0];
const has = (wrapper, name) => wrapper.findComponent({ name }).exists();
const last = (wrapper, event = 'update:modelValue') =>
  wrapper.emitted(event).at(-1)[0];

describe('AutomationActionInput behaviour', () => {
  it('lists actions and shows the current one', () => {
    const wrapper = mountInput('assign_team');
    expect(picker(wrapper).props('options')[0]).toEqual({
      id: 'assign_team',
      name: 'Assign team',
      icon: 'i-team',
    });
    expect(picker(wrapper).props('modelValue')).toEqual({
      id: 'assign_team',
      name: 'Assign team',
    });
    expect(picker(wrapper).props('disableDeselect')).toBe('');
  });

  it('changes the action and asks for a reset', async () => {
    const wrapper = mountInput('assign_team');
    await picker(wrapper).vm.$emit('update:modelValue', { id: 'add_label' });
    expect(last(wrapper)).toEqual({
      action_name: 'add_label',
      action_params: [],
    });
    expect(last(wrapper, 'input')).toEqual({
      action_name: 'add_label',
      action_params: [],
    });
    expect(wrapper.emitted('resetAction')).toHaveLength(1);
    await picker(wrapper).vm.$emit('update:modelValue', 'resolve');
    expect(last(wrapper).action_name).toBe('resolve');
  });

  it('handles a missing or unknown model', () => {
    const unknown = mount(AutomationActionInput, {
      props: {
        actionTypes: [...actionTypes, { key: 'x', inputType: 'url' }],
        modelValue: { action_name: 'x' },
      },
      global: { stubs },
    });
    expect(picker(unknown).props('modelValue')).toEqual({
      id: 'x',
      name: undefined,
    });

    // The template needs a listed action, so read the computeds directly.
    const { computed } = AutomationActionInput;
    const emit = vi.fn();
    const empty = { modelValue: null, $emit: emit };
    expect(computed.action_name.get.call(empty)).toBeNull();
    expect(computed.action_params.get.call(empty)).toBeNull();
    expect(
      computed.actionNameAsSelectModel.get.call({ action_name: null })
    ).toBeNull();
    expect(
      computed.actionNameAsSelectModel.get.call({
        action_name: 'gone',
        actionTypes,
      })
    ).toBeNull();
    computed.action_name.set.call(empty, 'webhook');
    expect(emit).toHaveBeenCalledWith('update:modelValue', {
      action_name: 'webhook',
    });
    computed.action_params.set.call(empty, ['a']);
    expect(emit).toHaveBeenCalledWith('input', { action_params: ['a'] });
  });

  it('picks the input for each action type', async () => {
    const team = mountInput('assign_team');
    expect(
      team.findAllComponents({ name: 'SingleSelect' })[1].props('options')
    ).toEqual([{ id: 1, name: 'Sales' }]);
    await team
      .findAllComponents({ name: 'SingleSelect' })[1]
      .vm.$emit('update:modelValue', { id: 1 });
    expect(last(team)).toEqual({
      action_name: 'assign_team',
      action_params: { id: 1 },
    });
    expect(has(mountInput('add_label'), 'MultiSelect')).toBe(true);
    expect(
      mountInput('webhook').findComponent({ name: 'NextInput' }).props('type')
    ).toBe('url');
    expect(
      mountInput('attach', { initialFileName: 'a.pdf' })
        .findComponent({ name: 'AutomationActionFileInput' })
        .props('initialFileName')
    ).toBe('a.pdf');
    expect(
      mountInput('team_message')
        .findComponent({ name: 'AutomationActionTeamMessageInput' })
        .props('teams')
    ).toEqual([{ id: 1, name: 'Sales' }]);
    const resolve = mountInput('resolve');
    [
      'MultiSelect',
      'NextInput',
      'AutomationActionFileInput',
      'WootMessageEditor',
    ].forEach(name => {
      expect(has(resolve, name)).toBe(false);
    });
  });

  it('hides the inline input when asked', () => {
    expect(
      has(mountInput('webhook', { showActionInput: false }), 'NextInput')
    ).toBe(false);
  });

  it('edits textarea messages through the first param', async () => {
    const wrapper = mountInput('send_message', {
      modelValue: { action_name: 'send_message', action_params: ['Hello'] },
    });
    const editor = wrapper.findComponent({ name: 'WootMessageEditor' });
    expect(editor.props('modelValue')).toBe('Hello');
    await editor.vm.$emit('update:modelValue', 'Hi');
    expect(last(wrapper).action_params).toBe('Hi');
    await wrapper.setProps({
      modelValue: { action_name: 'send_message', action_params: 'Plain' },
    });
    expect(editor.props('modelValue')).toBe('Plain');
  });

  it('removes actions except in macros', async () => {
    const wrapper = mountInput('resolve');
    await wrapper.find('button[data-icon="i-lucide-trash"]').trigger('click');
    expect(wrapper.emitted('removeAction')).toHaveLength(1);
    expect(
      mountInput('resolve', { isMacro: true }).find('button').exists()
    ).toBe(false);
  });

  it('inserts the contact email token once', async () => {
    const email = params =>
      mountInput('send_email', {
        modelValue: { action_name: 'send_email', action_params: params },
      });
    const insert = wrapper =>
      wrapper.find('button:not([data-icon])').trigger('click');

    let wrapper = email(['a@x.com, , b@x.com']);
    expect(wrapper.findComponent({ name: 'NextInput' }).props('type')).toBe(
      'text'
    );
    await insert(wrapper);
    expect(last(wrapper).action_params).toEqual([
      'a@x.com,b@x.com,{{contact.email}}',
    ]);

    wrapper = email(null);
    await insert(wrapper);
    expect(last(wrapper).action_params).toEqual(['{{contact.email}}']);

    wrapper = email(['a@x.com, {{contact. email}}']);
    await insert(wrapper);
    expect(wrapper.emitted('update:modelValue')).toBeUndefined();
  });

  it('shows the error message', () => {
    const wrapper = mountInput('resolve', { errorMessage: 'Pick a value' });
    expect(wrapper.find('span').text()).toBe('Pick a value');
    expect(wrapper.find('div').classes()).toContain('animate-wiggle');
  });
});
