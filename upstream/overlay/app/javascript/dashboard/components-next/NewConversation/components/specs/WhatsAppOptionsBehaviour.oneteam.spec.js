/**
 * OneTeam behaviour spec for the WhatsApp template picker in the new
 * conversation composer.
 *
 * Covers listing the inbox's templates with their body text, filtering
 * by name, the empty state, locking the trigger while templates refresh
 * or a template is open, opening a template, going back, sending (which
 * closes the popover) and resetting state when the popover opens or
 * closes.
 */
import { ref } from 'vue';
import { mount } from '@vue/test-utils';
import WhatsAppOptions from '../WhatsAppOptions.vue';

const env = vi.hoisted(() => ({ templates: null, uiFlags: null }));

vi.mock('dashboard/composables/store', async () => {
  const { computed } = await import('vue');
  return {
    useMapGetter: name =>
      name === 'inboxes/getUIFlags'
        ? env.uiFlags
        : computed(() => id => env.templates[id] || []),
  };
});

const hide = vi.fn();
const Popover = {
  name: 'Popover',
  emits: ['show', 'hide'],
  template: '<div><slot /><slot name="content" :hide="hide" /></div>',
  setup: () => ({ hide }),
};
const Button = {
  name: 'Button',
  props: ['label', 'disabled'],
  template: '<button>{{ label }}</button>',
};
const WhatsappTemplate = {
  name: 'WhatsappTemplate',
  props: ['template'],
  emits: ['sendMessage', 'back'],
  template: '<div class="template-form" />',
};

const body = text => [
  { type: 'HEADER', text: 'Header' },
  { type: 'BODY', text },
];
const templates = [
  { id: 1, name: 'Order_Shipped', components: body('Your order shipped') },
  { id: 2, name: 'welcome', components: body('Hi there') },
];

const mountOptions = (inboxId = 5) =>
  mount(WhatsAppOptions, {
    props: { inboxId },
    global: { stubs: { Popover, Button, WhatsappTemplate, Icon: true } },
  });

const rows = wrapper => wrapper.findAll('.cursor-pointer');

describe('WhatsAppOptions behaviour', () => {
  beforeEach(() => {
    hide.mockClear();
    env.templates = { 5: templates };
    env.uiFlags = ref({ isFetching: false });
  });

  it('lists and filters templates', async () => {
    const wrapper = mountOptions();
    expect(rows(wrapper).map(r => r.text())).toEqual([
      'Order_ShippedYour order shipped',
      'welcomeHi there',
    ]);
    await wrapper.find('input[type="search"]').setValue('ORDER');
    expect(rows(wrapper)).toHaveLength(1);
    await wrapper.find('input[type="search"]').setValue('zzz');
    expect(rows(wrapper)).toHaveLength(0);
    expect(wrapper.text()).toContain(
      'COMPOSE_NEW_CONVERSATION.FORM.WHATSAPP_OPTIONS.EMPTY_STATE'
    );
  });

  it('locks the trigger while templates refresh', () => {
    env.uiFlags.value = { isFetching: true };
    const wrapper = mountOptions(9);
    expect(wrapper.findComponent(Button).props('disabled')).toBe(true);
    expect(rows(wrapper)).toHaveLength(0);
  });

  it('opens a template, goes back and sends', async () => {
    const wrapper = mountOptions();
    expect(wrapper.findComponent(Button).props('disabled')).toBe(false);
    await rows(wrapper)[1].trigger('click');
    const form = wrapper.findComponent(WhatsappTemplate);
    expect(form.props('template')).toEqual(templates[1]);
    expect(wrapper.findComponent(Button).props('disabled')).toEqual(
      templates[1]
    );
    await form.vm.$emit('back');
    expect(wrapper.findComponent(WhatsappTemplate).exists()).toBe(false);

    await rows(wrapper)[0].trigger('click');
    await wrapper
      .findComponent(WhatsappTemplate)
      .vm.$emit('sendMessage', { name: 'Order_Shipped' });
    expect(wrapper.emitted('sendMessage')[0]).toEqual([
      { name: 'Order_Shipped' },
    ]);
    expect(hide).toHaveBeenCalled();
  });

  it('resets the search and selection on show and hide', async () => {
    const wrapper = mountOptions();
    const popover = wrapper.findComponent(Popover);
    await wrapper.find('input[type="search"]').setValue('zzz');
    await popover.vm.$emit('show');
    expect(wrapper.find('input[type="search"]').element.value).toBe('');

    await rows(wrapper)[0].trigger('click');
    await popover.vm.$emit('hide');
    expect(wrapper.findComponent(WhatsappTemplate).exists()).toBe(false);

    await rows(wrapper)[0].trigger('click');
    await popover.vm.$emit('show');
    expect(wrapper.findComponent(WhatsappTemplate).exists()).toBe(false);
  });
});
