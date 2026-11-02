/**
 * OneTeam behaviour spec for the expanded CSAT response row (review
 * notes).
 *
 * Covers the paywall on Chatwoot Cloud without the feature, nothing on
 * self-hosted installs without it, starting in the editor when there are
 * no notes, showing saved notes with who updated them and when, editing
 * and cancelling (back to the saved notes), saving only when changed
 * (alert, loading state) and a failed save.
 */
import { flushPromises, mount } from '@vue/test-utils';
import { useAlert } from 'dashboard/composables';
import CsatExpandedRow from '../CsatExpandedRow.vue';

const env = vi.hoisted(() => ({}));

vi.mock('dashboard/composables', () => ({ useAlert: vi.fn() }));
vi.mock('vuex', async importOriginal => ({
  ...(await importOriginal()),
  useStore: () => ({ dispatch: env.dispatch }),
}));
vi.mock('dashboard/composables/useAccount', async () => {
  const { computed } = await import('vue');
  return {
    useAccount: () => ({
      isCloudFeatureEnabled: () => env.enabled,
      isOnChatwootCloud: computed(() => env.cloud),
    }),
  };
});
vi.mock('shared/composables/useMessageFormatter', () => ({
  useMessageFormatter: () => ({ formatMessage: text => `<p>${text}</p>` }),
}));

const Editor = {
  name: 'Editor',
  props: ['modelValue'],
  emits: ['update:modelValue'],
  template: '<div class="editor"><slot name="actions" /></div>',
};
const Button = {
  name: 'Button',
  props: ['label', 'disabled', 'loading'],
  emits: ['click'],
  template:
    '<button :disabled="disabled" @click="$emit(\'click\', $event)">{{ label }}</button>',
};

const response = {
  id: 9,
  csat_review_notes: 'Called back',
  review_notes_updated_by: { name: 'Ann' },
  review_notes_updated_at: 1_772_618_400,
};

const mountRow = (value = response) =>
  mount(CsatExpandedRow, {
    props: { response: value },
    global: {
      directives: {
        tooltip: {},
        dompurifyHtml: (el, binding) => {
          el.innerHTML = binding.value;
        },
      },
      stubs: {
        Editor,
        Button,
        NextButton: Button,
        CsatReviewNotesPaywall: { template: '<div class="paywall" />' },
      },
    },
  });

const buttons = wrapper => wrapper.findAllComponents(Button);
const editor = wrapper => wrapper.findComponent(Editor);

describe('CsatExpandedRow behaviour', () => {
  beforeEach(() => {
    env.enabled = true;
    env.cloud = true;
    env.dispatch = vi.fn().mockResolvedValue();
  });

  it('shows the paywall or nothing without the feature', () => {
    env.enabled = false;
    expect(mountRow().find('.paywall').exists()).toBe(true);
    env.cloud = false;
    const selfHosted = mountRow();
    expect(selfHosted.find('.paywall').exists()).toBe(false);
    expect(selfHosted.find('.editor').exists()).toBe(false);
  });

  it('shows saved notes, edits and cancels', async () => {
    const wrapper = mountRow();
    expect(wrapper.find('p').html()).toContain('Called back');
    expect(wrapper.text()).toContain('Ann');
    expect(wrapper.find('.editor').exists()).toBe(false);

    await wrapper.find('.cursor-pointer').trigger('click');
    expect(editor(wrapper).props('modelValue')).toBe('Called back');
    expect(wrapper.text()).not.toContain('UPDATED_BY_LABEL');
    expect(buttons(wrapper)[1].props('disabled')).toBe(true);

    await editor(wrapper).vm.$emit('update:modelValue', 'Changed');
    await buttons(wrapper)[0].trigger('click');
    expect(wrapper.find('.editor').exists()).toBe(false);
    await wrapper.find('.cursor-pointer').trigger('click');
    expect(editor(wrapper).props('modelValue')).toBe('Called back');
  });

  it('saves new notes and reports failures', async () => {
    const wrapper = mountRow({ id: 4 });
    expect(buttons(wrapper)).toHaveLength(1);
    editor(wrapper).element.parentElement.click();
    // Cancelling without saved notes clears the draft but keeps editing.
    await editor(wrapper).vm.$emit('update:modelValue', 'Draft');
    wrapper.vm.cancelEditing();
    await wrapper.vm.$nextTick();
    expect(editor(wrapper).props('modelValue')).toBe('');
    await editor(wrapper).vm.$emit('update:modelValue', 'Follow up');
    let finish;
    env.dispatch.mockReturnValueOnce(
      new Promise(resolve => {
        finish = resolve;
      })
    );
    await buttons(wrapper)[0].trigger('click');
    expect(env.dispatch).toHaveBeenCalledWith('csat/update', {
      id: 4,
      reviewNotes: 'Follow up',
    });
    expect(buttons(wrapper)[0].props()).toMatchObject({
      disabled: true,
      loading: true,
    });
    finish();
    await flushPromises();
    expect(useAlert).toHaveBeenCalledWith('CSAT_REPORTS.REVIEW_NOTES.SAVED');
    // Without saved notes on the response the editor stays open.
    expect(buttons(wrapper)[0].props('loading')).toBe(false);

    env.dispatch.mockRejectedValueOnce(new Error('no'));
    await buttons(wrapper)[0].trigger('click');
    await flushPromises();
    expect(useAlert).toHaveBeenCalledWith(
      'CSAT_REPORTS.REVIEW_NOTES.SAVE_ERROR'
    );
  });

  it('hides who updated notes when unknown', () => {
    const wrapper = mountRow({ id: 5, csat_review_notes: 'Ok' });
    expect(wrapper.text()).not.toContain('UPDATED_BY_LABEL');
  });
});
