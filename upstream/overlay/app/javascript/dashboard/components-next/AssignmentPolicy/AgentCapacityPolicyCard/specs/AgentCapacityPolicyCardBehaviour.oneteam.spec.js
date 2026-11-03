/**
 * OneTeam behaviour spec for an agent capacity policy card.
 *
 * Covers the name, description and agent popover (mapping avatars from
 * either field), fetching agents only once, and the edit and delete
 * actions.
 */
import { mount } from '@vue/test-utils';
import AgentCapacityPolicyCard from '../AgentCapacityPolicyCard.vue';

vi.mock('vue-i18n', async importOriginal => ({
  ...(await importOriginal()),
  useI18n: () => ({ t: key => key }),
}));

const CardPopover = {
  name: 'CardPopover',
  props: ['count', 'items', 'isFetching'],
  emits: ['fetch'],
  template: '<div />',
};
const Button = {
  name: 'NextButton',
  props: ['icon'],
  emits: ['click'],
  template: '<button :data-icon="icon" @click="$emit(\'click\')" />',
};

/**
 * Mounts the card.
 *
 * @param {object} props Card props.
 * @returns {import('@vue/test-utils').VueWrapper} The mounted wrapper.
 */
const mountCard = props =>
  mount(AgentCapacityPolicyCard, {
    props: { id: 6, name: 'Weekday', description: 'Max 5', ...props },
    global: {
      stubs: {
        CardPopover,
        Button,
        CardLayout: { template: '<div><slot /></div>' },
      },
    },
  });

describe('AgentCapacityPolicyCard behaviour', () => {
  it('shows agents and emits edit and delete', async () => {
    const wrapper = mountCard({
      assignedAgentCount: 2,
      isFetchingUsers: true,
      users: [
        { id: 1, name: 'Ann', email: 'a@x.test', avatarUrl: 'a.png' },
        { id: 2, name: 'Bo', email: 'b@x.test', thumbnail: 'b.png' },
      ],
    });
    expect(wrapper.text()).toContain('Weekday');
    expect(wrapper.text()).toContain('Max 5');
    const popover = wrapper.getComponent(CardPopover);
    expect(popover.props()).toMatchObject({ count: 2, isFetching: true });
    expect(popover.props('items')).toEqual([
      { name: 'Ann', key: 1, email: 'a@x.test', avatarUrl: 'a.png' },
      { name: 'Bo', key: 2, email: 'b@x.test', avatarUrl: 'b.png' },
    ]);
    popover.vm.$emit('fetch');
    expect(wrapper.emitted('fetchUsers')).toBeUndefined();
    const [edit, remove] = wrapper.findAll('button');
    await edit.trigger('click');
    await remove.trigger('click');
    expect(wrapper.emitted('edit')).toEqual([[6]]);
    expect(wrapper.emitted('delete')).toEqual([[6]]);
  });

  it('fetches agents when none are loaded', () => {
    const wrapper = mountCard();
    wrapper.getComponent(CardPopover).vm.$emit('fetch');
    expect(wrapper.emitted('fetchUsers')).toEqual([[6]]);
  });
});
