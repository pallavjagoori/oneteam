/**
 * OneTeam behaviour spec for the WhatsApp campaign template fields.
 *
 * Covers the template options (with and without a provider id), the
 * empty state with and without an inbox, choosing a template (building
 * its parameters, or clearing them for an unknown key), the media
 * header URL and document name inputs with URL validation, text header
 * and body variables, and the button parameters.
 */
import { mount } from '@vue/test-utils';
import TemplateFields from '../TemplateFields.vue';

vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key, args) => (args ? `${key} ${JSON.stringify(args)}` : key),
  }),
}));

const ComboBox = {
  name: 'ComboBox',
  props: ['modelValue', 'options', 'placeholder', 'emptyState'],
  emits: ['update:modelValue'],
  template: '<div class="combo" />',
};
const Input = {
  name: 'Input',
  props: ['modelValue', 'type', 'message', 'messageType', 'placeholder'],
  emits: ['update:modelValue'],
  template: '<input class="field" />',
};

const imageTemplate = {
  id: 11,
  name: 'spring_sale',
  language: 'en',
  components: [
    { type: 'HEADER', format: 'IMAGE' },
    { type: 'BODY', text: 'Hi {{1}}' },
  ],
};
const documentTemplate = {
  name: 'invoice',
  language: 'fr',
  components: [{ type: 'HEADER', format: 'DOCUMENT' }],
};
const plainTemplate = {
  id: 13,
  name: 'plain',
  language: 'en',
  components: [{ type: 'BODY', text: 'Hello' }],
};
const templates = [imageTemplate, documentTemplate, plainTemplate];

const mountFields = (props = {}) =>
  mount(TemplateFields, {
    props: { templates, ...props },
    global: { stubs: { ComboBox, Input } },
  });

const combo = wrapper => wrapper.findComponent(ComboBox);
const fields = wrapper => wrapper.findAllComponents(Input);

describe('TemplateFields behaviour', () => {
  it('lists templates and the empty state', () => {
    const wrapper = mountFields();
    expect(combo(wrapper).props('options')).toEqual([
      { value: 11, label: 'spring sale (en)' },
      { value: 'invoice:fr', label: 'invoice (fr)' },
      { value: 13, label: 'plain (en)' },
    ]);
    expect(combo(wrapper).props('emptyState')).toBe(
      'CAMPAIGN.WHATSAPP.FORM.TEMPLATE.EMPTY_STATE'
    );
    expect(
      mountFields({ hasInbox: true })
        .findComponent(ComboBox)
        .props('emptyState')
    ).toBe('CAMPAIGN.WHATSAPP.FORM.TEMPLATE.NO_TEMPLATES');
    expect(fields(wrapper)).toHaveLength(0);
  });

  it('builds parameters for a chosen template and clears unknown ones', async () => {
    const wrapper = mountFields();
    await combo(wrapper).vm.$emit('update:modelValue', 11);
    expect(wrapper.emitted('update:templateId')).toEqual([[11]]);
    const [params] = wrapper.emitted('update:processedParams').at(-1);
    expect(params.body).toEqual({ 1: '' });
    expect(params.header).toEqual(expect.objectContaining({ media_url: '' }));

    await combo(wrapper).vm.$emit('update:modelValue', 'missing');
    expect(wrapper.emitted('update:processedParams').at(-1)).toEqual([{}]);
  });

  it('edits a media header url and validates it', async () => {
    const processedParams = { header: { media_url: 'not a url' } };
    const wrapper = mountFields({ templateId: 11, processedParams });
    const [url] = fields(wrapper);
    expect(url.props('type')).toBe('url');
    expect(url.props('messageType')).toBe('error');
    expect(url.props('message')).toBe(
      'CAMPAIGN.WHATSAPP.FORM.TEMPLATE.INVALID_MEDIA_URL'
    );
    expect(url.props('placeholder')).toContain('"type":"Image"');
    await url.vm.$emit('update:modelValue', 'https://example.com/a.png');
    expect(processedParams.header.media_url).toBe('https://example.com/a.png');

    const valid = mountFields({
      templateId: 11,
      processedParams: { header: { media_url: 'https://example.com/a.png' } },
    });
    expect(fields(valid)[0].props('messageType')).toBe('info');
    expect(fields(valid)[0].props('message')).toBe('');

    const empty = mountFields({ templateId: 11, processedParams: {} });
    expect(fields(empty)[0].props('modelValue')).toBe('');
  });

  it('names a document header', async () => {
    const processedParams = { header: {} };
    const wrapper = mountFields({ templateId: 'invoice:fr', processedParams });
    const [url, name] = fields(wrapper);
    expect(url.props('placeholder')).toContain('"type":"Document"');
    expect(name.props('modelValue')).toBe('');
    await name.vm.$emit('update:modelValue', 'invoice.pdf');
    expect(processedParams.header.media_name).toBe('invoice.pdf');

    const named = mountFields({
      templateId: 'invoice:fr',
      processedParams: { header: { media_name: 'a.pdf' } },
    });
    expect(fields(named)[1].props('modelValue')).toBe('a.pdf');
  });

  it('edits text header, body and button variables', async () => {
    const processedParams = {
      header: { 1: 'h' },
      body: { 1: 'b', name: 'n' },
      buttons: [null, { parameter: 'p' }],
    };
    const wrapper = mountFields({ templateId: 13, processedParams });
    expect(fields(wrapper).map(f => f.props('modelValue'))).toEqual([
      'h',
      'b',
      'n',
      'p',
    ]);
    expect(fields(wrapper)[3].props('placeholder')).toContain('"index":2');
    await fields(wrapper)[0].vm.$emit('update:modelValue', 'H');
    await fields(wrapper)[1].vm.$emit('update:modelValue', 'B');
    expect(processedParams.header[1]).toBe('H');
    expect(processedParams.body[1]).toBe('B');

    const noTemplate = mountFields({ processedParams: { header: { 1: 'x' } } });
    expect(fields(noTemplate)).toHaveLength(1);
    // Guards the template never reaches: no header format, no buttons.
    expect(noTemplate.vm.headerFormat).toBe('');
    expect(noTemplate.vm.buttonIndexes).toEqual([]);
  });
});
