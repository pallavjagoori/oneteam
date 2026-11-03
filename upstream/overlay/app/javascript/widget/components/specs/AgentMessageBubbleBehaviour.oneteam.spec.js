/**
 * OneTeam behaviour spec for the widget's agent message bubble.
 *
 * Covers plain text, switching between a translation and the original,
 * the email request and integration templates, choosing an option,
 * submitting a form (and hiding a submitted one), cards, articles, and
 * the satisfaction survey.
 */
import { mount } from '@vue/test-utils';
import AgentMessageBubble from '../AgentMessageBubble.vue';

const named = (name, props, template = '<div />') => ({
  name,
  props,
  template,
});
const ChatOptions = named(
  'ChatOptions',
  ['title', 'options', 'hideFields'],
  '<div class="options" />'
);
const ChatForm = named(
  'ChatForm',
  ['items', 'buttonLabel'],
  '<form class="chat-form" />'
);
const ChatCard = named(
  'ChatCard',
  ['title'],
  '<div class="card">{{ title }}</div>'
);

const mountBubble = (props, dispatch = vi.fn()) =>
  mount(AgentMessageBubble, {
    props: { messageId: 7, ...props },
    global: {
      mocks: { $store: { dispatch } },
      directives: {
        'dompurify-html': (el, { value }) => {
          el.innerHTML = value;
        },
      },
      stubs: {
        TranslatingContent: named(
          'TranslatingContent',
          ['translating', 'translated'],
          '<div class="tc"><slot /></div>'
        ),
        EmailInput: named('EmailInput', ['messageId'], '<i class="email" />'),
        IntegrationCard: named(
          'IntegrationCard',
          ['meetingData'],
          '<i class="integration" />'
        ),
        ChatOptions,
        ChatForm,
        ChatCard,
        ChatArticle: named('ChatArticle', ['items'], '<i class="article" />'),
        CustomerSatisfaction: named(
          'CustomerSatisfaction',
          ['displayType', 'messageContentAttributes'],
          '<i class="csat" />'
        ),
      },
    },
  });

describe('AgentMessageBubble behaviour', () => {
  it('shows text and toggles between translation and original', async () => {
    expect(
      mountBubble({ message: 'Hello' }).find('.message-content').text()
    ).toBe('Hello');

    const wrapper = mountBubble({
      message: 'Hola',
      translated: true,
      messageContentAttributes: { translations: { en: 'Hello' } },
    });
    const button = wrapper.find('button');
    expect(button.text()).toBe('VIEW_ORIGINAL');
    await button.trigger('click');
    expect(wrapper.find('.message-content').text()).toBe('Hello');
    expect(wrapper.find('button').text()).toBe('VIEW_TRANSLATION');

    const translating = mountBubble({
      message: 'Hola',
      translated: true,
      translating: true,
      messageContentAttributes: { translations: { en: 'Hello' } },
    });
    expect(translating.find('button').exists()).toBe(false);
    expect(
      mountBubble({
        message: 'Hi',
        translated: true,
        messageContentAttributes: {},
      })
        .find('button')
        .exists()
    ).toBe(false);
  });

  it('shows the email request and integration templates', () => {
    expect(
      mountBubble({ contentType: 'input_email', messageContentAttributes: {} })
        .find('.email')
        .exists()
    ).toBe(true);
    const integration = mountBubble({
      contentType: 'integrations',
      messageContentAttributes: { data: { url: 'https://meet' } },
    });
    expect(
      integration
        .findComponent({ name: 'IntegrationCard' })
        .props('meetingData')
    ).toEqual({ url: 'https://meet' });
  });

  it('sends a chosen option', async () => {
    const dispatch = vi.fn();
    const wrapper = mountBubble(
      {
        contentType: 'input_select',
        message: 'Pick one',
        messageContentAttributes: {
          items: [{ title: 'A' }],
          submitted_values: [],
        },
      },
      dispatch
    );
    expect(wrapper.find('.chat-bubble').exists()).toBe(false);
    const options = wrapper.findComponent(ChatOptions);
    expect(options.props()).toMatchObject({
      title: 'Pick one',
      hideFields: true,
    });
    await options.vm.$emit('optionSelect', { title: 'A' });
    expect(dispatch).toHaveBeenCalledWith('message/update', {
      submittedValues: [{ title: 'A' }],
      messageId: 7,
    });
  });

  it('submits a form and hides a submitted one', async () => {
    const dispatch = vi.fn();
    const wrapper = mountBubble(
      {
        contentType: 'form',
        messageContentAttributes: { items: [], button_label: 'Send' },
      },
      dispatch
    );
    await wrapper.findComponent(ChatForm).vm.$emit('submit', {
      email: 'a@b.c',
      plan: 'pro',
    });
    expect(dispatch).toHaveBeenCalledWith('message/update', {
      submittedValues: [
        { name: 'email', value: 'a@b.c' },
        { name: 'plan', value: 'pro' },
      ],
      messageId: 7,
    });
    expect(
      mountBubble({
        contentType: 'form',
        messageContentAttributes: { submitted_values: [{}] },
      })
        .find('.chat-form')
        .exists()
    ).toBe(false);
  });

  it('shows cards, articles and the satisfaction survey', () => {
    const cards = mountBubble({
      contentType: 'cards',
      messageContentAttributes: {
        items: [{ title: 'Plan A' }, { title: 'Plan B' }],
      },
    });
    expect(cards.findAll('.card').map(c => c.text())).toEqual([
      'Plan A',
      'Plan B',
    ]);
    expect(
      mountBubble({
        contentType: 'article',
        messageContentAttributes: { items: [] },
      })
        .find('.article')
        .exists()
    ).toBe(true);
    const csat = mountBubble({
      contentType: 'input_csat',
      messageContentAttributes: { display_type: 'star' },
    });
    expect(
      csat.findComponent({ name: 'CustomerSatisfaction' }).props('displayType')
    ).toBe('star');
    expect(csat.find('.chat-bubble').exists()).toBe(false);
  });

  it('flags template messages and has no default content attributes', () => {
    // isTemplate is not used by the template, so read it directly.
    expect(mountBubble({ messageType: 3, message: 'x' }).vm.isTemplate).toBe(
      true
    );
    expect(mountBubble({ messageType: 1, message: 'x' }).vm.isTemplate).toBe(
      false
    );
    expect(
      AgentMessageBubble.props.messageContentAttributes.default()
    ).toBeUndefined();
  });
});
