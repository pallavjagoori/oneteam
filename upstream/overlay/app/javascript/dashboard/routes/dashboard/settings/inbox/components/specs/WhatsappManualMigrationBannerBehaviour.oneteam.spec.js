/**
 * OneTeam behaviour spec for the WhatsApp manual migration banner.
 *
 * Covers the copy, the guide link, and starting the migration.
 */
import { mount } from '@vue/test-utils';
import WhatsappManualMigrationBanner from '../WhatsappManualMigrationBanner.vue';

vi.mock('vue-i18n', async importOriginal => ({
  ...(await importOriginal()),
  useI18n: () => ({ t: key => key.split('.').pop() }),
}));

const Banner = {
  name: 'Banner',
  props: ['color', 'actionLabel'],
  emits: ['action'],
  template: '<div><slot /></div>',
};

describe('WhatsappManualMigrationBanner behaviour', () => {
  it('explains the migration and starts it', () => {
    const wrapper = mount(WhatsappManualMigrationBanner, {
      global: { stubs: { Banner, Icon: true } },
    });
    const banner = wrapper.getComponent(Banner);
    expect(banner.props()).toEqual({ color: 'blue', actionLabel: 'START' });
    expect(wrapper.text()).toContain('TITLE');
    expect(wrapper.text()).toContain('DESCRIPTION');
    const link = wrapper.get('a');
    expect(link.text()).toBe('GUIDE');
    expect(link.attributes('href')).toBe('https://chwt.app/migrate-whatsapp');
    banner.vm.$emit('action');
    expect(wrapper.emitted('start')).toHaveLength(1);
  });
});
