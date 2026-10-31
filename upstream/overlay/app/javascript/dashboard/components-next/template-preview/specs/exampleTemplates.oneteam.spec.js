/**
 * OneTeam spec that renders every example template shipped for the
 * template preview (the same data the Histoire stories use) through
 * TemplatePreview, so each WhatsApp and Twilio template kind is shown with
 * its variables filled in.
 */
import { mount } from '@vue/test-utils';
import VueDOMPurifyHTML from 'vue-dompurify-html';
import TemplatePreview from '../TemplatePreview.vue';
import {
  whatsAppTemplates,
  getWhatsAppVariables,
} from '../templates/whatsapp-templates';
import { twilioTemplates } from '../templates/twilio-templates';
import { PLATFORMS } from 'dashboard/services/TemplateConstants';

const render = (template, platform, variables) =>
  mount(TemplatePreview, {
    props: { template, platform, variables },
    global: {
      plugins: [VueDOMPurifyHTML],
      mocks: { $t: key => key },
      stubs: { Icon: true },
    },
  });

describe('example WhatsApp templates', () => {
  it.each(whatsAppTemplates.map(t => [t.name, t]))(
    'renders %s with its example variables',
    (_name, template) => {
      const variables = getWhatsAppVariables(template);
      const wrapper = render(template, PLATFORMS.WHATSAPP, variables);
      expect(wrapper.text().length).toBeGreaterThan(0);
      Object.values(variables)
        .filter(value => value && !/^https?:/.test(value))
        .forEach(value => expect(wrapper.text()).toContain(value));
    }
  );

  it('reads positional and named example values', () => {
    expect(
      getWhatsAppVariables({
        components: [
          { example: { body_text: [['Ada', 'A-1']] } },
          {
            example: {
              body_text_named_params: [{ param_name: 'city', example: 'Pune' }],
            },
          },
          {},
        ],
      })
    ).toEqual({ 1: 'Ada', 2: 'A-1', city: 'Pune' });
    expect(getWhatsAppVariables({})).toEqual({});
  });
});

describe('example Twilio templates', () => {
  it.each(twilioTemplates.map(t => [t.friendly_name, t]))(
    'renders %s',
    (_name, template) => {
      const wrapper = render(template, PLATFORMS.TWILIO, template.variables);
      expect(wrapper.html()).not.toBe('');
    }
  );
});
