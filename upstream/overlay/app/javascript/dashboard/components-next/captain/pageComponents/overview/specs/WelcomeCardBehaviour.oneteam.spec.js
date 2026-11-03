/**
 * OneTeam behaviour spec for the Captain overview welcome card.
 *
 * Covers hiding without stats, the loading skeleton, rendering the model
 * summary, empty and failed summaries, refetching on range changes, and
 * ignoring a slow response for a superseded request.
 */
import { flushPromises, mount } from '@vue/test-utils';
import WelcomeCard from '../WelcomeCard.vue';

const env = vi.hoisted(() => ({ getSummary: vi.fn() }));

vi.mock('vue-router', async importOriginal => ({
  ...(await importOriginal()),
  useRoute: () => ({ params: { assistantId: '9' } }),
}));
vi.mock('dashboard/api/captain/assistant', () => ({
  default: { getSummary: (...args) => env.getSummary(...args) },
}));

const mountCard = props =>
  mount(WelcomeCard, {
    props,
    global: {
      directives: {
        'dompurify-html': (el, { value }) => {
          el.innerHTML = value;
        },
      },
    },
  });

const deferred = () => {
  let resolve;
  const promise = new Promise(res => {
    resolve = res;
  });
  return { promise, resolve };
};

describe('WelcomeCard behaviour', () => {
  beforeEach(() => {
    env.getSummary = vi.fn();
  });

  it('stays hidden without stats', () => {
    const wrapper = mountCard();
    expect(wrapper.html()).not.toContain('sparkles');
    expect(env.getSummary).not.toHaveBeenCalled();
  });

  it('loads and renders the summary', async () => {
    env.getSummary.mockResolvedValueOnce({
      data: { message: 'You resolved **12** chats' },
    });
    const wrapper = mountCard({ stats: { resolved: 12 } });
    expect(wrapper.find('.animate-pulse').exists()).toBe(true);
    await flushPromises();
    expect(env.getSummary).toHaveBeenCalledWith({
      assistantId: '9',
      range: '7',
      stats: { resolved: 12 },
    });
    expect(wrapper.find('strong').text()).toBe('12');

    env.getSummary.mockResolvedValueOnce({ data: {} });
    await wrapper.setProps({ range: '30' });
    await flushPromises();
    expect(wrapper.html()).not.toContain('sparkles');

    env.getSummary.mockRejectedValueOnce(new Error('down'));
    await wrapper.setProps({ range: '90' });
    await flushPromises();
    expect(wrapper.html()).not.toContain('sparkles');

    await wrapper.setProps({ stats: null });
    expect(wrapper.html()).not.toContain('sparkles');
  });

  it('ignores superseded responses', async () => {
    const slow = deferred();
    env.getSummary
      .mockReturnValueOnce(slow.promise)
      .mockResolvedValueOnce({ data: { message: 'Fresh' } });
    const wrapper = mountCard({ stats: { a: 1 } });
    await wrapper.setProps({ range: '30' });
    await flushPromises();
    slow.resolve({ data: { message: 'Stale' } });
    await flushPromises();
    expect(wrapper.text()).toContain('Fresh');
    expect(wrapper.text()).not.toContain('Stale');
  });
});
