/**
 * OneTeam behaviour spec for the Twilio content template picker in the
 * new conversation composer.
 *
 * Covers listing only approved templates that match the search, the
 * empty state and missing template data, the body fallback, opening a
 * template's form (which disables the trigger button), going back,
 * sending a message (which closes the popover) and resetting state when
 * the popover is shown or hidden.
 */
import { ref } from 'vue';
import { mount } from '@vue/test-utils';
import ContentTemplateSelector from '../ContentTemplateSelector.vue';

const inboxes = ref({});

vi.mock('dashboard/composables/store', () => ({
  useMapGetter: () => ref(id => inboxes.value[id]),
}));

const hide = vi.fn();
const Popover = {
  name: 'Popover',
  emits: ['show', 'hide'],
  template:
    '<div><slot /><div class="content"><slot name="content" :hide="hide" /></div></div>',
  setup: () => ({ hide }),
};
const Input = {
  name: 'Input',
  props: ['modelValue'],
  emits: ['update:modelValue'],
  template: '<div class="search"><slot name="prefix" /></div>',
};
const Button = {
  name: 'Button',
  props: ['label', 'disabled'],
  template: '<button>{{ label }}</button>',
};
const ContentTemplateForm = {
  name: 'ContentTemplateForm',
  props: ['template'],
  emits: ['sendMessage', 'back'],
  template: '<div class="form" />',
};

const templates = [
  {
    content_sid: 'a',
    friendly_name: 'Order Update',
    body: 'Your order',
    status: 'approved',
  },
  {
    content_sid: 'b',
    friendly_name: 'Order Draft',
    body: 'Draft',
    status: 'pending',
  },
  { content_sid: 'c', friendly_name: 'Welcome', status: 'approved' },
];

const mountSelector = (inboxId = 1) =>
  mount(ContentTemplateSelector, {
    props: { inboxId },
    global: {
      stubs: { Popover, Input, Button, ContentTemplateForm, Icon: true },
    },
  });

const rows = wrapper => wrapper.findAll('[tabindex="0"]');

describe('ContentTemplateSelector behaviour', () => {
  beforeEach(() => {
    hide.mockClear();
    inboxes.value = { 1: { content_templates: { templates } } };
  });

  it('lists approved templates and filters by search', async () => {
    const wrapper = mountSelector();
    expect(rows(wrapper).map(r => r.text())).toEqual([
      'Order UpdateYour order',
      'WelcomeCONTENT_TEMPLATES.PICKER.NO_CONTENT',
    ]);
    await wrapper.findComponent(Input).vm.$emit('update:modelValue', 'ORDER');
    expect(rows(wrapper)).toHaveLength(1);
    await wrapper.findComponent(Input).vm.$emit('update:modelValue', 'zzz');
    expect(rows(wrapper)).toHaveLength(0);
    expect(wrapper.text()).toContain(
      'COMPOSE_NEW_CONVERSATION.FORM.TWILIO_OPTIONS.EMPTY_STATE'
    );
  });

  it('shows the empty state when the inbox has no templates', () => {
    const wrapper = mountSelector(2);
    expect(rows(wrapper)).toHaveLength(0);
    expect(wrapper.text()).toContain(
      'COMPOSE_NEW_CONVERSATION.FORM.TWILIO_OPTIONS.EMPTY_STATE'
    );
  });

  it('opens a template, goes back and sends', async () => {
    const wrapper = mountSelector();
    await rows(wrapper)[0].trigger('click');
    const form = wrapper.findComponent(ContentTemplateForm);
    expect(form.props('template')).toEqual(templates[0]);
    expect(wrapper.findComponent(Button).props('disabled')).toEqual(
      templates[0]
    );

    await form.vm.$emit('back');
    expect(wrapper.findComponent(ContentTemplateForm).exists()).toBe(false);

    await rows(wrapper)[0].trigger('click');
    await wrapper
      .findComponent(ContentTemplateForm)
      .vm.$emit('sendMessage', { sid: 'a' });
    expect(wrapper.emitted('sendMessage')[0]).toEqual([{ sid: 'a' }]);
    expect(hide).toHaveBeenCalled();
  });

  it('resets the search and selection on show and hide', async () => {
    const wrapper = mountSelector();
    const popover = wrapper.findComponent(Popover);
    await wrapper.findComponent(Input).vm.$emit('update:modelValue', 'zzz');
    await popover.vm.$emit('show');
    expect(wrapper.findComponent(Input).props('modelValue')).toBe('');

    await rows(wrapper)[1].trigger('click');
    await popover.vm.$emit('hide');
    expect(wrapper.findComponent(ContentTemplateForm).exists()).toBe(false);

    await rows(wrapper)[1].trigger('click');
    await popover.vm.$emit('show');
    expect(wrapper.findComponent(ContentTemplateForm).exists()).toBe(false);
  });
});
