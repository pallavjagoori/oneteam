/**
 * OneTeam behaviour spec for the help center upgrade page.
 *
 * Covers the cloud copy with "learn more" and "upgrade" actions, the
 * self-hosted copy without actions, and listing the four features.
 */
import { mount } from '@vue/test-utils';
import UpgradePage from '../UpgradePage.vue';

const NextButton = {
  name: 'NextButton',
  props: ['label'],
  emits: ['click'],
  template: '<button />',
};

/**
 * Mounts the page for a cloud or self-hosted installation.
 *
 * @param {boolean} cloud Whether the install is Chatwoot Cloud.
 * @param {Function} push Router push spy.
 * @returns {import('@vue/test-utils').VueWrapper} The mounted wrapper.
 */
const mountPage = (cloud, push = vi.fn()) =>
  mount(UpgradePage, {
    global: {
      stubs: { NextButton, FluentIcon: true },
      mocks: {
        $t: key => key,
        $router: { push },
        $store: {
          getters: {
            getCurrentAccountId: 4,
            'globalConfig/isOnChatwootCloud': cloud,
          },
        },
      },
    },
  });

describe('UpgradePage behaviour', () => {
  it('offers docs and billing on Chatwoot Cloud', () => {
    const open = vi.spyOn(window, 'open').mockImplementation(() => {});
    const push = vi.fn();
    const wrapper = mountPage(true, push);
    expect(wrapper.text()).toContain('HELP_CENTER.UPGRADE_PAGE.DESCRIPTION');
    const [docs, upgrade] = wrapper.findAllComponents(NextButton);
    docs.vm.$emit('click');
    upgrade.vm.$emit('click');
    expect(open).toHaveBeenCalledWith(expect.any(String), '_blank');
    expect(push).toHaveBeenCalledWith({
      name: 'billing_settings_index',
      params: { accountId: 4 },
    });
  });

  it('shows the self-hosted copy without actions', () => {
    const wrapper = mountPage(false);
    expect(wrapper.text()).toContain(
      'HELP_CENTER.UPGRADE_PAGE.SELF_HOSTED_DESCRIPTION'
    );
    expect(wrapper.findComponent(NextButton).exists()).toBe(false);
    expect(wrapper.findAll('h5')).toHaveLength(4);
  });
});
