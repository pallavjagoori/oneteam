/**
 * OneTeam behaviour spec for filling in a WhatsApp template before
 * sending it.
 *
 * Covers the name, language and category (with defaults), the live
 * preview of header and body as variables are filled, the media header
 * URL and document name fields, header, body and button inputs, the
 * error shown when sending an incomplete template, sending, resetting
 * and going back through the actions slot, and starting over when the
 * template changes.
 */
import { mount } from '@vue/test-utils';
import WhatsAppTemplateParser from '../WhatsAppTemplateParser.vue';

const blank = new Set();
vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key, args) => (args ? `${key} ${JSON.stringify(args)}` : key),
  }),
}));

const Input = {
  name: 'Input',
  props: ['modelValue', 'placeholder', 'type'],
  emits: ['update:modelValue'],
  template: '<input :value="modelValue" :placeholder="placeholder" />',
};

const textTemplate = {
  name: 'order_update',
  language: 'en',
  category: 'UTILITY',
  namespace: 'ns',
  components: [
    { type: 'HEADER', format: 'TEXT', text: 'Hi {{1}}' },
    { type: 'BODY', text: 'Order {{1}} is {{2}}' },
    {
      type: 'BUTTONS',
      buttons: [{ type: 'URL', text: 'Track', url: 'https://x.co/{{1}}' }],
    },
  ],
};
const imageTemplate = {
  name: 'promo',
  components: [
    { type: 'HEADER', format: 'IMAGE' },
    { type: 'BODY', text: 'Sale today' },
  ],
};
const documentTemplate = {
  name: 'invoice',
  components: [
    { type: 'HEADER', format: 'DOCUMENT' },
    { type: 'BODY', text: 'Your invoice' },
  ],
};
const plainTemplate = {
  name: 'hello',
  components: [{ type: 'BODY', text: 'Hello' }],
};

// Parameters are built on mount, so wait for the re-render.
const mountParser = async (template, props = {}) => {
  const wrapper = mount(WhatsAppTemplateParser, {
    props: { template, ...props },
    slots: {
      actions: `<template #actions="{ sendMessage, resetTemplate, goBack, isValid, disabled }">
        <button class="send" :data-valid="isValid" :data-disabled="disabled" @click="sendMessage" />
        <button class="reset" @click="resetTemplate" />
        <button class="back" @click="goBack" />
      </template>`,
    },
    global: {
      stubs: { Input },
      mocks: { $t: key => (blank.has(key) ? '' : key) },
    },
  });
  await wrapper.vm.$nextTick();
  return wrapper;
};

const inputs = wrapper => wrapper.findAllComponents(Input);
const byPlaceholder = (wrapper, text) =>
  inputs(wrapper).filter(i => (i.props('placeholder') || '').includes(text));

