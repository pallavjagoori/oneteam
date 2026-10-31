/**
 * OneTeam behaviour spec for previewing the contacts behind a campaign
 * audience label.
 *
 * Covers loading the label's contacts when the popover opens (spinner,
 * first six, phone or email, empty state, failures and superseded
 * requests), expanding into the dialog, searching across name, email and
 * phone, paginating, and collapsing the dialog.
 */
import { mount, flushPromises } from '@vue/test-utils';
import ContactAPI from 'dashboard/api/contacts';
import AudienceLabelContacts from '../AudienceLabelContacts.vue';

const env = vi.hoisted(() => ({ log: [] }));

vi.mock('dashboard/api/contacts', () => ({
  default: { get: vi.fn(), filter: vi.fn() },
}));
vi.mock('@vueuse/core', async importOriginal => ({
  ...(await importOriginal()),
  useDebounceFn: fn => fn,
}));

const Popover = {
  name: 'Popover',
  emits: ['show'],
  methods: { hide: () => env.log.push('hide') },
  template:
    '<div class="popover"><slot /><div class="content"><slot name="content" /></div></div>',
};
const Dialog = {
  name: 'Dialog',
  methods: {
    open: () => env.log.push('open'),
    close: () => env.log.push('close'),
  },
  template: '<div class="dialog"><slot /></div>',
};
const Input = {
  name: 'Input',
  props: ['modelValue'],
  emits: ['update:modelValue', 'input'],
  template:
    '<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value); $emit(\'input\', $event)" />',
};
const Button = {
  name: 'Button',
  props: ['label', 'icon'],
  emits: ['click'],
  template:
    '<button :data-icon="icon" @click="$emit(\'click\')">{{ label }}</button>',
};
const PaginationFooter = {
  name: 'PaginationFooter',
  props: ['currentPage', 'totalItems'],
  emits: ['update:currentPage'],
  template: '<nav />',
};

const contacts = Array.from({ length: 8 }, (_, i) => ({
  id: i + 1,
  name: `Contact ${i + 1}`,
  phone_number: i === 0 ? null : `+1555000${i}`,
  email: `c${i + 1}@example.com`,
}));
const response = (payload, count = payload.length) => ({
  data: { payload, meta: { count } },
});

const mountContacts = () =>
  mount(AudienceLabelContacts, {
    props: { label: { title: 'vip', color: '#f00' } },
    global: {
      stubs: {
        Popover,
        Dialog,
        Input,
        Button,
        PaginationFooter,
        Avatar: true,
        Icon: true,
        Spinner: { template: '<div class="spinner" />' },
      },
    },
  });
const rows = (wrapper, scope) =>
  wrapper
    .find(scope)
    .findAll('.justify-between.gap-3')
    .filter(r => r.find('avatar-stub').exists());
const open = async wrapper => {
  await wrapper.findComponent(Popover).vm.$emit('show');
  await flushPromises();
};

describe('AudienceLabelContacts behaviour', () => {
  beforeEach(() => {
    env.log = [];
    ContactAPI.get.mockResolvedValue(response(contacts, 20));
    ContactAPI.filter.mockResolvedValue(response(contacts.slice(1, 2)));
  });

  it('loads the label contacts when opened', async () => {
    let finish;
    ContactAPI.get.mockImplementationOnce(
      () =>
        new Promise(resolve => {
          finish = resolve;
        })
    );
    const wrapper = mountContacts();
    expect(wrapper.find('.content').text()).toContain(
      'CAMPAIGN.WHATSAPP.FORM.AUDIENCE.CONTACTS.EMPTY_STATE'
    );
    await wrapper.findComponent(Popover).vm.$emit('show');
    expect(wrapper.find('.content .spinner').exists()).toBe(true);
    expect(ContactAPI.get).toHaveBeenCalledWith(1, 'name', 'vip', {
      signal: expect.any(AbortSignal),
    });
    finish(response(contacts, 20));
    await flushPromises();
    const preview = rows(wrapper, '.content');
    expect(preview).toHaveLength(6);
    expect(preview[0].text()).toContain('c1@example.com');
    expect(preview[1].text()).toContain('+15550001');
    expect(rows(wrapper, '.dialog')).toHaveLength(8);
    expect(wrapper.findComponent(PaginationFooter).props('totalItems')).toBe(
      20
    );
  });

  it('shows the empty state when loading fails', async () => {
    ContactAPI.get.mockRejectedValueOnce(new Error('offline'));
    const wrapper = mountContacts();
    await open(wrapper);
    expect(rows(wrapper, '.content')).toHaveLength(0);
    expect(wrapper.find('.dialog').text()).toContain(
      'CAMPAIGN.WHATSAPP.FORM.AUDIENCE.CONTACTS.EMPTY_STATE'
    );
    expect(wrapper.findComponent(PaginationFooter).exists()).toBe(false);
  });

  it('ignores superseded requests', async () => {
    ContactAPI.get.mockImplementationOnce(
      (page, sort, label, { signal }) =>
        new Promise((resolve, reject) => {
          signal.addEventListener('abort', () =>
            reject(new DOMException('aborted', 'AbortError'))
          );
        })
    );
    ContactAPI.get.mockResolvedValueOnce(response(contacts.slice(0, 2)));
    const wrapper = mountContacts();
    await wrapper.findComponent(Popover).vm.$emit('show');
    await open(wrapper);
    expect(rows(wrapper, '.dialog')).toHaveLength(2);
  });

  it('expands into the dialog and collapses again', async () => {
    const wrapper = mountContacts();
    await wrapper
      .find('button[data-icon="i-lucide-maximize-2"]')
      .trigger('click');
    expect(env.log).toEqual(['hide', 'open']);
    await wrapper
      .find('button[data-icon="i-lucide-minimize-2"]')
      .trigger('click');
    expect(env.log).toEqual(['hide', 'open', 'close']);
  });

  it('searches name, email and phone within the label', async () => {
    const wrapper = mountContacts();
    await open(wrapper);
    await wrapper
      .findComponent(PaginationFooter)
      .vm.$emit('update:currentPage', 2);
    expect(ContactAPI.get).toHaveBeenLastCalledWith(
      2,
      'name',
      'vip',
      expect.anything()
    );
    await wrapper.find('input').setValue('ann');
    await flushPromises();
    const [page, sort, { payload }] = ContactAPI.filter.mock.calls[0];
    expect([page, sort]).toEqual([1, 'name']);
    expect(payload.map(p => p.attribute_key)).toEqual([
      'labels',
      'name',
      'labels',
      'email',
      'labels',
      'phone_number',
    ]);
    expect(payload[1]).toEqual({
      attribute_key: 'name',
      filter_operator: 'contains',
      values: ['ann'],
      query_operator: 'or',
    });
    expect(payload[5].query_operator).toBeUndefined();
    expect(payload[0].values).toEqual(['vip']);
    expect(rows(wrapper, '.dialog')).toHaveLength(1);
  });

  it('ignores an empty response', async () => {
    ContactAPI.get.mockResolvedValueOnce(undefined);
    const wrapper = mountContacts();
    await open(wrapper);
    expect(rows(wrapper, '.dialog')).toHaveLength(0);
  });
});
