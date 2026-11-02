/**
 * OneTeam behaviour spec for the WhatsApp template picker.
 *
 * Covers listing templates with their text or media header, body,
 * typeless "footer" component (a Chatwoot quirk), buttons, language and category, searching by name (with the
 * no-match and no-templates states), limiting the list to templates
 * with a request-contact-info button, refreshing templates with
 * success and error alerts, and selecting a template.
 */
import { ref } from 'vue';
import { flushPromises, mount } from '@vue/test-utils';
import { useAlert } from 'dashboard/composables';
import TemplatesPicker from '../TemplatesPicker.vue';

const templates = ref([]);
const dispatch = vi.fn();
let getterArgs;

vi.mock('dashboard/composables', () => ({ useAlert: vi.fn() }));
vi.mock('dashboard/composables/store', () => ({
  useStore: () => ({ dispatch }),
  useFunctionGetter: (...args) => {
    getterArgs = args;
    return templates;
  },
}));

const welcome = {
  id: 1,
  name: 'Welcome_Note',
  language: 'en',
  category: 'UTILITY',
  components: [
    { type: 'HEADER', format: 'TEXT', text: 'Hello there' },
    { type: 'BODY', text: 'Thanks {{1}}' },
    // @chatwoot/utils has no COMPONENT_TYPES.FOOTER, so the picker's footer
    // lookup matches a component without a type, not a FOOTER one.
    { type: 'FOOTER', text: 'Ignored footer' },
    { text: 'Team' },
    {
      type: 'BUTTONS',
      buttons: [
        { type: 'QUICK_REPLY', text: 'Yes' },
        { type: 'request_contact_info', text: 'Share' },
      ],
    },
  ],
};
const promo = {
  id: 2,
  name: 'promo',
  language: 'fr',
  category: 'MARKETING',
  components: [
    { type: 'HEADER', format: 'IMAGE' },
    { type: 'BUTTONS', buttons: [{ type: 'URL', text: 'Go' }] },
  ],
};
const odd = {
  id: 3,
  name: 'odd',
  language: 'de',
  category: 'UTILITY',
  components: [{ type: 'HEADER', format: 'LOCATION' }],
};

const mountPicker = (props = {}) =>
  mount(TemplatesPicker, {
    props: { inboxId: 8, ...props },
    global: { stubs: { FluentIcon: true, Icon: true } },
  });

const rows = wrapper => wrapper.findAll('button.block');

describe('TemplatesPicker behaviour', () => {
  beforeEach(() => {
    templates.value = [welcome, promo, odd];
  });

  it('lists templates with their parts', () => {
    const wrapper = mountPicker();
    expect(getterArgs[0]).toBe('inboxes/getFilteredWhatsAppTemplates');
    expect(getterArgs[1].value).toBe(8);
    const [first, second, third] = rows(wrapper);
    expect(first.text()).toContain('Welcome_Note');
    expect(first.text()).toContain('en');
    expect(first.text()).toContain('Hello there');
    expect(first.text()).toContain('Thanks {{1}}');
    expect(first.text()).toContain('Team');
    expect(first.text()).not.toContain('Ignored footer');
    expect(first.text()).toContain('Share');
    expect(first.text()).toContain('UTILITY');
    expect(second.find('.italic').text()).toBe(
      'WHATSAPP_TEMPLATES.PICKER.MEDIA_CONTENT'
    );
    expect(second.text()).not.toContain('WHATSAPP_TEMPLATES.PICKER.FOOTER');
    expect(third.text()).toContain('WHATSAPP_TEMPLATES.PICKER.HEADER');
    expect(third.find('.italic').exists()).toBe(false);
    expect(third.text()).not.toContain('WHATSAPP_TEMPLATES.PICKER.BUTTONS');
    expect(wrapper.findAll('hr')).toHaveLength(2);
  });

  it('searches by name and shows the empty states', async () => {
    const wrapper = mountPicker();
    await wrapper.find('input').setValue('WELCOME');
    expect(rows(wrapper)).toHaveLength(1);
    await wrapper.find('input').setValue('zzz');
    expect(rows(wrapper)).toHaveLength(0);
    expect(wrapper.text()).toContain(
      'WHATSAPP_TEMPLATES.PICKER.NO_TEMPLATES_FOUND'
    );
    expect(wrapper.find('strong').text()).toBe('zzz');

    templates.value = [];
    await wrapper.vm.$nextTick();
    expect(wrapper.text()).toContain(
      'WHATSAPP_TEMPLATES.PICKER.NO_TEMPLATES_AVAILABLE'
    );
  });

  it('keeps only templates that request contact info', () => {
    const wrapper = mountPicker({ requestContactInfoOnly: true });
    expect(rows(wrapper).map(r => r.find('p').text())).toEqual([
      'Welcome_Note',
    ]);
  });

  it('selects a template', async () => {
    const wrapper = mountPicker();
    await rows(wrapper)[1].trigger('click');
    expect(wrapper.emitted('onSelect')[0][0]).toEqual(promo);
  });

  it('refreshes templates', async () => {
    let resolve;
    dispatch.mockReturnValue(
      new Promise(done => {
        resolve = done;
      })
    );
    const wrapper = mountPicker();
    const refresh = wrapper.find('button[title]');
    await refresh.trigger('click');
    expect(dispatch).toHaveBeenCalledWith('inboxes/syncTemplates', 8);
    expect(refresh.attributes('disabled')).toBeDefined();
    resolve();
    await flushPromises();
    expect(useAlert).toHaveBeenCalledWith(
      'WHATSAPP_TEMPLATES.PICKER.REFRESH_SUCCESS'
    );
    expect(refresh.attributes('disabled')).toBeUndefined();

    dispatch.mockRejectedValue(new Error('down'));
    await refresh.trigger('click');
    await flushPromises();
    expect(useAlert).toHaveBeenCalledWith(
      'WHATSAPP_TEMPLATES.PICKER.REFRESH_ERROR'
    );
  });
});