describe('WhatsAppTemplateParser behaviour', () => {
  it('shows the name, language and category with defaults', async () => {
    const wrapper = await mountParser(textTemplate);
    expect(wrapper.find('h3').text()).toBe('order_update');
    expect(wrapper.text()).toContain('WHATSAPP_TEMPLATES.PARSER.LANGUAGE: en');
    expect(wrapper.text()).toContain(
      'WHATSAPP_TEMPLATES.PARSER.CATEGORY: UTILITY'
    );
    const plain = await mountParser(plainTemplate);
    expect(plain.text()).toMatch(/LANGUAGE: \w+/);
    expect(plain.text()).toMatch(/CATEGORY: \w+/);
    expect(plain.text()).toContain('Hello');
    expect(inputs(plain)).toHaveLength(0);
    expect(plain.find('.send').attributes('data-disabled')).toBe('false');
    expect(plain.vm.formatType).toBe('');

    const bare = await mountParser({
      name: 'bare',
      components: [{ type: 'HEADER', format: 'TEXT' }],
    });
    expect(bare.vm.renderedHeader).toBe('');
    expect(bare.vm.renderedTemplate).toBe('');
  });

  it('fills header, body and button variables with a live preview', async () => {
    const wrapper = await mountParser(textTemplate);
    expect(wrapper.text()).toContain(
      'WHATSAPP_TEMPLATES.PARSER.HEADER_VARIABLES_LABEL'
    );
    expect(wrapper.text()).toContain(
      'WHATSAPP_TEMPLATES.PARSER.VARIABLES_LABEL'
    );
    expect(wrapper.text()).toContain(
      'WHATSAPP_TEMPLATES.PARSER.BUTTON_PARAMETERS'
    );
    expect(wrapper.find('.send').attributes('data-disabled')).toBe('true');

    const [header, body1, body2, button] = inputs(wrapper);
    await header.vm.$emit('update:modelValue', 'Ann');
    await body1.vm.$emit('update:modelValue', '42');
    await body2.vm.$emit('update:modelValue', 'shipped');
    await button.vm.$emit('update:modelValue', 'abc');
    expect(wrapper.text()).toContain('Hi Ann');
    expect(wrapper.text()).toContain('Order 42 is shipped');
    expect(wrapper.find('.send').attributes('data-valid')).toBe('true');

    await wrapper.find('.send').trigger('click');
    const [payload] = wrapper.emitted('sendMessage')[0];
    expect(payload.message).toBe('Order {{1}} is {{2}}');
    expect(payload.pendingMessageContent).toBe('Order 42 is shipped');
    expect(payload.templateParams).toEqual(
      expect.objectContaining({
        name: 'order_update',
        category: 'UTILITY',
        language: 'en',
        namespace: 'ns',
        content_mode: 'raw_template',
      })
    );
    expect(payload.templateParams.processed_params.body).toEqual({
      1: '42',
      2: 'shipped',
    });

    // Without any parameters the send is blocked and explained.
    wrapper.vm.processedParams = {};
    await wrapper.find('.send').trigger('click');
    expect(wrapper.emitted('sendMessage')).toHaveLength(1);
    expect(wrapper.text()).toContain(
      'WHATSAPP_TEMPLATES.PARSER.FORM_ERROR_MESSAGE'
    );
  });

  it('asks for the media URL and document name', async () => {
    const image = await mountParser(imageTemplate);
    expect(image.text()).toContain(
      'WHATSAPP_TEMPLATES.PARSER.MEDIA_HEADER_LABEL'
    );
    const [url] = inputs(image);
    expect(url.props('placeholder')).toContain('"type":"Image"');
    await url.vm.$emit('update:modelValue', 'https://x.co/a.png');
    expect(image.vm.processedParams.header.media_url).toBe(
      'https://x.co/a.png'
    );
    expect(url.props('modelValue')).toBe('https://x.co/a.png');
    expect(byPlaceholder(image, 'DOCUMENT_NAME')).toHaveLength(0);

    const doc = await mountParser(documentTemplate);
    const name = byPlaceholder(doc, 'DOCUMENT_NAME')[0];
    expect(name.props('modelValue')).toBe('');
    await name.vm.$emit('update:modelValue', 'invoice.pdf');
    expect(name.props('modelValue')).toBe('invoice.pdf');

    // Both setters create the header when it is missing.
    doc.vm.processedParams = {};
    doc.vm.updateMediaName('a.pdf');
    doc.vm.processedParams = {};
    doc.vm.updateMediaUrl('https://x.co/b.pdf');
    expect(doc.vm.processedParams.header).toEqual({
      media_url: 'https://x.co/b.pdf',
    });
    await doc.vm.$nextTick();
    expect(inputs(doc)[0].props('modelValue')).toBe('https://x.co/b.pdf');
    doc.vm.processedParams = {};
    await doc.vm.$nextTick();
    expect(inputs(doc).map(i => i.props('modelValue'))).toEqual(['', '']);

    blank.add('WHATSAPP_TEMPLATES.PARSER.MEDIA_HEADER_LABEL');
    expect((await mountParser(imageTemplate)).text()).toContain('Image Header');
    blank.clear();
  });

  it('resets, goes back and restarts for a new template', async () => {
    const wrapper = await mountParser(textTemplate);
    await wrapper.find('.reset').trigger('click');
    await wrapper.find('.back').trigger('click');
    expect(wrapper.emitted('resetTemplate')).toHaveLength(1);
    expect(wrapper.emitted('back')).toHaveLength(1);

    await wrapper.find('.send').trigger('click');
    expect(wrapper.vm.v$.$dirty).toBe(true);
    await wrapper.setProps({ template: imageTemplate });
    expect(wrapper.vm.v$.$dirty).toBe(false);
    expect(wrapper.vm.processedParams.body).toBeUndefined();
    expect(wrapper.vm.isDocumentTemplate).toBe(false);
  });
});
