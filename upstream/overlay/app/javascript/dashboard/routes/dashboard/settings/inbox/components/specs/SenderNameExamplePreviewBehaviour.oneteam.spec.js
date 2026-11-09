/**
 * OneTeam behaviour spec for the email sender name preview cards.
 *
 * Covers the friendly and professional previews with and without a
 * business name, the website channel layout, and selecting a card.
 */
import { mount } from '@vue/test-utils';
import SenderNameExamplePreview from '../SenderNameExamplePreview.vue';

vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: key => key }) }));
vi.mock('shared/composables/useBranding', () => ({
  useBranding: () => ({ replaceInstallationName: name => `${name}!` }),
}));

/**
 * Mounts the preview.
 *
 * @param {object} props props overrides
 * @returns {import('@vue/test-utils').VueWrapper}
 */
const mountPreview = props =>
  mount(SenderNameExamplePreview, {
    props,
    global: {
      stubs: {
        Avatar: { name: 'Avatar', props: ['name'], template: '<i />' },
        RadioCard: {
          name: 'RadioCard',
          props: { id: String, isActive: Boolean },
          emits: ['select'],
          template:
            '<div class="card" :data-active="isActive" @click="$emit(\'select\', id)"><slot /></div>',
        },
      },
    },
  });

describe('SenderNameExamplePreview behaviour', () => {
  it('previews both styles with the default business name', async () => {
    const wrapper = mountPreview();
    const avatars = wrapper.findAllComponents({ name: 'Avatar' });
    expect(avatars.map(a => a.props('name'))).toEqual(['Smith', 'Chatwoot!']);
    expect(wrapper.text()).toContain(
      'INBOX_MGMT.EDIT.SENDER_NAME_SECTION.FRIENDLY.FROM'
    );
    expect(wrapper.classes()).toContain('sm:flex-row');
    expect(wrapper.findAll('.card')[0].attributes('data-active')).toBe('true');

    await wrapper.findAll('.card')[1].trigger('click');
    expect(wrapper.emitted('update')).toEqual([['professional']]);
  });

  it('uses the business name and the website layout', () => {
    const wrapper = mountPreview({
      businessName: 'Acme',
      isWebsiteChannel: true,
      senderNameType: 'professional',
    });
    const avatars = wrapper.findAllComponents({ name: 'Avatar' });
    expect(avatars[1].props('name')).toBe('Acme');
    expect(wrapper.text()).toContain('Acme');
    expect(wrapper.classes()).toContain('xl:flex-row');
  });
});
