/**
 * OneTeam behaviour spec for the Captain playground run details.
 *
 * Covers tool events with every status label (including unknown ones),
 * missing arguments and result previews, handoffs with missing ends,
 * attached temporary knowledge, temporary handlers, and runs without
 * events.
 */
import { mount } from '@vue/test-utils';
import PlaygroundRunDetails from '../PlaygroundRunDetails.vue';

vi.mock('vue-i18n', async importOriginal => ({
  ...(await importOriginal()),
  useI18n: () => ({
    t: (key, params) =>
      params?.from !== undefined || params?.to !== undefined
        ? `${key}:${params.from}>${params.to}`
        : key,
  }),
}));

const summary = { scenarioCount: 1, guidelineCount: 1, guardrailCount: 2 };
const mountDetails = runDetails =>
  mount(PlaygroundRunDetails, {
    props: { runDetails, setupSummary: summary },
  });

describe('PlaygroundRunDetails behaviour', () => {
  it('lists tool events with every status and handoffs', () => {
    const wrapper = mountDetails({
      duration_ms: 10,
      handler: { title: 'Bot', temporary: true },
      temporary_knowledge_attached: true,
      events: [
        { type: 'tool', name: 'a', status: 'running', arguments: { q: 1 } },
        { type: 'tool', name: 'b', status: 'completed', result_preview: 'ok' },
        { type: 'tool', name: 'c', status: 'failed' },
        { type: 'tool', name: 'd', status: 'queued' },
        { type: 'handoff', from: { title: 'A' }, to: { title: 'B' } },
        { type: 'handoff' },
      ],
    });
    const items = wrapper.findAll('li');
    expect(items[0].text()).toContain('STATUS.RUNNING');
    expect(items[0].find('pre').text()).toContain('"q": 1');
    expect(items[1].text()).toContain('STATUS.COMPLETED');
    expect(items[1].text()).toContain('ok');
    expect(items[2].text()).toContain('STATUS.FAILED');
    expect(items[2].find('pre').text()).toBe('{}');
    expect(items[3].text()).toContain('queued');
    expect(items[4].text()).toContain('HANDOFF:A>B');
    expect(items[5].text()).toBe('CAPTAIN.PLAYGROUND.RUN_DETAILS.HANDOFF');
    expect(wrapper.text()).toContain('KNOWLEDGE_ATTACHED');
    expect(wrapper.text()).toContain('CAPTAIN.PLAYGROUND.SETUP.TEMPORARY');
  });

  it('shows a run without handler or events', () => {
    const wrapper = mountDetails({ duration_ms: 5 });
    expect(wrapper.text()).toContain('NO_EVENTS');
    expect(wrapper.text()).not.toContain('KNOWLEDGE_ATTACHED');
    expect(wrapper.text()).not.toContain('SETUP.TEMPORARY');
  });
});
