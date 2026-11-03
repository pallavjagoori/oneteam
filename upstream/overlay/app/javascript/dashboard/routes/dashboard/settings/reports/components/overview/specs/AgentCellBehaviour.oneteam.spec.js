/**
 * OneTeam behaviour spec for the agent cell in the agent overview table.
 *
 * Covers the avatar, name and email, and the reversed layout for RTL
 * accounts.
 */
import { computed } from 'vue';
import { mount } from '@vue/test-utils';
import AgentCell from '../AgentCell.vue';

const env = vi.hoisted(() => ({ rtl: false }));

vi.mock('dashboard/composables/store', () => ({
  useMapGetter: () => computed(() => env.rtl),
}));

const BaseCell = { name: 'BaseCell', template: '<div><slot /></div>' };
const Avatar = {
  name: 'Avatar',
  props: ['src', 'name', 'status', 'size'],
  template: '<span />',
};

const row = {
  original: {
    thumbnail: 'a.png',
    agent: 'Ann',
    email: 'ann@x.io',
    status: 'online',
  },
};

/**
 * Mounts the cell.
 *
 * @returns {import('@vue/test-utils').VueWrapper} The mounted wrapper.
 */
const mountCell = () =>
  mount(AgentCell, { props: { row }, global: { stubs: { BaseCell, Avatar } } });

describe('AgentCell behaviour', () => {
  it('shows the agent', () => {
    env.rtl = false;
    const wrapper = mountCell();
    expect(wrapper.getComponent(Avatar).props()).toEqual({
      src: 'a.png',
      name: 'Ann',
      status: 'online',
      size: 32,
    });
    expect(wrapper.get('h6').text()).toBe('Ann');
    expect(wrapper.text()).toContain('ann@x.io');
    expect(wrapper.find('.flex-row-reverse').exists()).toBe(false);
  });

  it('reverses the layout for RTL accounts', () => {
    env.rtl = true;
    expect(mountCell().find('.flex-row-reverse').exists()).toBe(true);
  });
});
