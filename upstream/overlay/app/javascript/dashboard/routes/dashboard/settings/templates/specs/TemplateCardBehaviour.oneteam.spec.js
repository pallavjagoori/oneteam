/**
 * OneTeam behaviour spec for the WhatsApp template list card.
 *
 * Covers the status pill (hidden for approved templates, translated for
 * unsubmitted ones), the type, language and inbox details, and opening
 * the preview by click, Enter, Space or the eye button.
 */
import { mount } from '@vue/test-utils';
import TemplateCard from '../TemplateCard.vue';

vi.mock('vue-i18n', async importOriginal => ({
  ...(await importOriginal()),
  useI18n: () => ({ t: key => key }),
}));

const Button = {
  name: 'NextButton',
  emits: ['click'],
  template: '<button class="eye" @click="$emit(\'click\', $event)" />',
};

/**
 * Mounts the card for a template.
 *
 * @param {object} template Template record overrides.
 * @returns {import('@vue/test-utils').VueWrapper} The mounted wrapper.
 */
const mountCard = (template = {}) =>
  mount(TemplateCard, {
    props: {
      template: {
        name: 'welcome',
        status: 'PENDING',
        language: 'en',
        inboxes: [{ id: 1 }],
        inboxNames: 'Support',
        ...template,
      },
    },
    global: {
      stubs: { Button, ChannelIcon: true },
      directives: { tooltip: {} },
      mocks: { $t: key => key },
    },
  });

const pill = wrapper => wrapper.find('span.rounded-md');

describe('TemplateCard behaviour', () => {
  it('shows the status, details and inbox names', () => {
    const wrapper = mountCard();
    expect(pill(wrapper).exists()).toBe(true);
    expect(wrapper.text()).toContain('welcome');
    expect(wrapper.text()).toContain('Support');
    expect(wrapper.text()).toContain('WHATSAPP_TEMPLATE_MGMT.TYPES.');
  });

  it('hides approved and translates unsubmitted statuses', () => {
    expect(pill(mountCard({ status: 'APPROVED' })).exists()).toBe(false);
    expect(pill(mountCard({ status: 'unsubmitted' })).text()).toBe(
      'WHATSAPP_TEMPLATE_MGMT.STATUSES.UNSUBMITTED'
    );
    expect(pill(mountCard({ status: undefined })).exists()).toBe(true);
  });

  it('opens the preview from the card and the eye button', async () => {
    const wrapper = mountCard();
    await wrapper.trigger('click');
    await wrapper.trigger('keydown', { key: 'Enter' });
    await wrapper.trigger('keydown', { key: ' ' });
    await wrapper.get('.eye').trigger('click');
    expect(wrapper.emitted('preview')).toHaveLength(4);
  });
});
