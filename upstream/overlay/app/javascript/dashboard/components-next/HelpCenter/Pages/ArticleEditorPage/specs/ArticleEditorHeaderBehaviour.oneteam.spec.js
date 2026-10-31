/**
 * OneTeam behaviour spec for the article editor header.
 *
 * Covers the back / preview / diff buttons, the save status text, the
 * primary publish action (plain publish, promoting a leftover draft and
 * publishing pending changes), the status menu (including discard and
 * the pending-changes popover hand-off) and the busy / upload guards.
 */
import { reactive } from 'vue';
import { mount, flushPromises } from '@vue/test-utils';
import ArticleEditorHeader from '../ArticleEditorHeader.vue';

const env = vi.hoisted(() => ({}));

vi.mock('vue-i18n', async importOriginal => ({
  ...(await importOriginal()),
  useI18n: () => ({ t: key => key }),
}));
vi.mock('vue-router', async importOriginal => ({
  ...(await importOriginal()),
  useRoute: () => ({ params: { portalSlug: 'docs' } }),
}));
vi.mock('dashboard/composables', () => ({
  useAlert: vi.fn(),
  useTrack: vi.fn(),
}));
vi.mock('dashboard/composables/store.js', async () => {
  const { computed } = await import('vue');
  return {
    useMapGetter: () =>
      computed(() => id => ({ isUpdating: env.state.updating.includes(id) })),
    useStore: () => env.store,
  };
});

const { useAlert, useTrack } = await import('dashboard/composables');

const H = 'HELP_CENTER.EDIT_ARTICLE_PAGE.HEADER';

const ButtonStub = {
  name: 'Button',
  props: ['label', 'icon', 'disabled', 'isLoading'],
  emits: ['click'],
  template:
    '<button class="btn" :data-label="label" :data-icon="icon" :data-loading="String(!!isLoading)" :disabled="disabled" @click="$emit(\'click\', $event)">{{ label }}</button>',
};
const Popover = {
  name: 'ArticlePendingChangesPopover',
  props: ['articleId', 'blocked'],
  emits: ['resolved', 'failed'],
  methods: { open: (...a) => env.popoverOpen(...a) },
  template: '<div />',
};

const mountHeader = (props = {}) =>
  mount(ArticleEditorHeader, {
    props: { articleId: 12, status: 'draft', ...props },
    global: {
      stubs: {
        Button: ButtonStub,
        ButtonGroup: { template: '<div><slot /></div>' },
        OnClickOutside: {
          name: 'OnClickOutside',
          emits: ['trigger'],
          template: '<div><slot /></div>',
        },
        DropdownMenu: {
          name: 'DropdownMenu',
          props: ['menuItems'],
          emits: ['action'],
          template: '<ul class="menu" />',
        },
        ArticlePendingChangesPopover: Popover,
      },
    },
  });

const primary = wrapper =>
  wrapper.find(
    `[data-label="${H}.PUBLISH"], [data-label="${H}.PUBLISH_CHANGES"]`
  );
const chevron = wrapper => wrapper.find('[data-icon="i-lucide-chevron-down"]');
const menu = wrapper => wrapper.findComponent({ name: 'DropdownMenu' });
const openMenu = async wrapper => {
  await chevron(wrapper).trigger('click');
  return menu(wrapper);
};

