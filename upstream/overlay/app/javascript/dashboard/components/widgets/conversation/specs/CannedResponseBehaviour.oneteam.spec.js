/**
 * OneTeam behaviour spec for the canned response picker in the editor.
 *
 * Covers loading canned responses on mount, listing them with resolved
 * variables and formatting stripped for the channel, searching by short
 * code or text (seeded from text already after the trigger), shortening
 * long snippets to the match, highlighting matches, the loading and
 * empty labels, the preview, and the replace, close and remove-trigger
 * events.
 */
import { ref } from 'vue';
import { mount } from '@vue/test-utils';
import {
  resolveVariablesInMessage,
  stripUnsupportedFormatting,
} from 'dashboard/helper/editorHelper';
import CannedResponse from '../CannedResponse.vue';

const env = vi.hoisted(() => ({}));

vi.mock('dashboard/composables/store', () => ({
  useStore: () => ({ dispatch: env.dispatch }),
  useMapGetter: name =>
    name === 'getCannedResponses' ? env.responses : env.uiFlags,
}));
vi.mock('dashboard/helper/editorHelper', () => ({
  resolveVariablesInMessage: vi.fn(),
  stripUnsupportedFormatting: vi.fn(),
}));
vi.mock('shared/composables/useMessageFormatter', () => ({
  useMessageFormatter: () => ({
    getPlainText: text => text.replace(/\*/g, ''),
    formatMessage: text => `<p>${text}</p>`,
    highlightContent: (text, term) => text.replace(term, `[${term}]`),
  }),
}));

const Picker = {
  name: 'CaretAnchoredPicker',
  props: [
    'search',
    'caretPosition',
    'items',
    'searchPlaceholder',
    'isLoading',
    'emptyLabel',
  ],
  emits: ['update:search', 'select', 'close', 'removeTrigger'],
  template:
    '<div><div v-for="item in items" :key="item.id" class="preview"><slot name="preview" :item="item" /></div><div class="none"><slot name="preview" :item="null" /></div></div>',
};

const longText = `${'Thanks for reaching out to us today. '.repeat(2)}Your refund is on its way`;

const mountPicker = (props = {}) => {
  env.dispatch = vi.fn();
  env.uiFlags = ref({ fetchingList: true });
  env.responses = ref([
    { id: 1, short_code: 'hello', content: 'Hi {{contact.name}}  *there*' },
    { id: 2, short_code: 'refund', content: longText },
  ]);
  resolveVariablesInMessage.mockImplementation((message, variables) =>
    message.replace('{{contact.name}}', variables.name || '')
  );
  stripUnsupportedFormatting.mockImplementation(message => message);
  return mount(CannedResponse, {
    props: { variables: { name: 'Ann' }, caretPosition: { top: 1 }, ...props },
    global: {
      stubs: { CaretAnchoredPicker: Picker },
      directives: {
        dompurifyHtml: (el, binding) => {
          el.innerHTML = binding.value;
        },
      },
    },
  });
};

const picker = wrapper => wrapper.findComponent(Picker);

describe('CannedResponse behaviour', () => {
  it('loads and lists canned responses with resolved content', () => {
    const wrapper = mountPicker({ schema: { name: 'email' } });
    expect(env.dispatch).toHaveBeenCalledWith('getCannedResponse');
    expect(stripUnsupportedFormatting).toHaveBeenCalledWith('Hi Ann  *there*', {
      name: 'email',
    });
    expect(picker(wrapper).props()).toMatchObject({
      search: '',
      caretPosition: { top: 1 },
      isLoading: true,
      searchPlaceholder: 'COMBOBOX.SEARCH_PLACEHOLDER',
      emptyLabel: 'COMBOBOX.EMPTY_STATE',
    });
    expect(picker(wrapper).props('items')[0]).toEqual({
      id: 1,
      content: 'Hi {{contact.name}}  *there*',
      resolved: 'Hi Ann  *there*',
      label: '/hello',
      title: '/hello',
      subtitle: 'Hi Ann there',
    });
    expect(wrapper.find('.preview div').element.innerHTML).toBe(
      '<p>Hi Ann  *there*</p>'
    );
    expect(wrapper.find('.none div').element.innerHTML).toBe('<p></p>');
  });

  it('searches, shortens snippets and highlights matches', async () => {
    const wrapper = mountPicker({ searchKey: 'refund' });
    expect(picker(wrapper).props('search')).toBe('refund');
    expect(picker(wrapper).props('emptyLabel')).toBe(
      'COMBOBOX.EMPTY_SEARCH_RESULTS'
    );
    const [item] = picker(wrapper).props('items');
    expect(item.title).toBe('/[refund]');
    const index = longText.indexOf('refund');
    expect(item.subtitle).toBe(
      `…${longText.slice(index - 24).replace('refund', '[refund]')}`
    );

    await picker(wrapper).vm.$emit('update:search', ' Hi ');
    const [hello] = picker(wrapper).props('items');
    expect(hello.label).toBe('/hello');
    expect(hello.subtitle).toBe('[Hi] Ann there');

    await picker(wrapper).vm.$emit('update:search', 'hello');
    expect(picker(wrapper).props('items')[0].subtitle).toBe('Hi Ann there');
  });

  it('passes selection, close and trigger removal up', async () => {
    const wrapper = mountPicker();
    const [first] = picker(wrapper).props('items');
    await picker(wrapper).vm.$emit('select', first);
    await picker(wrapper).vm.$emit('close');
    await picker(wrapper).vm.$emit('removeTrigger');
    expect(wrapper.emitted('replace')).toEqual([
      ['Hi {{contact.name}}  *there*'],
    ]);
    expect(wrapper.emitted('close')).toHaveLength(1);
    expect(wrapper.emitted('removeTrigger')).toHaveLength(1);
  });
});
