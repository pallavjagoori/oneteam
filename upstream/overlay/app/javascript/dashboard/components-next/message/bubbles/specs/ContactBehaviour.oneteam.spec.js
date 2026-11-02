/**
 * OneTeam behaviour spec for the shared-contact (vCard) message bubble.
 *
 * Covers the contact name and number shown, hiding the save action for
 * contact-info replies or numbers with no digits, saving a new contact
 * (alert and opening it in a new tab), opening an existing match, and
 * the duplicate-number, server-message and generic error alerts.
 *
 * Note: Chatwoot passes the computed ref itself (not its value) as the
 * phone number filter value; the spec records that as-is.
 */
import { ref } from 'vue';
import { flushPromises, mount } from '@vue/test-utils';
import {
  DuplicateContactException,
  ExceptionWithMessage,
} from 'shared/helpers/CustomErrors';
import ContactBubble from '../Contact.vue';

const env = vi.hoisted(() => ({ attachments: null, dispatch: null, alert: null }));

vi.mock('../../provider.js', () => ({
  useMessageContext: () => ({ attachments: env.attachments }),
}));
vi.mock('dashboard/composables/store', () => ({
  useStore: () => ({ dispatch: (...args) => env.dispatch(...args) }),
}));
vi.mock('dashboard/composables', () => ({
  useAlert: (...args) => env.alert(...args),
}));

const BaseAttachmentBubble = {
  name: 'BaseAttachmentBubble',
  props: ['title', 'content', 'action'],
  template: '<div class="bubble"><b>{{ title }}</b><span>{{ content }}</span></div>',
};

const mountBubble = attachment => {
  env.attachments = ref([attachment]);
  return mount(ContactBubble, { global: { stubs: { BaseAttachmentBubble } } });
};
const bubble = wrapper => wrapper.findComponent(BaseAttachmentBubble);
const save = async wrapper => {
  await bubble(wrapper).props('action').onClick();
  await flushPromises();
};
const vcard = { fallbackTitle: '+1 555-0100', meta: { firstName: 'Ada', lastName: 'Lovelace' } };

describe('Contact bubble behaviour', () => {
  let open;

  beforeEach(() => {
    env.alert = vi.fn();
    env.dispatch = vi.fn();
    open = vi.spyOn(window, 'open').mockImplementation(() => null);
    window.history.pushState({}, '', '/app/accounts/3/conversations/8');
  });

  afterEach(() => {
    open.mockRestore();
  });

  it('shows the contact and hides saving when it cannot apply', () => {
    const wrapper = mountBubble(vcard);
    expect(bubble(wrapper).props('title')).toBe('Ada Lovelace');
    expect(bubble(wrapper).props('content')).toBe('+1 555-0100');
    expect(bubble(wrapper).props('action').label).toBe('CONVERSATION.SAVE_CONTACT');

    const reply = mountBubble({ ...vcard, meta: { ...vcard.meta, isContactInfoResponse: true } });
    expect(bubble(reply).props('action')).toBeNull();
    const nameless = mountBubble({ fallbackTitle: 'Phone' });
    expect(bubble(nameless).props('title')).toBe('');
    expect(bubble(nameless).props('action')).toBeNull();
    const firstOnly = mountBubble({ fallbackTitle: '42', meta: { firstName: 'Cher' } });
    expect(bubble(firstOnly).props('title')).toBe('Cher');
  });

  it('creates a missing contact and opens it', async () => {
    env.dispatch = vi.fn(async action => (action === 'contacts/filter' ? [] : { id: 77 }));
    const wrapper = mountBubble(vcard);
    await save(wrapper);
    const [filterAction, filterArgs] = env.dispatch.mock.calls[0];
    expect(filterAction).toBe('contacts/filter');
    expect(filterArgs.resetState).toBe(false);
    expect(filterArgs.queryPayload.payload[0].attribute_key).toBe('phone_number');
    expect(env.dispatch).toHaveBeenCalledWith('contacts/create', {
      name: 'Ada Lovelace',
      phone_number: '+15550100',
    });
    expect(env.alert).toHaveBeenCalledWith('CONTACT_FORM.SUCCESS_MESSAGE');
    expect(open).toHaveBeenCalledWith('/app/accounts/3/contacts/77', '_blank');
  });

  it('opens an existing contact without creating one', async () => {
    env.dispatch = vi.fn(async () => [{ id: 5 }]);
    const wrapper = mountBubble(vcard);
    await save(wrapper);
    expect(env.dispatch).toHaveBeenCalledTimes(1);
    expect(env.alert).not.toHaveBeenCalled();
    expect(open).toHaveBeenCalledWith('/app/accounts/3/contacts/5', '_blank');
  });

  it('reports duplicate, server and generic errors', async () => {
    const wrapper = mountBubble(vcard);
    env.dispatch = vi.fn(async () => {
      throw new DuplicateContactException(['phone_number']);
    });
    await save(wrapper);
    env.dispatch = vi.fn(async () => {
      throw new DuplicateContactException(['email']);
    });
    await save(wrapper);
    env.dispatch = vi.fn(async () => {
      throw new ExceptionWithMessage('Invalid number');
    });
    await save(wrapper);
    env.dispatch = vi.fn(async () => {
      throw new Error('boom');
    });
    await save(wrapper);
    expect(env.alert.mock.calls).toEqual([
      ['CONTACT_FORM.FORM.PHONE_NUMBER.DUPLICATE'],
      ['Invalid number'],
      ['CONTACT_FORM.ERROR_MESSAGE'],
    ]);
    expect(open).not.toHaveBeenCalled();
  });
});
