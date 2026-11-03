/**
 * OneTeam behaviour spec for an assistant settings control card.
 *
 * Covers the name and description and opening the control's route from
 * the card or its chevron button.
 */
import { mount } from '@vue/test-utils';
import AssistantControlItems from '../AssistantControlItems.vue';

const push = vi.hoisted(() => vi.fn());

vi.mock('vue-router', async importOriginal => ({
  ...(await importOriginal()),
  useRouter: () => ({ push }),
}));

const Button = {
  name: 'NextButton',
  emits: ['click'],
  template: '<button @click.stop="$emit(\'click\')" />',
};

describe('AssistantControlItems behaviour', () => {
  it('opens the control route from the card and the chevron', async () => {
    const wrapper = mount(AssistantControlItems, {
      props: {
        controlItem: {
          name: 'Guardrails',
          description: 'Keep replies safe',
          routeName: 'captain_assistants_guardrails_index',
        },
      },
      global: { stubs: { Button } },
    });
    expect(wrapper.text()).toContain('Guardrails');
    expect(wrapper.text()).toContain('Keep replies safe');
    await wrapper.trigger('click');
    await wrapper.get('button').trigger('click');
    expect(push.mock.calls).toEqual([
      [{ name: 'captain_assistants_guardrails_index' }],
      [{ name: 'captain_assistants_guardrails_index' }],
    ]);
  });

  it('defaults to an empty control', () => {
    expect(AssistantControlItems.props.controlItem.default()).toEqual({});
    expect(
      mount(AssistantControlItems, { global: { stubs: { Button } } }).text()
    ).toBe('');
  });
});
