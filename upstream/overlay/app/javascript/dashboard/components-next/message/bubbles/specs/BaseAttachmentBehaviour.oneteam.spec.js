/**
 * OneTeam behaviour spec for the message BaseAttachment bubble.
 *
 * Covers the sender line, title and content, link actions and button
 * actions, and the action validator.
 */
import { mount } from '@vue/test-utils';
import BaseAttachment from '../BaseAttachment.vue';

const env = vi.hoisted(() => ({ sender: null }));

vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: (key, params) => `${key}:${params.sender}` }),
}));
vi.mock('../../provider.js', () => ({
  useMessageContext: () => ({ sender: env.sender }),
}));

/**
 * Mounts the bubble.
 *
 * @param {object} props component props
 * @returns {import('@vue/test-utils').VueWrapper}
 */
const mountBubble = props =>
  mount(BaseAttachment, {
    props: {
      icon: 'i-lucide-file',
      senderTranslationKey: 'SENT',
      content: '',
      action: { label: 'Open', href: 'https://x.co' },
      ...props,
    },
    global: {
      stubs: {
        BaseBubble: { template: '<div><slot /></div>' },
        Icon: true,
      },
    },
  });

describe('BaseAttachment behaviour', () => {
  it('shows the sender, title, content and a link action', () => {
    env.sender = { value: { name: 'Ann' } };
    const wrapper = mountBubble({ title: 'Doc', content: 'About' });
    expect(wrapper.text()).toContain('SENT:Ann');
    expect(wrapper.text()).toContain('Doc');
    expect(wrapper.text()).toContain('About');
    expect(wrapper.find('a').attributes('href')).toBe('https://x.co');
  });

  it('hides the sender without a name and runs a button action', async () => {
    env.sender = undefined;
    const onClick = vi.fn();
    const wrapper = mountBubble({ action: { label: 'Go', onClick } });
    expect(wrapper.text()).toBe('Go');
    await wrapper.find('button').trigger('click');
    expect(onClick).toHaveBeenCalled();
  });

  it('renders no action area without an action', () => {
    env.sender = undefined;
    const wrapper = mountBubble({ action: null, content: 'Body' });
    expect(wrapper.find('.mb-2').exists()).toBe(false);
  });

  it('validates that an action has a label and a target', () => {
    const { validator } = BaseAttachment.props.action;
    expect(validator({ label: 'A', href: '/x' })).toBeTruthy();
    expect(validator({ label: 'A' })).toBeFalsy();
  });
});
