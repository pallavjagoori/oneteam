/**
 * OneTeam behaviour spec for the chat options (select) bubble.
 *
 * Covers rendering one option per entry with the selected one marked,
 * forwarding the chosen option, hiding the list, and the defaults.
 */
import { mount } from '@vue/test-utils';
import ChatOptions from '../ChatOptions.vue';

const ChatOption = {
  name: 'ChatOption',
  props: ['action', 'isSelected'],
  emits: ['optionSelect'],
  template: '<li class="option" />',
};

/**
 * Mounts the bubble with a stubbed option and sanitiser directive.
 *
 * @param {object} props Component props.
 * @returns {import('@vue/test-utils').VueWrapper} The mounted wrapper.
 */
const mountOptions = props =>
  mount(ChatOptions, {
    props,
    global: {
      stubs: { ChatOption },
      directives: { dompurifyHtml: {} },
    },
  });

describe('ChatOptions behaviour', () => {
  const options = [
    { id: 'a', title: 'A' },
    { id: 'b', title: 'B' },
  ];

  it('marks the selected option and forwards a choice', () => {
    const wrapper = mountOptions({ title: 'Pick', options, selected: 'b' });
    const items = wrapper.findAllComponents(ChatOption);
    expect(items.map(i => i.props('isSelected'))).toEqual([false, true]);
    items[0].vm.$emit('optionSelect', options[0]);
    expect(wrapper.emitted('optionSelect')).toEqual([[options[0]]]);
  });

  it('hides the list when fields are hidden', () => {
    const wrapper = mountOptions({ options, hideFields: true });
    expect(wrapper.find('ul').exists()).toBe(false);
  });

  it('defaults to no options', () => {
    const wrapper = mountOptions({});
    expect(wrapper.findAllComponents(ChatOption)).toHaveLength(0);
    expect(ChatOptions.props.options.default()).toEqual([]);
  });
});
