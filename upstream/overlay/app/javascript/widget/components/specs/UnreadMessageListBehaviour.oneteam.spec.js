/**
 * OneTeam behaviour spec for the widget's unread message bubbles.
 *
 * Covers listing unread messages (sender shown on the first only, text
 * or an attachment marker, translating and auto-translated flags,
 * campaign id), the first message's sender, closing the bubbles,
 * opening the conversation, and the "view messages" button colour on
 * light and dark widget colours.
 */
import { mount } from '@vue/test-utils';
import { createStore } from 'vuex';
import { emitter } from 'shared/helpers/mitt';
import { ON_UNREAD_MESSAGE_CLICK } from 'widget/constants/widgetBusEvents';
import UnreadMessageList from '../UnreadMessageList.vue';

const UnreadMessage = {
  name: 'UnreadMessage',
  props: {
    messageId: Number,
    showSender: Boolean,
    sender: Object,
    message: String,
    translating: Boolean,
    translated: Boolean,
    campaignId: Number,
  },
  template: '<p class="unread">{{ message }}</p>',
};

const messages = [
  {
    id: 1,
    content: 'Hi there',
    sender: { name: 'Bo', type: 'user' },
    content_attributes: {
      source_language: 'fr',
      translations: { en: 'Hi there' },
    },
    campaignId: 4,
  },
  {
    id: 2,
    attachments: [{ id: 1 }],
    content_attributes: { translation_pending: true },
  },
  { id: 3, content: '' },
];

const mountList = (list = messages, { count = 2, color = '#000000' } = {}) => {
  const store = createStore({
    getters: {
      'conversation/getUnreadMessageCount': () => count,
      'appConfig/getWidgetColor': () => color,
    },
  });
  return mount(UnreadMessageList, {
    props: { messages: list },
    global: {
      plugins: [store],
      stubs: { UnreadMessage, FluentIcon: true },
    },
  });
};

const items = wrapper => wrapper.findAllComponents(UnreadMessage);

describe('UnreadMessageList behaviour', () => {
  it('lists the unread messages', () => {
    const wrapper = mountList();
    expect(
      items(wrapper).map(i => [
        i.props('message'),
        i.props('showSender'),
        i.props('translating'),
        i.props('translated'),
      ])
    ).toEqual([
      ['Hi there', true, false, true],
      ['📑', false, true, false],
      ['', false, false, false],
    ]);
    expect(items(wrapper)[0].props('campaignId')).toBe(4);
    expect(wrapper.vm.sender).toEqual({ name: 'Bo', type: 'user' });
    expect(mountList([{ id: 9, content: 'x' }]).vm.sender).toEqual({});
  });

  it('closes or opens the conversation', async () => {
    const onOpen = vi.fn();
    emitter.on(ON_UNREAD_MESSAGE_CLICK, onOpen);
    const wrapper = mountList();
    await wrapper.find('.close-unread-button').trigger('click');
    expect(wrapper.emitted('close')).toHaveLength(1);
    await wrapper.find('.clear-button').trigger('click');
    expect(onOpen).toHaveBeenCalledTimes(1);
    emitter.off(ON_UNREAD_MESSAGE_CLICK, onOpen);
  });

  it('colours the view button for light and dark widget colours', () => {
    const dark = mountList(messages, { color: '#000000' });
    const label = dark.find('.clear-button span');
    expect(label.element.style.color).toBe('rgb(0, 0, 0)');
    expect(label.classes()).not.toContain('!text-n-slate-12');

    const light = mountList(messages, { color: '#ffffff' });
    expect(light.find('.clear-button span').classes()).toContain(
      '!text-n-slate-12'
    );
  });

  it('hides the view button without unread messages', () => {
    expect(
      mountList(messages, { count: 0 }).find('.clear-button').exists()
    ).toBe(false);
  });
});
