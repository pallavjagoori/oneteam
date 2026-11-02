/**
 * OneTeam behaviour spec for the Twilio content template picker.
 *
 * Covers listing only approved templates with their type, language,
 * body and category (or the fallbacks), searching by name, the empty
 * states (no templates at all, or none matching the search), picking a
 * template, and refreshing the templates from Twilio (success, failure
 * and the spinner while it runs).
 */
import { flushPromises, mount } from '@vue/test-utils';
import { useAlert } from 'dashboard/composables';
import ContentTemplatesPicker from '../ContentTemplatesPicker.vue';

const env = vi.hoisted(() => ({}));

vi.mock('dashboard/composables', () => ({ useAlert: vi.fn() }));
vi.mock('dashboard/composables/store', () => ({
  useStore: () => ({
    getters: { 'inboxes/getInbox': id => env.inboxes[id] },
    dispatch: (...args) => env.dispatch(...args),
  }),
}));

const template = (name, type, extra = {}) => ({
  content_sid: name,
  friendly_name: name,
  template_type: type,
  status: 'approved',
  language: 'en',
  created_at: '2026-03-01T10:00:00Z',
  ...extra,
});

const templates = [
  template('Order media', 'media', { body: 'See photo', category: 'sales' }),
  template('Quick ask', 'quick_reply'),
  template('Call us', 'call_to_action'),
  template('Plain hello', 'text'),
  template('Pending one', 'text', { status: 'pending' }),
];

const mountPicker = inboxId =>
  mount(ContentTemplatesPicker, {
    props: { inboxId },
    global: { stubs: { FluentIcon: true, Icon: true } },
  });

const cards = wrapper => wrapper.findAll('.label-body').map(el => el.text());

describe('ContentTemplatesPicker behaviour', () => {
  beforeEach(() => {
    env.inboxes = { 1: { content_templates: { templates } }, 2: {} };
    env.dispatch = vi.fn().mockResolvedValue();
  });

  it('lists approved templates, searches and picks one', async () => {
    const wrapper = mountPicker(1);
    const text = wrapper.text();
    expect(cards(wrapper)).toHaveLength(4);
    expect(text).not.toContain('Pending one');
    [
      'CONTENT_TEMPLATES.PICKER.TYPES.MEDIA',
      'CONTENT_TEMPLATES.PICKER.TYPES.QUICK_REPLY',
      'CONTENT_TEMPLATES.PICKER.TYPES.CALL_TO_ACTION',
      'CONTENT_TEMPLATES.PICKER.TYPES.TEXT',
      'CONTENT_TEMPLATES.PICKER.LABELS.LANGUAGE: en',
      'sales',
      'utility',
    ].forEach(part => expect(text).toContain(part));
    expect(cards(wrapper)[0]).toBe('See photo');
    expect(cards(wrapper)[1]).toBe('CONTENT_TEMPLATES.PICKER.NO_CONTENT');
    expect(wrapper.findAll('hr')).toHaveLength(3);

    await wrapper.find('input').setValue('CALL');
    expect(cards(wrapper)).toHaveLength(1);
    expect(wrapper.findAll('hr')).toHaveLength(0);
    await wrapper.findAll('button')[1].trigger('click');
    expect(wrapper.emitted('onSelect')[0][0].friendly_name).toBe('Call us');

    await wrapper.find('input').setValue('nothing');
    expect(wrapper.text()).toContain(
      'CONTENT_TEMPLATES.PICKER.NO_TEMPLATES_FOUND'
    );
    expect(wrapper.find('strong').text()).toBe('nothing');
  });

  it('shows the empty state for an inbox without templates', () => {
    const wrapper = mountPicker(2);
    expect(wrapper.text()).toContain(
      'CONTENT_TEMPLATES.PICKER.NO_TEMPLATES_AVAILABLE'
    );
    expect(mountPicker(9).text()).toContain(
      'CONTENT_TEMPLATES.PICKER.NO_TEMPLATES_AVAILABLE'
    );
  });

  it('shows no message when only unapproved templates exist', () => {
    env.inboxes[1].content_templates.templates = [templates[4]];
    const wrapper = mountPicker(1);
    expect(wrapper.find('.py-8').text()).toBe('');
  });

  it('refreshes templates and reports the result', async () => {
    let finish;
    env.dispatch.mockReturnValueOnce(
      new Promise(resolve => {
        finish = resolve;
      })
    );
    const wrapper = mountPicker(1);
    const refresh = wrapper.find('button[title]');
    await refresh.trigger('click');
    expect(env.dispatch).toHaveBeenCalledWith('inboxes/syncTemplates', 1);
    expect(refresh.attributes('disabled')).toBeDefined();
    finish();
    await flushPromises();
    expect(useAlert).toHaveBeenCalledWith(
      'CONTENT_TEMPLATES.PICKER.REFRESH_SUCCESS'
    );
    expect(refresh.attributes('disabled')).toBeUndefined();

    env.dispatch.mockRejectedValueOnce(new Error('down'));
    await refresh.trigger('click');
    await flushPromises();
    expect(useAlert).toHaveBeenCalledWith(
      'CONTENT_TEMPLATES.PICKER.REFRESH_ERROR'
    );
  });
});
