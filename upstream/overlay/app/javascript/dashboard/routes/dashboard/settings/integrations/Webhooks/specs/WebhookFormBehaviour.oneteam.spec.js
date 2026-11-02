/**
 * OneTeam behaviour spec for the webhook create/edit form.
 *
 * Covers the event list (with "inbox updated" when inbox events are on),
 * URL validation, filling from an existing webhook, showing, hiding and
 * copying the signing secret, submitting the URL, name and events, the
 * submit button state, and cancel.
 */
import { flushPromises, mount } from '@vue/test-utils';
import { useAlert } from 'dashboard/composables';
import { useConfig } from 'dashboard/composables/useConfig';
import { copyTextToClipboard } from 'shared/helpers/clipboard';
import WebhookForm from '../WebhookForm.vue';

vi.mock('dashboard/composables', () => ({ useAlert: vi.fn() }));
vi.mock('dashboard/composables/useConfig', () => ({ useConfig: vi.fn() }));
vi.mock('shared/helpers/clipboard', () => ({ copyTextToClipboard: vi.fn() }));

const NextButton = {
  name: 'NextButton',
  props: {
    label: String,
    icon: String,
    type: String,
    disabled: Boolean,
    isLoading: Boolean,
  },
  emits: ['click'],
  template:
    '<button :type="type" :data-icon="icon" @click="$emit(\'click\', $event)">{{ label }}</button>',
};

const mountForm = (value = {}, extra = {}, inboxEventsEnabled = false) => {
  useConfig.mockReturnValue({ inboxEventsEnabled });
  return mount(WebhookForm, {
    props: { value, submitLabel: 'Save', ...extra },
    global: {
      stubs: { NextButton, Button: NextButton },
      directives: { tooltip: {} },
    },
  });
};

const events = wrapper =>
  wrapper.findAll('input[type="checkbox"]').map(i => i.element.value);
const submitButton = wrapper =>
  wrapper.findAllComponents(NextButton).find(b => b.props('type') === 'submit');

describe('WebhookForm behaviour', () => {
  it('lists the events, with inbox updates when enabled', () => {
    expect(events(mountForm())).toHaveLength(10);
    const withInbox = events(mountForm({}, {}, true));
    expect(withInbox).toHaveLength(11);
    expect(withInbox.at(-1)).toBe('inbox_updated');
    expect(mountForm().find('label[for="message_created"]').text()).toBe(
      'INTEGRATION_SETTINGS.WEBHOOK.FORM.SUBSCRIPTIONS.EVENTS.MESSAGE_CREATED (message_created)'
    );
  });

  it('validates the URL and submits a new webhook', async () => {
    const wrapper = mountForm();
    expect(wrapper.find('input[name="url"]').attributes('placeholder')).toBe(
      'INTEGRATION_SETTINGS.WEBHOOK.FORM.END_POINT.PLACEHOLDER'
    );
    expect(wrapper.find('input[name="name"]').attributes('placeholder')).toBe(
      'INTEGRATION_SETTINGS.WEBHOOK.FORM.NAME.PLACEHOLDER'
    );
    expect(submitButton(wrapper).props('disabled')).toBe(true);

    await wrapper.find('input[name="url"]').setValue('bad');
    expect(wrapper.find('.message').text()).toBe(
      'INTEGRATION_SETTINGS.WEBHOOK.FORM.END_POINT.ERROR'
    );
    await wrapper.find('input[name="url"]').setValue('https://acme.io/hook');
    await wrapper.find('input[name="name"]').setValue('CRM');
    await wrapper.find('input[value="contact_created"]').setValue(true);
    expect(wrapper.find('.message').exists()).toBe(false);
    expect(submitButton(wrapper).props('disabled')).toBe(false);

    await wrapper.find('form').trigger('submit');
    expect(wrapper.emitted('submit')).toEqual([
      [
        {
          url: 'https://acme.io/hook',
          name: 'CRM',
          subscriptions: ['contact_created'],
        },
      ],
    ]);
    expect(wrapper.find('input[readonly]').exists()).toBe(false);
  });

  it('fills an existing webhook and shows or copies its secret', async () => {
    copyTextToClipboard.mockResolvedValue();
    const wrapper = mountForm(
      {
        url: 'https://acme.io/old',
        name: 'Old',
        subscriptions: ['message_created'],
        secret: 's3cret',
      },
      { isSubmitting: true }
    );
    expect(wrapper.find('input[name="url"]').element.value).toBe(
      'https://acme.io/old'
    );
    expect(wrapper.find('input[value="message_created"]').element.checked).toBe(
      true
    );
    expect(submitButton(wrapper).props()).toMatchObject({
      disabled: true,
      isLoading: true,
    });

    const secret = wrapper.find('input[readonly]');
    expect(secret.element.value).toMatch(/^•+$/);
    await wrapper.find('[data-icon="i-lucide-eye"]').trigger('click');
    expect(secret.element.value).toBe('s3cret');
    await wrapper.find('[data-icon="i-lucide-eye-off"]').trigger('click');
    expect(secret.element.value).toMatch(/^•+$/);

    await wrapper.find('[data-icon="i-lucide-copy"]').trigger('click');
    await flushPromises();
    expect(copyTextToClipboard).toHaveBeenCalledWith('s3cret');
    expect(useAlert).toHaveBeenCalledWith(
      'INTEGRATION_SETTINGS.WEBHOOK.SECRET.COPY_SUCCESS'
    );
  });

  it('starts empty without a webhook', () => {
    useConfig.mockReturnValue({ inboxEventsEnabled: false });
    const wrapper = mount(WebhookForm, {
      props: { submitLabel: 'Create' },
      global: { stubs: { NextButton }, directives: { tooltip: {} } },
    });
    expect(wrapper.find('input[name="url"]').element.value).toBe('');
    expect(wrapper.find('input[readonly]').exists()).toBe(false);
  });

  it('cancels', async () => {
    const wrapper = mountForm();
    await wrapper.find('button[type="reset"]').trigger('click');
    expect(wrapper.emitted('cancel')).toHaveLength(1);
  });
});
