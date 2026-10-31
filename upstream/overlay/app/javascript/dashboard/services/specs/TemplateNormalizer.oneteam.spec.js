/**
 * OneTeam spec for turning WhatsApp and Twilio message templates into one
 * shape (TemplateNormalizer) and telling their kinds apart
 * (TemplateTypeDetector).
 */
import { TemplateNormalizer } from '../TemplateNormalizer';
import { TemplateTypeDetector } from '../TemplateTypeDetector';
import { PLATFORMS, TEMPLATE_TYPES } from '../TemplateConstants';

describe('TemplateTypeDetector', () => {
  const whatsapp = components =>
    TemplateTypeDetector.detectWhatsAppType({ components });

  it('detects WhatsApp video and document headers', () => {
    expect(whatsapp([{ type: 'HEADER', format: 'VIDEO' }])).toBe(
      TEMPLATE_TYPES.WHATSAPP_MEDIA_VIDEO
    );
    expect(whatsapp([{ type: 'HEADER', format: 'DOCUMENT' }])).toBe(
      TEMPLATE_TYPES.WHATSAPP_MEDIA_DOCUMENT
    );
  });

  it('detects copy-code buttons apart from other buttons', () => {
    expect(
      whatsapp([{ type: 'BUTTONS', buttons: [{ type: 'COPY_CODE' }] }])
    ).toBe(TEMPLATE_TYPES.WHATSAPP_COPY_CODE);
    expect(whatsapp([{ type: 'BUTTONS' }])).toBe(
      TEMPLATE_TYPES.WHATSAPP_INTERACTIVE
    );
  });

  it.each([
    [{ template_type: 'twilio/media' }, TEMPLATE_TYPES.TWILIO_MEDIA],
    [
      { types: { 'twilio/quick-reply': {} } },
      TEMPLATE_TYPES.TWILIO_QUICK_REPLY,
    ],
    [
      { template_type: 'twilio/call-to-action' },
      TEMPLATE_TYPES.TWILIO_CALL_TO_ACTION,
    ],
    [{ template_type: 'twilio/catalog' }, TEMPLATE_TYPES.TWILIO_CARD],
    [{ template_type: 'twilio/text' }, TEMPLATE_TYPES.TWILIO_TEXT],
    [{}, TEMPLATE_TYPES.TWILIO_TEXT],
  ])('detects the Twilio type of %j', (template, type) => {
    expect(TemplateTypeDetector.detectTwilioType(template)).toBe(type);
  });
});

describe('TemplateNormalizer', () => {
  it('normalizes a Twilio template from its type data', () => {
    const template = {
      content_sid: 'HX1',
      friendly_name: 'order_ready',
      types: {
        'twilio/call-to-action': {
          body: 'Your order {{1}} is ready',
          actions: [{ type: 'URL', url: 'https://shop.test' }],
        },
      },
      variables: { 1: 'A-100' },
    };
    expect(TemplateNormalizer.normalize(template, PLATFORMS.TWILIO)).toEqual({
      contentSid: 'HX1',
      name: 'order_ready',
      platform: 'twilio',
      type: TEMPLATE_TYPES.TWILIO_CALL_TO_ACTION,
      body: 'Your order {{1}} is ready',
      media: [],
      mediaType: null,
      actions: [{ type: 'URL', url: 'https://shop.test' }],
      variables: { 1: 'A-100' },
      category: 'utility',
      language: 'en',
      originalTemplate: template,
    });
  });

  it('finds Twilio type data under either spelling and keeps given fields', () => {
    const template = {
      template_type: 'twilio/quick-reply',
      types: { 'twilio/quick_reply': { body: 'Pick one', media: ['m.png'] } },
      body: 'Top-level body',
      media_type: 'image',
      category: 'marketing',
      language: 'fr',
    };
    expect(TemplateNormalizer.normalizeTwilio(template)).toMatchObject({
      body: 'Top-level body',
      media: ['m.png'],
      mediaType: 'image',
      category: 'marketing',
      language: 'fr',
    });
    expect(TemplateNormalizer.normalizeTwilio({}).body).toBeUndefined();
  });

  it('takes URL button variables and their examples', () => {
    const variables = TemplateNormalizer.extractWhatsAppVariables({
      components: [
        {
          type: 'BUTTONS',
          buttons: [
            { type: 'URL', url: 'https://shop.test/{{1}}', example: ['o-9'] },
            { type: 'URL', url: 'https://shop.test/{{2}}' },
            { type: 'URL', url: 'https://shop.test/static' },
            { type: 'QUICK_REPLY', text: 'Yes' },
          ],
        },
      ],
    });
    expect(variables).toEqual({ 1: 'o-9', 2: '' });
  });

  it('rejects an unknown platform', () => {
    expect(() => TemplateNormalizer.normalize({}, 'telegram')).toThrow(
      'Unsupported platform: telegram'
    );
  });
});
