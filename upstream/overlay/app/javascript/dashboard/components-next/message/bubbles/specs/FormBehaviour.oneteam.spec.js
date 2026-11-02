/**
 * OneTeam behaviour spec for the form (and option pick) message bubble.
 *
 * Covers the message text, the submitted form answers labelled by their
 * field (or a generic "response" label), a picked option, and the "no
 * response" note on website inboxes when nothing was submitted (nothing
 * elsewhere).
 */
import { ref } from 'vue';
import { mount } from '@vue/test-utils';
import FormBubble from '../Form.vue';

const env = vi.hoisted(() => ({}));

vi.mock('../../provider.js', () => ({
  useMessageContext: () => env.context,
}));
vi.mock('dashboard/composables/useInbox', async () => {
  const { computed } = await import('vue');
  return {
    useInbox: () => ({ isAWebWidgetInbox: computed(() => env.widget) }),
  };
});

const mountBubble = (contentType, contentAttributes, widget = true) => {
  env.widget = widget;
  env.context = {
    content: ref('Tell us more'),
    contentType: ref(contentType),
    contentAttributes: ref(contentAttributes),
  };
  return mount(FormBubble, {
    global: {
      directives: {
        dompurifyHtml: (el, binding) => {
          el.innerHTML = binding.value;
        },
      },
      stubs: { BaseBubble: { template: '<div><slot /></div>' } },
    },
  });
};

const pairs = wrapper =>
  wrapper
    .findAll('dt')
    .map((dt, i) => [dt.text(), wrapper.findAll('dd')[i].text()]);

describe('Form bubble behaviour', () => {
  it('lists submitted form answers', () => {
    const wrapper = mountBubble('form', {
      items: [{ name: 'email', label: 'Email' }],
      submittedValues: [
        { name: 'email', value: 'ann@acme.io' },
        { name: 'notes', value: 'Call me' },
      ],
    });
    expect(wrapper.find('span').attributes('title')).toBe('Tell us more');
    expect(pairs(wrapper)).toEqual([
      ['Email', 'ann@acme.io'],
      ['CONVERSATION.RESPONSE', 'Call me'],
    ]);
  });

  it('notes a missing response on website inboxes only', () => {
    expect(mountBubble('form', { items: [] }).text()).toContain(
      'CONVERSATION.NO_RESPONSE'
    );
    expect(mountBubble('form', { items: [] }, false).text()).not.toContain(
      'NO_RESPONSE'
    );
  });

  it('shows a picked option', () => {
    const wrapper = mountBubble('input_select', {
      submittedValues: [{ title: 'Sales', value: 'sales' }],
    });
    expect(pairs(wrapper)).toEqual([['CONVERSATION.RESPONSE', 'Sales']]);
    expect(mountBubble('input_select', {}).find('dl').exists()).toBe(false);
    expect(mountBubble('input_select', null).find('dl').exists()).toBe(false);
  });

  it('shows nothing extra for other content types', () => {
    expect(mountBubble('text', {}).find('dl').exists()).toBe(false);
  });
});
