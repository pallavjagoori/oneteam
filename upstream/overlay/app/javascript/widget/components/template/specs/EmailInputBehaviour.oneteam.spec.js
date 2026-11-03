/**
 * OneTeam behaviour spec for the widget EmailInput template.
 *
 * Covers email validation, submit dispatch, the swallowed dispatch error
 * and the submitted state.
 */
import { mount, flushPromises } from '@vue/test-utils';
import EmailInput from '../EmailInput.vue';

/**
 * Mounts EmailInput with a fake Vuex store.
 *
 * @param {object} options
 * @param {Function} [options.dispatch] store dispatch mock
 * @param {object} [options.attrs] message content attributes
 * @returns {import('@vue/test-utils').VueWrapper}
 */
const mountInput = ({ dispatch = vi.fn(), attrs = {} } = {}) =>
  mount(EmailInput, {
    props: { messageId: 7, messageContentAttributes: attrs },
    global: {
      mocks: {
        $t: key => key,
        $store: {
          getters: { 'appConfig/getWidgetColor': '#1f93ff' },
          dispatch,
        },
      },
      stubs: { FluentIcon: true, Spinner: true },
    },
  });

describe('EmailInput behaviour', () => {
  it('does not dispatch while the email is invalid', async () => {
    const dispatch = vi.fn();
    const wrapper = mountInput({ dispatch });
    await wrapper.find('input').setValue('not-an-email');
    await wrapper.find('input').trigger('keydown.enter');
    await flushPromises();
    expect(dispatch).not.toHaveBeenCalled();
    expect(wrapper.find('input').classes()).toContain('error');
  });

  it('dispatches the email update and resets the loading flag', async () => {
    const dispatch = vi.fn().mockResolvedValue({});
    const wrapper = mountInput({ dispatch });
    await wrapper.find('input').setValue('jane@example.com');
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    expect(dispatch).toHaveBeenCalledWith('message/update', {
      email: 'jane@example.com',
      messageId: 7,
    });
    expect(wrapper.vm.isUpdating).toBe(false);
  });

  it('ignores a failed update', async () => {
    const dispatch = vi.fn().mockRejectedValue(new Error('nope'));
    const wrapper = mountInput({ dispatch });
    await wrapper.find('input').setValue('jane@example.com');
    await wrapper.vm.onSubmit();
    expect(dispatch).toHaveBeenCalled();
    expect(wrapper.vm.isUpdating).toBe(false);
  });

  it('shows a spinner while updating', async () => {
    const wrapper = mountInput();
    await wrapper.setData({ isUpdating: true });
    expect(wrapper.findComponent({ name: 'Spinner' }).exists()).toBe(true);
  });

  it('shows the form without content attributes', () => {
    const wrapper = mount(EmailInput, {
      props: { messageId: 1 },
      global: {
        mocks: {
          $t: key => key,
          $store: {
            getters: { 'appConfig/getWidgetColor': '#000' },
            dispatch: vi.fn(),
          },
        },
        stubs: { FluentIcon: true, Spinner: true },
      },
    });
    expect(wrapper.find('form').exists()).toBe(true);
  });

  it('hides the form once an email was submitted', () => {
    const wrapper = mountInput({ attrs: { submitted_email: 'a@b.co' } });
    expect(wrapper.find('form').exists()).toBe(false);
  });
});
