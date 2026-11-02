/**
 * OneTeam behaviour spec for the inbox's identity validation (HMAC) key.
 *
 * Covers showing the key, copying it (success and error alerts),
 * opening the rotate dialog, rotating the key (closing the dialog with a
 * success alert, or an error alert) with the loading state, and
 * remounting the key field when the key changes.
 */
import { flushPromises, mount } from '@vue/test-utils';
import { useAlert } from 'dashboard/composables';
import { copyTextToClipboard } from 'shared/helpers/clipboard';
import HmacSecretKey from '../HmacSecretKey.vue';

const env = vi.hoisted(() => ({ dispatch: null, log: [] }));

vi.mock('dashboard/composables', () => ({ useAlert: vi.fn() }));
vi.mock('shared/helpers/clipboard', () => ({ copyTextToClipboard: vi.fn() }));
vi.mock('dashboard/composables/store', () => ({
  useStore: () => ({ dispatch: env.dispatch }),
}));

const AccessToken = {
  name: 'AccessToken',
  props: { value: String, showResetButton: Boolean },
  emits: ['onCopy'],
  mounted() {
    env.log.push(`mount:${this.value}`);
  },
  template: '<div class="token">{{ value }}<slot name="actions" /></div>',
};
const Dialog = {
  name: 'Dialog',
  props: ['title', 'isLoading', 'type'],
  emits: ['confirm'],
  methods: {
    open() {
      env.log.push('open');
    },
    close() {
      env.log.push('close');
    },
  },
  template: '<section><slot name="description" /></section>',
};
const NextButton = {
  name: 'NextButton',
  props: ['label'],
  emits: ['click'],
  template: '<button @click="$emit(\'click\')">{{ label }}</button>',
};

const mountKey = (inbox = { id: 5, hmac_token: 'abc' }) =>
  mount(HmacSecretKey, {
    props: { inbox },
    global: { stubs: { AccessToken, Dialog, NextButton } },
  });

describe('HmacSecretKey behaviour', () => {
  beforeEach(() => {
    env.log = [];
    env.dispatch = vi.fn().mockResolvedValue();
  });

  it('shows and copies the key', async () => {
    const wrapper = mountKey();
    const token = wrapper.findComponent(AccessToken);
    expect(token.props()).toEqual({ value: 'abc', showResetButton: false });
    expect(wrapper.find('section').text()).toContain(
      'INBOX_MGMT.SETTINGS_POPUP.IDENTITY_VALIDATION.ROTATE.IMPACT'
    );

    copyTextToClipboard.mockResolvedValueOnce();
    await token.vm.$emit('onCopy');
    await flushPromises();
    expect(copyTextToClipboard).toHaveBeenCalledWith('abc');
    expect(useAlert).toHaveBeenLastCalledWith(
      'COMPONENTS.CODE.COPY_SUCCESSFUL'
    );

    copyTextToClipboard.mockRejectedValueOnce(new Error('denied'));
    await token.vm.$emit('onCopy');
    await flushPromises();
    expect(useAlert).toHaveBeenLastCalledWith('COMPONENTS.CODE.COPY_ERROR');
  });

  it('rotates the key from the dialog', async () => {
    let resolve;
    env.dispatch.mockReturnValueOnce(
      new Promise(r => {
        resolve = r;
      })
    );
    const wrapper = mountKey();
    await wrapper.find('button').trigger('click');
    expect(env.log).toEqual(['mount:abc', 'open']);

    const dialog = wrapper.findComponent(Dialog);
    dialog.vm.$emit('confirm');
    await wrapper.vm.$nextTick();
    expect(dialog.props('isLoading')).toBe(true);
    resolve();
    await flushPromises();
    expect(env.dispatch).toHaveBeenCalledWith('inboxes/rotateHmacToken', 5);
    expect(env.log).toEqual(['mount:abc', 'open', 'close']);
    expect(useAlert).toHaveBeenLastCalledWith(
      'INBOX_MGMT.SETTINGS_POPUP.IDENTITY_VALIDATION.ROTATE.SUCCESS'
    );
    expect(dialog.props('isLoading')).toBe(false);

    await wrapper.setProps({ inbox: { id: 5, hmac_token: 'xyz' } });
    expect(env.log).toContain('mount:xyz');
  });

  it('alerts when rotating fails', async () => {
    env.dispatch.mockRejectedValueOnce(new Error('nope'));
    const wrapper = mountKey();
    await wrapper.findComponent(Dialog).vm.$emit('confirm');
    await flushPromises();
    expect(env.log).not.toContain('close');
    expect(useAlert).toHaveBeenLastCalledWith(
      'INBOX_MGMT.SETTINGS_POPUP.IDENTITY_VALIDATION.ROTATE.ERROR'
    );
    expect(wrapper.findComponent(Dialog).props('isLoading')).toBe(false);
  });
});
