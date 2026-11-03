/**
 * OneTeam behaviour spec for the webhook settings WebhookRow.
 *
 * Covers the name and URL display, the translated subscribed events and
 * the edit and delete events.
 */
import { mount } from '@vue/test-utils';
import WebhookRow from '../WebhookRow.vue';

vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: key => `t:${key}` }) }));

const ShowMoreStub = {
  name: 'ShowMore',
  props: { text: String },
  template: '<span class="events">{{ text }}</span>',
};

/**
 * Mounts a webhook row.
 *
 * @param {object} webhook webhook record
 * @returns {import('@vue/test-utils').VueWrapper}
 */
const mountRow = webhook =>
  mount(WebhookRow, {
    props: { webhook, index: 3 },
    global: {
      mocks: { $t: key => key },
      directives: { tooltip: {} },
      stubs: {
        ShowMore: ShowMoreStub,
        BaseTableRow: { template: '<tr><slot /></tr>' },
        BaseTableCell: { template: '<td><slot /></td>' },
        Button: {
          props: { icon: String },
          emits: ['click'],
          template: '<button :class="icon" @click="$emit(\'click\')" />',
        },
      },
    },
  });

describe('WebhookRow behaviour', () => {
  it('shows the name with the URL and translated events', () => {
    const wrapper = mountRow({
      name: 'CRM',
      url: 'https://crm.test',
      subscriptions: ['conversation_created', 'message_created'],
    });
    expect(wrapper.text()).toContain('CRM');
    expect(wrapper.text()).toContain('https://crm.test');
    const events = wrapper.findComponent(ShowMoreStub).props('text');
    expect(events.split(', ')).toHaveLength(2);
    expect(events).toContain(
      't:INTEGRATION_SETTINGS.WEBHOOK.FORM.SUBSCRIPTIONS.EVENTS'
    );
  });

  it('shows only the URL without a name', () => {
    const wrapper = mountRow({ url: 'https://only.test', subscriptions: [] });
    expect(wrapper.find('td div').text()).toBe('https://only.test');
  });

  it('emits edit and delete with the webhook', async () => {
    const webhook = { url: 'u', subscriptions: [] };
    const wrapper = mountRow(webhook);
    await wrapper.find('.i-woot-edit-pen').trigger('click');
    await wrapper.find('.i-woot-bin').trigger('click');
    expect(wrapper.emitted('edit')).toEqual([[webhook]]);
    expect(wrapper.emitted('delete')).toEqual([[webhook, 3]]);
  });
});
