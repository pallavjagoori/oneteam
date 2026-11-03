/**
 * OneTeam behaviour spec for the Captain assistant playground page.
 */
import { mount } from '@vue/test-utils';
import PlaygroundIndex from '../Index.vue';

vi.mock('vue-router', async importOriginal => ({
  ...(await importOriginal()),
  useRoute: () => ({ params: { assistantId: '6' } }),
}));

const PageLayout = {
  name: 'PageLayout',
  props: {
    showAssistantSwitcher: Boolean,
    showPaginationFooter: Boolean,
    showKnowMore: Boolean,
    containerClass: String,
  },
  template: '<div><slot name="body" /></div>',
};
const AssistantPlayground = {
  name: 'AssistantPlayground',
  props: ['assistantId'],
  template: '<div />',
};

describe('assistant playground page behaviour', () => {
  it('opens the playground for the routed assistant', () => {
    const wrapper = mount(PlaygroundIndex, {
      global: { stubs: { PageLayout, AssistantPlayground } },
    });
    expect(wrapper.getComponent(PageLayout).props()).toEqual({
      showAssistantSwitcher: true,
      showPaginationFooter: false,
      showKnowMore: false,
      containerClass: 'max-w-none',
    });
    expect(wrapper.getComponent(AssistantPlayground).props('assistantId')).toBe(
      6
    );
  });
});
