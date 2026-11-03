/**
 * OneTeam behaviour spec for the campaigns page layout.
 *
 * Covers the header title, the create button, the action and body
 * slots, and closing on a click outside the action area.
 */
import { mount } from '@vue/test-utils';
import CampaignLayout from '../CampaignLayout.vue';

const env = vi.hoisted(() => ({ outside: null }));

vi.mock('@vueuse/components', () => ({
  vOnClickOutside: {
    mounted: (el, binding) => {
      env.outside = binding.value;
    },
  },
}));

const Button = {
  name: 'Button',
  props: ['label'],
  emits: ['click'],
  template:
    '<button class="create" @click="$emit(\'click\')">{{ label }}</button>',
};

describe('CampaignLayout behaviour', () => {
  it('renders the header and slots and relays actions', async () => {
    const wrapper = mount(CampaignLayout, {
      props: { headerTitle: 'SMS campaigns', buttonLabel: 'New campaign' },
      slots: {
        action: '<div class="dialog">Form</div>',
        default: '<p class="body">List</p>',
      },
      global: { stubs: { Button } },
    });
    expect(wrapper.text()).toContain('SMS campaigns');
    expect(wrapper.find('.dialog').exists()).toBe(true);
    expect(wrapper.get('.body').text()).toBe('List');
    await wrapper.get('.create').trigger('click');
    expect(wrapper.emitted('click')).toHaveLength(1);
    const [handler, options] = env.outside;
    expect(options).toEqual({
      ignore: ['dialog.ProseMirror-prompt-backdrop'],
    });
    handler();
    expect(wrapper.emitted('close')).toHaveLength(1);
  });
});