describe('ArticleEditorHeader behaviour', () => {
  beforeEach(() => {
    env.state = reactive({ updating: [] });
    env.store = { dispatch: vi.fn(async () => {}) };
    env.popoverOpen = vi.fn();
  });

  it('emits navigation events and shows the save status', async () => {
    const wrapper = mountHeader();
    expect(wrapper.text()).not.toContain(`${H}.STATUS.SAVED`);
    await wrapper.find(`[data-label="${H}.BACK_TO_ARTICLES"]`).trigger('click');
    await wrapper.find(`[data-label="${H}.PREVIEW"]`).trigger('click');
    expect(wrapper.emitted('goBack')).toHaveLength(1);
    expect(wrapper.emitted('previewArticle')).toHaveLength(1);

    await wrapper.setProps({ isSaved: true });
    expect(wrapper.text()).toContain(`${H}.STATUS.SAVED`);
    await wrapper.setProps({ isUpdating: true });
    expect(wrapper.text()).toContain(`${H}.STATUS.SAVING`);
  });

  it('disables actions for an unsaved article', () => {
    const wrapper = mountHeader({ articleId: 0 });
    expect(
      wrapper.find(`[data-label="${H}.PREVIEW"]`).attributes()
    ).toHaveProperty('disabled');
    expect(primary(wrapper).attributes()).toHaveProperty('disabled');
    expect(chevron(wrapper).attributes()).toHaveProperty('disabled');
  });

  it('publishes a draft and tracks it', async () => {
    let resolve;
    env.store.dispatch.mockReturnValueOnce(
      new Promise(r => {
        resolve = r;
      })
    );
    const wrapper = mountHeader();
    await primary(wrapper).trigger('click');
    expect(primary(wrapper).attributes('data-loading')).toBe('true');
    expect(env.store.dispatch).toHaveBeenCalledWith('articles/update', {
      portalSlug: 'docs',
      articleId: 12,
      status: 1,
    });
    resolve();
    await flushPromises();
    expect(useAlert).toHaveBeenCalledWith(
      'HELP_CENTER.PUBLISH_ARTICLE.API.SUCCESS'
    );
    expect(useTrack).toHaveBeenCalledWith('Published an article');
    expect(primary(wrapper).attributes('data-loading')).toBe('false');
  });

  it('promotes leftover draft edits when publishing a non-published article', async () => {
    const wrapper = mountHeader({ status: 'archived', pendingChanges: true });
    expect(wrapper.text()).not.toContain(`${H}.PENDING_CHANGES`);
    await primary(wrapper).trigger('click');
    expect(env.store.dispatch).toHaveBeenCalledWith('articles/publishDraft', {
      portalSlug: 'docs',
      articleId: 12,
      status: 1,
    });
  });

  it('reports status update failures', async () => {
    const wrapper = mountHeader();
    env.store.dispatch.mockRejectedValueOnce(new Error('denied'));
    await primary(wrapper).trigger('click');
    await flushPromises();
    expect(useAlert).toHaveBeenLastCalledWith('denied');
    env.store.dispatch.mockRejectedValueOnce(undefined);
    await primary(wrapper).trigger('click');
    await flushPromises();
    expect(useAlert).toHaveBeenLastCalledWith(
      'HELP_CENTER.PUBLISH_ARTICLE.API.ERROR'
    );
    expect(useTrack).not.toHaveBeenCalled();
  });

  it('blocks actions while saving, updating or uploading', async () => {
    const wrapper = mountHeader({ isSaving: true });
    await primary(wrapper).trigger('click');
    expect(useAlert).toHaveBeenLastCalledWith(`${H}.SAVE_IN_PROGRESS`);

    await wrapper.setProps({ isSaving: false });
    env.state.updating = [12];
    await flushPromises();
    await primary(wrapper).trigger('click');
    expect(useAlert).toHaveBeenCalledTimes(2);

    env.state.updating = [];
    await wrapper.setProps({ hasPendingUploads: () => true });
    await primary(wrapper).trigger('click');
    expect(useAlert).toHaveBeenLastCalledWith(`${H}.UPLOAD_IN_PROGRESS`);

    (await openMenu(wrapper)).vm.$emit('action', {
      action: 'update-status',
      value: 'archived',
    });
    await flushPromises();
    expect(useAlert).toHaveBeenCalledTimes(4);
    expect(menu(wrapper).exists()).toBe(false);
    expect(env.store.dispatch).not.toHaveBeenCalled();

    // The popover runs the same guard before applying a draft.
    const blocked = wrapper.findComponent(Popover).props('blocked');
    await wrapper.setProps({ hasPendingUploads: () => false });
    expect(blocked()).toBe(false);
  });

  it('toggles the menu and closes it on outside click', async () => {
    const wrapper = mountHeader({ status: 'archived' });
    expect((await openMenu(wrapper)).props('menuItems')).toEqual([
      {
        label:
          'HELP_CENTER.ARTICLES_PAGE.ARTICLE_CARD.CARD.DROPDOWN_MENU.DRAFT',
        value: 'draft',
        action: 'update-status',
        icon: 'i-lucide-pencil-line',
      },
    ]);
    await chevron(wrapper).trigger('click');
    expect(menu(wrapper).exists()).toBe(false);
    await chevron(wrapper).trigger('click');
    wrapper.findComponent({ name: 'OnClickOutside' }).vm.$emit('trigger');
    await flushPromises();
    expect(menu(wrapper).exists()).toBe(false);
  });

  it('has no menu items for an unknown status', async () => {
    const wrapper = mountHeader({ status: '' });
    expect((await openMenu(wrapper)).props('menuItems')).toEqual([]);
  });

  it.each([
    [
      'archived',
      2,
      'ARCHIVE_ARTICLE',
      ['Archived an article', { uiFrom: 'header' }],
    ],
    ['draft', 0, 'DRAFT_ARTICLE', null],
  ])('changes status to %s from the menu', async (value, code, key, track) => {
    const wrapper = mountHeader({ status: 'published' });
    (await openMenu(wrapper)).vm.$emit('action', {
      action: 'update-status',
      value,
    });
    await flushPromises();
    expect(env.store.dispatch).toHaveBeenCalledWith('articles/update', {
      portalSlug: 'docs',
      articleId: 12,
      status: code,
    });
    expect(useAlert).toHaveBeenCalledWith(`HELP_CENTER.${key}.API.SUCCESS`);
    if (track) expect(useTrack).toHaveBeenCalledWith(...track);
    else expect(useTrack).not.toHaveBeenCalled();
  });

  it('disables publish for an already published article', () => {
    const wrapper = mountHeader({ status: 'published' });
    expect(primary(wrapper).attributes()).toHaveProperty('disabled');
  });

  describe('with pending changes on a published article', () => {
    const props = { status: 'published', pendingChanges: true };

    it('shows the diff button and publishes the changes', async () => {
      const wrapper = mountHeader(props);
      await wrapper.find(`button[title="${H}.VIEW_CHANGES"]`).trigger('click');
      expect(wrapper.emitted('showDiff')).toHaveLength(1);
      expect(primary(wrapper).attributes('data-label')).toBe(
        `${H}.PUBLISH_CHANGES`
      );

      let resolve;
      env.store.dispatch.mockReturnValueOnce(
        new Promise(r => {
          resolve = r;
        })
      );
      await primary(wrapper).trigger('click');
      expect(primary(wrapper).attributes('data-loading')).toBe('true');
      resolve();
      await flushPromises();
      expect(env.store.dispatch).toHaveBeenCalledWith('articles/publishDraft', {
        portalSlug: 'docs',
        articleId: 12,
      });
      expect(useAlert).toHaveBeenCalledWith(`${H}.PUBLISH_CHANGES_SUCCESS`);
      expect(useTrack).toHaveBeenCalledWith('Published an article');
      expect(primary(wrapper).attributes('data-loading')).toBe('false');
    });

    it('reports publish-changes failures', async () => {
      const wrapper = mountHeader(props);
      env.store.dispatch.mockRejectedValueOnce(new Error('conflict'));
      await primary(wrapper).trigger('click');
      await flushPromises();
      expect(useAlert).toHaveBeenLastCalledWith('conflict');
      env.store.dispatch.mockRejectedValueOnce(null);
      await primary(wrapper).trigger('click');
      await flushPromises();
      expect(useAlert).toHaveBeenLastCalledWith(`${H}.PUBLISH_CHANGES_ERROR`);
    });

    it('offers discard and asks the popover before a status change', async () => {
      const wrapper = mountHeader(props);
      const items = (await openMenu(wrapper)).props('menuItems');
      expect(items.map(i => i.value)).toEqual([
        'archived',
        'draft',
        'discard-draft',
      ]);
      menu(wrapper).vm.$emit('action', {
        action: 'update-status',
        value: 'archived',
      });
      await flushPromises();
      expect(env.popoverOpen).toHaveBeenCalledWith(2);
      expect(env.store.dispatch).not.toHaveBeenCalled();
    });

    it('discards the draft', async () => {
      const wrapper = mountHeader(props);
      (await openMenu(wrapper)).vm.$emit('action', {
        action: 'discard-draft',
        value: 'discard-draft',
      });
      await flushPromises();
      expect(env.store.dispatch).toHaveBeenCalledWith('articles/discardDraft', {
        portalSlug: 'docs',
        articleId: 12,
      });
      expect(useAlert).toHaveBeenCalledWith(`${H}.DISCARD_CHANGES_SUCCESS`);

      env.store.dispatch.mockRejectedValueOnce(new Error('gone'));
      (await openMenu(wrapper)).vm.$emit('action', {
        action: 'discard-draft',
      });
      await flushPromises();
      expect(useAlert).toHaveBeenLastCalledWith('gone');

      env.store.dispatch.mockRejectedValueOnce(undefined);
      (await openMenu(wrapper)).vm.$emit('action', {
        action: 'discard-draft',
      });
      await flushPromises();
      expect(useAlert).toHaveBeenLastCalledWith(`${H}.DISCARD_CHANGES_ERROR`);
    });
  });

  it('surfaces the popover outcome', async () => {
    const wrapper = mountHeader();
    const popover = wrapper.findComponent(Popover);
    expect(popover.props('articleId')).toBe(12);

    popover.vm.$emit('resolved', 2);
    expect(useAlert).toHaveBeenLastCalledWith(
      'HELP_CENTER.ARCHIVE_ARTICLE.API.SUCCESS'
    );
    expect(useTrack).toHaveBeenLastCalledWith('Archived an article', {
      uiFrom: 'header',
    });
    popover.vm.$emit('resolved', 1);
    expect(useTrack).toHaveBeenLastCalledWith('Published an article');
    popover.vm.$emit('resolved', 0);
    expect(useAlert).toHaveBeenLastCalledWith(
      'HELP_CENTER.DRAFT_ARTICLE.API.SUCCESS'
    );
    popover.vm.$emit('resolved', undefined);
    expect(useAlert).toHaveBeenLastCalledWith('');
    expect(useTrack).toHaveBeenCalledTimes(2);

    popover.vm.$emit('failed', new Error('bad'));
    expect(useAlert).toHaveBeenLastCalledWith('bad');
    popover.vm.$emit('failed', undefined);
    expect(useAlert).toHaveBeenLastCalledWith(`${H}.PUBLISH_CHANGES_ERROR`);
  });
});
