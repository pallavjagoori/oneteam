/**
 * OneTeam behaviour spec for the Twilio content template parser.
 *
 * Covers the header (name, language and category with defaults), body
 * variables turned into inputs and rendered live, the media URL input
 * for media templates (with the template URL or a fallback placeholder),
 * the validation error and slot validity, sending (variables replaced,
 * media URL reduced via the shared helper), templates without
 * variables, resetting on template changes, and the reset / back slot
 * actions.
 */
import { flushPromises, mount } from '@vue/test-utils';
import ContentTemplateParser from '../ContentTemplateParser.vue';

vi.mock('@chatwoot/utils', async importOriginal => ({
  ...(await importOriginal()),
  isTwilioMediaTemplate: template => Boolean(template.media),
  getTwilioMediaVariableKey: template => template.mediaKey ?? null,
  getTwilioMediaUrl: template => template.media,
  isTwilioComplete: (template, params) => Object.values(params).every(Boolean),
  applyTwilioMediaFilename: (template, params) => ({ ...params, reduced: true }),
}));

const Input = {
  name: 'Input',
  props: ['modelValue', 'placeholder', 'type'],
  emits: ['update:modelValue'],
  template:
    '<input :type="type" :value="modelValue" :placeholder="placeholder" @input="$emit(\'update:modelValue\', $event.target.value)" />',
};

const mountParser = template =>
  mount(ContentTemplateParser, {
    props: { template },
    global: { stubs: { Input } },
    slots: {
      actions: `<template #actions="{ sendMessage, resetTemplate, goBack, isValid, disabled }">
        <button class="send" :data-valid="isValid" :data-disabled="disabled" @click="sendMessage" />
        <button class="reset" @click="resetTemplate" />
        <button class="back" @click="goBack" />
      </template>`,
    },
  });
const body = wrapper => wrapper.find('.whitespace-pre-wrap').text();

describe('Content template parser behaviour', () => {
  it('renders variables, validates and sends', async () => {
    const wrapper = mountParser({
      friendly_name: 'order_update',
      language: 'fr',
      category: 'marketing',
      body: 'Hi {{1}}, order {{2}} shipped',
    });
    await flushPromises();
    expect(wrapper.find('h3').text()).toBe('order_update');
    expect(wrapper.text()).toContain('CONTENT_TEMPLATES.PARSER.LANGUAGE: fr');
    expect(wrapper.text()).toContain('CONTENT_TEMPLATES.PARSER.CATEGORY: marketing');
    expect(wrapper.findAll('input[type="text"]')).toHaveLength(2);
    expect(wrapper.find('.send').attributes('data-disabled')).toBe('true');

    await wrapper.find('.send').trigger('click');
    expect(wrapper.emitted('sendMessage')).toBeUndefined();
    expect(wrapper.text()).toContain('CONTENT_TEMPLATES.PARSER.FORM_ERROR_MESSAGE');

    await wrapper.findAll('input')[0].setValue('Ada');
    expect(body(wrapper)).toBe('Hi Ada, order {{2}} shipped');
    await wrapper.findAll('input')[1].setValue('#42');
    expect(wrapper.find('.send').attributes('data-valid')).toBe('true');
    await wrapper.find('.send').trigger('click');
    expect(wrapper.emitted('sendMessage')).toEqual([
      [
        {
          message: 'Hi Ada, order #42 shipped',
          templateParams: {
            name: 'order_update',
            language: 'fr',
            processed_params: { 1: 'Ada', 2: '#42', reduced: true },
          },
        },
      ],
    ]);
  });

  it('asks for the media URL on media templates', async () => {
    const wrapper = mountParser({
      friendly_name: 'promo',
      body: 'See attached',
      media: 'https://cdn/x.png',
      mediaKey: '1',
    });
    await flushPromises();
    expect(wrapper.text()).toContain('CONTENT_TEMPLATES.PARSER.LANGUAGE: en');
    expect(wrapper.text()).toContain('CONTENT_TEMPLATES.PARSER.CATEGORY: utility');
    const url = wrapper.find('input[type="url"]');
    expect(url.attributes('placeholder')).toBe('https://cdn/x.png');
    expect(wrapper.find('input[type="text"]').exists()).toBe(false);
    await url.setValue('https://cdn/y.png');
    await wrapper.find('.send').trigger('click');
    expect(wrapper.emitted('sendMessage')[0][0].templateParams.processed_params).toEqual({
      1: 'https://cdn/y.png',
      reduced: true,
    });

    await wrapper.setProps({ template: { friendly_name: 'promo2', mediaKey: '1' } });
    await flushPromises();
    expect(wrapper.find('input[type="url"]').attributes('placeholder')).toBe(
      'CONTENT_TEMPLATES.PARSER.MEDIA_URL_PLACEHOLDER'
    );
    expect(wrapper.find('input[type="url"]').element.value).toBe('');
    expect(wrapper.text()).not.toContain('FORM_ERROR_MESSAGE');
  });

  it('sends plain templates and relays reset and back', async () => {
    const wrapper = mountParser({ friendly_name: 'hello', body: 'Hello there' });
    await flushPromises();
    expect(wrapper.find('input').exists()).toBe(false);
    await wrapper.find('.send').trigger('click');
    expect(wrapper.emitted('sendMessage')[0][0].message).toBe('Hello there');
    await wrapper.find('.reset').trigger('click');
    await wrapper.find('.back').trigger('click');
    expect(wrapper.emitted('resetTemplate')).toHaveLength(1);
    expect(wrapper.emitted('back')).toHaveLength(1);

    await wrapper.setProps({ template: { friendly_name: 'empty' } });
    await flushPromises();
    expect(body(wrapper)).toBe('');
  });
});
