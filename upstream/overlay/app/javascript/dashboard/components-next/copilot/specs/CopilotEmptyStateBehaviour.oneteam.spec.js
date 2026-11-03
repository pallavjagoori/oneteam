/**
 * OneTeam behaviour spec for the Copilot empty state.
 *
 * Covers the dashboard prompts (also used on other pages), sending a
 * plain prompt, hiding the reply suggestion when it can't be used, and
 * the add-assistant link when there are no assistants.
 */
import { mount } from '@vue/test-utils';
import CopilotEmptyState from '../CopilotEmptyState.vue';

const route = vi.hoisted(() => ({ path: '', params: { accountId: 3 } }));

vi.mock('vue-router', async importOriginal => ({
  ...(await importOriginal()),
  useRoute: () => route,
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
 * Mounts the empty state on a path.
 *
 * @param {string} path Current route path.
 * @param {object} props Component props.
 * @returns {import('@vue/test-utils').VueWrapper} The mounted wrapper.
 */
const mountState = (path, props) => {
  route.path = path;
  return mount(CopilotEmptyState, {
    props,
    global: {
      stubs: { RouterLink, Icon: true },
      mocks: { $t: key => key },
    },
  });
};

describe('CopilotEmptyState behaviour', () => {
  it.each(['/app/accounts/3/dashboard', '/app/accounts/3/contacts'])(
    'offers the dashboard prompts on %s',
    async path => {
      const wrapper = mountState(path, { hasAssistants: true });
      const buttons = wrapper.findAll('button');
      expect(buttons.map(b => b.text())).toEqual([
        'CAPTAIN.COPILOT.PROMPTS.HIGH_PRIORITY.LABEL',
        'CAPTAIN.COPILOT.PROMPTS.LIST_CONTACTS.LABEL',
      ]);
      await buttons[0].trigger('click');
      expect(wrapper.emitted('useSuggestion')).toEqual([
        ['CAPTAIN.COPILOT.PROMPTS.HIGH_PRIORITY.CONTENT'],
      ]);
    }
  );

  it('hides the reply suggestion when it cannot be used', () => {
    const wrapper = mountState('/app/accounts/3/conversations/1', {
      hasAssistants: true,
      canSuggestReply: false,
    });
    expect(wrapper.findAll('button')).toHaveLength(2);
  });

  it('sends the reply suggestion with its request type', async () => {
    const wrapper = mountState('/app/accounts/3/conversations/1', {
      hasAssistants: true,
    });
    await wrapper.findAll('button')[1].trigger('click');
    expect(wrapper.emitted('useSuggestion')).toEqual([
      [
        {
          message: 'CAPTAIN.COPILOT.PROMPTS.SUGGEST.CONTENT',
          requestType: 'reply_suggestion',
        },
      ],
    ]);
  });

  it('links to create an assistant when there are none', () => {
    const wrapper = mountState('/app/accounts/3/dashboard');
    expect(wrapper.find('button').exists()).toBe(false);
    expect(wrapper.text()).toContain(
      'CAPTAIN.ASSISTANTS.NO_ASSISTANTS_AVAILABLE'
    );
    expect(wrapper.getComponent(RouterLink).props('to')).toEqual({
      name: 'captain_assistants_create_index',
      params: { accountId: 3 },
    });
  });
});
