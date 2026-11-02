/**
 * OneTeam behaviour spec for the audience step of a WhatsApp campaign.
 *
 * Covers the messaging tier note (known or unknown tier), the label
 * picker options, the empty state, per-label contact counts (fetched
 * once per label, zero on failure), the de-duplicated total across the
 * chosen labels (dropping a cancelled request, zero on failure or with
 * nothing chosen), and removing a label.
 */
import { flushPromises, mount } from '@vue/test-utils';
import ContactAPI from 'dashboard/api/contacts';
import AudienceFields from '../AudienceFields.vue';

vi.mock('dashboard/api/contacts', () => ({ default: { get: vi.fn() } }));

const TagMultiSelectComboBox = {
  name: 'TagMultiSelectComboBox',
  props: ['modelValue', 'options'],
  emits: ['update:modelValue'],
  template: '<div class="picker" />',
};
const Button = {
  name: 'Button',
  emits: ['click'],
  template: '<button class="remove" @click="$emit(\'click\')" />',
};

const labels = [
  { id: 1, title: 'vip', color: '#f00' },
  { id: 2, title: 'trial', color: '#0f0' },
];

const counts = { vip: 4, trial: 3, 'vip,trial': 6 };

const mountFields = (modelValue = [], props = {}) => {
  const wrapper = mount(AudienceFields, {
    props: {
      labels,
      modelValue,
      'onUpdate:modelValue': value => wrapper.setProps({ modelValue: value }),
      ...props,
    },
    global: {
      stubs: {
        TagMultiSelectComboBox,
        Button,
        NextButton: Button,
        AudienceLabelContacts: true,
        Icon: true,
      },
    },
  });
  return wrapper;
};

const rows = wrapper => wrapper.findAll('.h-14').map(r => r.text());
const total = wrapper => wrapper.find('.mb-3').text();

describe('AudienceFields behaviour', () => {
  beforeEach(() => {
    ContactAPI.get.mockReset();
    ContactAPI.get.mockImplementation(async (page, sort, titles) => ({
      data: { meta: { count: counts[[].concat(titles).join(',')] } },
    }));
  });

  it('shows the tier note, options and empty state', () => {
    const wrapper = mountFields([], { messagingTier: 'TIER_1K' });
    expect(wrapper.text()).toContain(
      'CAMPAIGN.WHATSAPP.FORM.AUDIENCE.TIER_DESCRIPTION'
    );
    expect(wrapper.find('a').attributes('href')).toBe(
      'https://developers.facebook.com/docs/whatsapp/messaging-limits'
    );
    expect(
      wrapper.findComponent(TagMultiSelectComboBox).props('options')
    ).toEqual([
      { value: 1, label: 'vip' },
      { value: 2, label: 'trial' },
    ]);
    expect(wrapper.text()).toContain(
      'CAMPAIGN.WHATSAPP.FORM.AUDIENCE.EMPTY_STATE'
    );
    expect(ContactAPI.get).not.toHaveBeenCalled();
    expect(mountFields().text()).toContain(
      'CAMPAIGN.WHATSAPP.FORM.AUDIENCE.TIER_UNKNOWN'
    );
  });

  it('counts contacts per label and in total, and removes labels', async () => {
    const wrapper = mountFields([1]);
    await flushPromises();
    expect(rows(wrapper)).toEqual(['vip 4']);
    expect(total(wrapper)).toBe(
      'CAMPAIGN.WHATSAPP.FORM.AUDIENCE.SELECTED_COUNT'
    );

    await wrapper
      .findComponent(TagMultiSelectComboBox)
      .vm.$emit('update:modelValue', [1, 2]);
    await flushPromises();
    expect(rows(wrapper)).toEqual(['vip 4', 'trial 3']);
    expect(ContactAPI.get.mock.calls.map(call => call[2])).toEqual([
      'vip',
      ['vip'],
      'trial',
      ['vip', 'trial'],
    ]);
    expect(ContactAPI.get.mock.calls[1][3].signal).toBeInstanceOf(AbortSignal);

    await wrapper.findAll('.remove')[0].trigger('click');
    await flushPromises();
    expect(wrapper.emitted('update:modelValue').at(-1)).toEqual([[2]]);
    expect(rows(wrapper)).toEqual(['trial 3']);
    expect(ContactAPI.get).toHaveBeenCalledTimes(5);

    await wrapper.find('.remove').trigger('click');
    await flushPromises();
    expect(wrapper.text()).toContain(
      'CAMPAIGN.WHATSAPP.FORM.AUDIENCE.EMPTY_STATE'
    );
  });

  it('falls back to zero when counts fail and drops a cancelled total', async () => {
    ContactAPI.get.mockImplementation((page, sort, titles, options) => {
      if (Array.isArray(titles) && titles.length === 1) {
        // Like axios, the pending total rejects once its signal aborts.
        return new Promise((resolve, reject) => {
          options.signal.addEventListener('abort', () =>
            reject(Object.assign(new Error('aborted'), { name: 'AbortError' }))
          );
        });
      }
      return Promise.reject(new Error('down'));
    });
    const wrapper = mountFields([1]);
    await flushPromises();
    expect(rows(wrapper)).toEqual(['vip 0']);

    await wrapper.setProps({ modelValue: [1, 2] });
    await flushPromises();
    expect(wrapper.vm.totalContacts).toBe(0);
    expect(rows(wrapper)).toEqual(['vip 0', 'trial 0']);
  });
});
