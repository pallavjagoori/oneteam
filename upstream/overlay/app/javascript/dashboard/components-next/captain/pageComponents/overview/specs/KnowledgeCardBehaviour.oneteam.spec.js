/**
 * OneTeam behaviour spec for the Captain overview knowledge card.
 *
 * Covers the coverage bar, the approved, suggestions and documents links
 * for the current assistant, and the default stats.
 */
import { mount } from '@vue/test-utils';
import KnowledgeCard from '../KnowledgeCard.vue';

vi.mock('vue-router', async importOriginal => ({
  ...(await importOriginal()),
  useRoute: () => ({ params: { accountId: 1, assistantId: 2 } }),
}));
vi.mock('vue-i18n', async importOriginal => ({
  ...(await importOriginal()),
  useI18n: () => ({ t: key => key }),
}));

const RouterLink = {
  name: 'RouterLink',
  props: ['to'],
  template: '<a><slot /></a>',
};

/**
 * Mounts the card.
 *
 * @param {object} [knowledge] Knowledge stats.
 * @returns {import('@vue/test-utils').VueWrapper} The mounted wrapper.
 */
const mountCard = knowledge =>
  mount(KnowledgeCard, {
    props: knowledge ? { knowledge } : {},
    global: {
      stubs: { RouterLink },
      mocks: { $t: (key, args) => (args ? `${key}:${args.pct}` : key) },
    },
  });

describe('KnowledgeCard behaviour', () => {
  it('links each stat and fills the coverage bar', () => {
    const wrapper = mountCard({
      approved: 12,
      suggestions: 4,
      documents: 3,
      coverage: 60,
    });
    expect(wrapper.text()).toContain('CAPTAIN.OVERVIEW.KNOWLEDGE.COVERAGE:60');
    expect(wrapper.get('.bg-n-brand').attributes('style')).toContain(
      'width: 60%'
    );
    const links = wrapper.findAllComponents(RouterLink);
    expect(links.map(l => l.props('to').name)).toEqual([
      'captain_assistants_responses_index',
      'captain_assistants_faq_suggestions',
      'captain_assistants_documents_index',
    ]);
    expect(links[0].props('to').params).toEqual({
      accountId: 1,
      assistantId: 2,
    });
    expect(links.map(l => l.text().replace(/\s+/g, ''))).toEqual([
      '12CAPTAIN.OVERVIEW.KNOWLEDGE.APPROVED',
      '4CAPTAIN.OVERVIEW.KNOWLEDGE.SUGGESTIONS',
      '3CAPTAIN.OVERVIEW.KNOWLEDGE.DOCUMENTS',
    ]);
  });

  it('defaults to zero and treats missing coverage as zero', () => {
    expect(mountCard().text()).toContain('COVERAGE:0');
    expect(mountCard({ approved: 1 }).text()).toContain('COVERAGE:0');
  });
});
