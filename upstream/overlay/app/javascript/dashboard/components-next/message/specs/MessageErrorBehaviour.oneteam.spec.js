/**
 * OneTeam behaviour spec for the failed message notice.
 *
 * Covers the error tooltip placement for each orientation, retrying a
 * failed message, disabling retry while it resends, and hiding retry for
 * old or empty messages.
 */
import { ref } from 'vue';
import { mount } from '@vue/test-utils';
import MessageError from '../MessageError.vue';

const env = vi.hoisted(() => ({ ctx: null, old: false }));

vi.mock('../provider.js', () => ({ useMessageContext: () => env.ctx }));
vi.mock('vue-i18n', async importOriginal => ({
  ...(await importOriginal()),
  useI18n: () => ({ t: key => key }),
}));
vi.mock('shared/helpers/timeHelper', async importOriginal => ({
  ...(await importOriginal()),
  hasOneDayPassed: () => env.old,
}));

/**
 * Mounts the notice for a message context.
 *
 * @param {object} ctx Message context values.
 * @returns {import('@vue/test-utils').VueWrapper} The mounted wrapper.
 */
const mountError = ctx => {
  env.ctx = {
    orientation: ref('left'),
    status: ref('failed'),
    createdAt: ref(1),
    content: ref('Hi'),
    attachments: ref([]),
    ...Object.fromEntries(Object.entries(ctx).map(([k, v]) => [k, ref(v)])),
  };
  return mount(MessageError, {
    props: { error: 'Rate limited' },
    global: { stubs: { Icon: true } },
  });
};

describe('MessageError behaviour', () => {
  beforeEach(() => {
    env.old = false;
  });

  it('retries a failed message', async () => {
    const wrapper = mountError({});
    expect(wrapper.text()).toContain('CHAT_LIST.FAILED_TO_SEND');
    expect(wrapper.get('.absolute').classes()).toContain('ltr:left-0');
    const button = wrapper.get('button');
    expect(button.attributes('disabled')).toBeUndefined();
    await button.trigger('click');
    expect(wrapper.emitted('retry')).toHaveLength(1);
  });

  it('disables retry while resending and places the tip right', () => {
    const wrapper = mountError({
      orientation: 'right',
      status: 'progress',
      content: null,
      attachments: [{ id: 1 }],
    });
    expect(wrapper.get('.absolute').classes()).toContain('ltr:right-0');
    expect(wrapper.get('button').attributes('disabled')).toBeDefined();
  });

  it('hides retry for old or empty messages', () => {
    expect(
      mountError({ content: null, attachments: null }).find('button').exists()
    ).toBe(false);
    env.old = true;
    expect(mountError({}).find('button').exists()).toBe(false);
  });
});
