/**
 * OneTeam behaviour spec for the Captain suggested rules panel.
 *
 * Covers the title, the add and close actions, and a slot per item.
 */
import { mount } from '@vue/test-utils';
import SuggestedRules from '../SuggestedRules.vue';

vi.mock('vue-i18n', async importOriginal => ({
  ...(await importOriginal()),
  useI18n: () => ({ t: key => key }),
}));

const Button = {
  name: 'NextButton',
  props: ['label', 'icon'],
  emits: ['click'],
  template:
    '<button :data-icon="icon" @click="$emit(\'click\')">{{ label }}</button>',
};

describe('SuggestedRules behaviour', () => {
  it('renders items and emits add and close', async () => {
    const wrapper = mount(SuggestedRules, {
      props: {
        title: 'Suggested',
        items: [{ content: 'Be polite' }, { content: 'No refunds' }],
      },
      slots: {
        default:
          '<template #default="{ item }"><p>{{ item.content }}</p></template>',
      },
      global: { stubs: { Button } },
    });
    expect(wrapper.get('h5').text()).toBe('Suggested');
    expect(wrapper.findAll('p').map(p => p.text())).toEqual([
      'Be polite',
      'No refunds',
    ]);
    const [add, close] = wrapper.findAll('button');
    expect(add.text()).toBe('CAPTAIN.ASSISTANTS.GUARDRAILS.ADD.SUGGESTED.ADD');
    await add.trigger('click');
    await close.trigger('click');
    expect(wrapper.emitted('add')).toHaveLength(1);
    expect(wrapper.emitted('close')).toHaveLength(1);
  });

  it('defaults to no items', () => {
    expect(SuggestedRules.props.items.default()).toEqual([]);
  });
});
