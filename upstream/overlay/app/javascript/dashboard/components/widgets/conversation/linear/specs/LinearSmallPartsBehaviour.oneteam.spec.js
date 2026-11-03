/**
 * OneTeam behaviour spec for the Linear issue header and setup call to action.
 *
 * Covers opening and unlinking an issue, and the admin and agent versions of
 * the setup card.
 */
import { ref } from 'vue';
import { mount } from '@vue/test-utils';
import IssueHeader from '../IssueHeader.vue';
import LinearSetupCTA from '../LinearSetupCTA.vue';

const env = vi.hoisted(() => ({ isAdmin: true }));

vi.mock('dashboard/composables/useAdmin', async () => {
  const { computed } = await import('vue');
  return { useAdmin: () => ({ isAdmin: computed(() => env.isAdmin) }) };
});
vi.mock('dashboard/composables/store', () => ({
  useStoreGetters: () => ({ getCurrentAccountId: ref(4) }),
}));

const Button = {
  name: 'NextButton',
  props: ['icon'],
  emits: ['click'],
  template:
    '<button :data-icon="icon" @click="$emit(\'click\')"><slot /></button>',
};

describe('IssueHeader', () => {
  it('opens the issue in a new tab and emits unlink', async () => {
    const open = vi.spyOn(window, 'open').mockImplementation(() => null);
    const wrapper = mount(IssueHeader, {
      props: { identifier: 'ENG-1', issueUrl: 'https://linear.app/i/ENG-1' },
      global: { stubs: { Button, FluentIcon: true } },
    });
    expect(wrapper.text()).toContain('ENG-1');
    await wrapper
      .find('[data-icon="i-lucide-arrow-up-right"]')
      .trigger('click');
    expect(open).toHaveBeenCalledWith('https://linear.app/i/ENG-1', '_blank');
    await wrapper.find('[data-icon="i-lucide-unlink"]').trigger('click');
    expect(wrapper.emitted('unlinkIssue')).toHaveLength(1);
  });
});

describe('LinearSetupCTA', () => {
  const mountCta = () =>
    mount(LinearSetupCTA, {
      global: { stubs: { NextButton: Button }, mocks: { $t: key => key } },
    });

  it('lets admins open the Linear integration settings', async () => {
    env.isAdmin = true;
    const open = vi.spyOn(window, 'open').mockImplementation(() => null);
    const wrapper = mountCta();
    expect(wrapper.text()).toContain(
      'INTEGRATION_SETTINGS.LINEAR.CTA.DESCRIPTION'
    );
    await wrapper.find('button').trigger('click');
    expect(open).toHaveBeenCalledWith(
      '/app/accounts/4/settings/integrations/linear',
      '_blank'
    );
  });

  it('shows agents a description without the button', () => {
    env.isAdmin = false;
    const wrapper = mountCta();
    expect(wrapper.text()).toContain(
      'INTEGRATION_SETTINGS.LINEAR.CTA.AGENT_DESCRIPTION'
    );
    expect(wrapper.find('button').exists()).toBe(false);
  });
});
