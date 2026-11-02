/**
 * OneTeam behaviour spec for the article "pending changes" popover.
 *
 * Covers opening for a target status, closing from the X button,
 * dismissing by Escape or a click outside (but not while saving),
 * applying or discarding the draft with that status (spinner on the
 * clicked button only), reporting success or failure, and doing nothing
 * when the parent blocks it.
 */
import { ref } from 'vue';
import { flushPromises, mount } from '@vue/test-utils';
import ArticlePendingChangesPopover from '../ArticlePendingChangesPopover.vue';

const env = vi.hoisted(() => ({}));

vi.mock('dashboard/composables/store', () => ({
  useStore: () => ({ dispatch: env.dispatch }),
  useMapGetter: () => env.uiFlags,
}));
vi.mock('vue-router', async importOriginal => ({
  ...(await importOriginal()),
  useRoute: () => ({ params: { portalSlug: 'docs' } }),
}));
vi.mock('@vueuse/core', async importOriginal => ({
  ...(await importOriginal()),
  onKeyStroke: (key, handler) => {
    env.keys[key] = handler;
  },
}));
vi.mock('@vueuse/components', () => ({
  vOnClickOutside: {
    mounted: (el, binding) => {
      env.outside = binding.value;
    },
  },
}));

const Button = {
  name: 'Button',
  props: { label: String, icon: String, disabled: Boolean, isLoading: Boolean },
  emits: ['click'],
  template:
    '<button :data-icon="icon" @click="$emit(\'click\')">{{ label }}</button>',
};

const mountPopover = (blocked = () => false) => {
  env.keys = {};
  env.updating = ref(false);
  env.uiFlags = ref(id => ({ isUpdating: id === 4 && env.updating.value }));
  env.dispatch = vi.fn().mockResolvedValue();
  return mount(ArticlePendingChangesPopover, {
    props: { articleId: 4, blocked },
    global: { stubs: { Button } },
  });
};

const visible = wrapper => wrapper.element.style.display !== 'none';
const buttons = wrapper => wrapper.findAllComponents(Button);
const [CLOSE, DISCARD, APPLY] = [0, 1, 2];

describe('ArticlePendingChangesPopover behaviour', () => {
  it('opens, closes, and dismisses unless saving', async () => {
    const wrapper = mountPopover();
    expect(visible(wrapper)).toBe(false);
    env.keys.Escape();

    wrapper.vm.open('published');
    await wrapper.vm.$nextTick();
    expect(visible(wrapper)).toBe(true);
    expect(wrapper.find('h3').text()).toBe(
      'HELP_CENTER.EDIT_ARTICLE_PAGE.PENDING_CHANGES_POPOVER.TITLE'
    );
    await buttons(wrapper)[CLOSE].trigger('click');
    expect(visible(wrapper)).toBe(false);

    wrapper.vm.open('published');
    env.updating.value = true;
    await wrapper.vm.$nextTick();
    expect(buttons(wrapper).every(b => b.props('disabled'))).toBe(true);
    env.keys.Escape();
    env.outside();
    await wrapper.vm.$nextTick();
    expect(visible(wrapper)).toBe(true);

    env.updating.value = false;
    env.keys.Escape();
    await wrapper.vm.$nextTick();
    expect(visible(wrapper)).toBe(false);

    wrapper.vm.open('draft');
    env.outside();
    await wrapper.vm.$nextTick();
    expect(visible(wrapper)).toBe(false);
  });

  it('applies the draft with the requested status', async () => {
    const wrapper = mountPopover();
    wrapper.vm.open('published');
    await buttons(wrapper)[APPLY].trigger('click');
    env.updating.value = true;
    await wrapper.vm.$nextTick();
    expect(buttons(wrapper)[APPLY].props('isLoading')).toBe(true);
    expect(buttons(wrapper)[DISCARD].props('isLoading')).toBe(false);
    env.updating.value = false;
    await flushPromises();
    expect(env.dispatch).toHaveBeenCalledWith('articles/publishDraft', {
      portalSlug: 'docs',
      articleId: 4,
      status: 'published',
    });
    expect(wrapper.emitted('resolved')).toEqual([['published']]);
    expect(visible(wrapper)).toBe(false);
  });

  it('discards the draft and reports failures', async () => {
    const wrapper = mountPopover();
    wrapper.vm.open('archived');
    await buttons(wrapper)[DISCARD].trigger('click');
    env.updating.value = true;
    await wrapper.vm.$nextTick();
    expect(buttons(wrapper)[DISCARD].props('isLoading')).toBe(true);
    expect(buttons(wrapper)[APPLY].props('isLoading')).toBe(false);
    env.updating.value = false;
    await flushPromises();
    expect(env.dispatch).toHaveBeenCalledWith('articles/discardDraft', {
      portalSlug: 'docs',
      articleId: 4,
      status: 'archived',
    });

    const error = new Error('nope');
    env.dispatch.mockRejectedValueOnce(error);
    wrapper.vm.open('archived');
    await buttons(wrapper)[DISCARD].trigger('click');
    await flushPromises();
    expect(wrapper.emitted('failed')).toEqual([[error]]);
    expect(visible(wrapper)).toBe(true);
  });

  it('does nothing when blocked', async () => {
    const wrapper = mountPopover(() => true);
    wrapper.vm.open('published');
    await buttons(wrapper)[APPLY].trigger('click');
    await flushPromises();
    expect(env.dispatch).not.toHaveBeenCalled();
    expect(wrapper.emitted('resolved')).toBeUndefined();
  });
});
