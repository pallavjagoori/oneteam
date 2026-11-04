/**
 * OneTeam behaviour spec for the connect inbox form.
 *
 * Covers listing only inboxes not yet connected, blocking an empty
 * submit with an error, submitting the chosen inbox, and cancelling.
 */
import { mount, flushPromises } from '@vue/test-utils';
import { computed } from 'vue';
import ConnectInboxForm from '../ConnectInboxForm.vue';

vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: key => key }) }));
vi.mock('dashboard/composables/store', () => ({
  useMapGetter: key =>
    computed(
      () =>
        ({
          'captainInboxes/getUIFlags': { creatingItem: false },
          'inboxes/getInboxes': [
            { id: 1, name: 'Web' },
            { id: 2, name: 'Mail' },
          ],
          'captainInboxes/getRecords': [{ id: 2 }],
        })[key]
    ),
}));

/**
 * Mounts the form.
 *
 * @returns {import('@vue/test-utils').VueWrapper}
 */
const mountForm = () =>
  mount(ConnectInboxForm, {
    props: { assistantId: 7 },
    global: {
      stubs: {
        ComboBox: {
          name: 'ComboBox',
          props: ['modelValue', 'options', 'message', 'hasError'],
          emits: ['update:modelValue'],
          template: '<div />',
        },
        Button: {
          props: ['type'],
          emits: ['click'],
          template: '<button :type="type" @click="$emit(\'click\')" />',
        },
      },
    },
  });

describe('ConnectInboxForm behaviour', () => {
  it('blocks an empty submit and then submits the chosen inbox', async () => {
    const wrapper = mountForm();
    const combo = wrapper.findComponent({ name: 'ComboBox' });
    expect(combo.props('options')).toEqual([{ value: 1, label: 'Web' }]);
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    expect(wrapper.emitted('submit')).toBeUndefined();
    expect(combo.props('message')).toBe('CAPTAIN.INBOXES.FORM.INBOX.ERROR');
    expect(combo.props('hasError')).toBe(true);
    combo.vm.$emit('update:modelValue', 1);
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    expect(wrapper.emitted('submit')).toEqual([
      [{ inboxId: 1, assistantId: 7 }],
    ]);
  });

  it('cancels', async () => {
    const wrapper = mountForm();
    await wrapper.find('button[type="button"]').trigger('click');
    expect(wrapper.emitted('cancel')).toHaveLength(1);
  });
});
