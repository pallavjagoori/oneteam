/**
 * OneTeam behaviour spec for the account settings build info and section
 * layout.
 *
 * Covers the update notice, copying the build SHA, and the section's title,
 * description and beta slots.
 */
import { mount } from '@vue/test-utils';
import BuildInfo from '../BuildInfo.vue';
import SectionLayout from '../SectionLayout.vue';

const env = vi.hoisted(() => ({ config: {}, latest: '', copy: vi.fn() }));

vi.mock('dashboard/composables/useAccount', async () => {
  const { computed } = await import('vue');
  return {
    useAccount: () => ({
      currentAccount: computed(() => ({ latest_chatwoot_version: env.latest })),
    }),
  };
});
vi.mock('dashboard/composables/store', async () => {
  const { computed } = await import('vue');
  return { useMapGetter: () => computed(() => env.config) };
});
vi.mock('shared/helpers/clipboard', () => ({
  copyTextToClipboard: (...args) => env.copy(...args),
}));

const global = { directives: { tooltip: {} } };

describe('BuildInfo', () => {
  it('shows the update notice and copies the full SHA', async () => {
    env.config = {
      appVersion: '4.1.0',
      gitSha: 'abcdef123456',
      displayManifest: true,
    };
    env.latest = '4.2.0';
    const wrapper = mount(BuildInfo, { global });
    expect(wrapper.text()).toContain('GENERAL_SETTINGS.UPDATE_CHATWOOT');
    expect(wrapper.text()).toContain('v4.1.0');
    expect(wrapper.find('.build-id').text()).toBe('Build abcdef1');
    await wrapper.find('.build-id').trigger('click');
    expect(env.copy).toHaveBeenCalledWith('abcdef123456');
  });

  it('hides the notice for an invalid or older latest version', () => {
    env.config = {
      appVersion: '4.1.0',
      gitSha: 'abcdef1',
      displayManifest: true,
    };
    env.latest = 'nope';
    expect(mount(BuildInfo, { global }).text()).not.toContain(
      'UPDATE_CHATWOOT'
    );
    env.latest = '4.0.0';
    expect(mount(BuildInfo, { global }).text()).not.toContain(
      'UPDATE_CHATWOOT'
    );
  });
});

describe('SectionLayout', () => {
  it('renders title and description slots with the beta tag', () => {
    const wrapper = mount(SectionLayout, {
      props: { title: '', description: '', beta: true, withBorder: true },
      slots: {
        title: '<b>Custom title</b>',
        description: '<i>Custom description</i>',
        default: 'Body',
      },
      global,
    });
    expect(wrapper.find('b').text()).toBe('Custom title');
    expect(wrapper.find('i').text()).toBe('Custom description');
    expect(wrapper.text()).toContain('GENERAL.BETA');
    expect(wrapper.find('section').classes()).toContain('border-t');
  });

  it('renders plain text and hides the header block when empty', () => {
    const plain = mount(SectionLayout, {
      props: { title: 'Name', description: 'Your name' },
      global,
    });
    expect(plain.find('h4').text()).toBe('Name');
    expect(plain.find('p').text()).toBe('Your name');
    const empty = mount(SectionLayout, {
      props: { title: '', description: '', hideContent: true },
      global,
    });
    expect(empty.find('.col-span-3').exists()).toBe(false);
    expect(empty.find('.h-0').exists()).toBe(true);
  });
});
