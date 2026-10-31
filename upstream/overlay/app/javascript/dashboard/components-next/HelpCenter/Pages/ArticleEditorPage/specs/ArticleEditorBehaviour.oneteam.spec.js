/**
 * OneTeam behaviour spec for the help-center article editor.
 *
 * Covers seeding from drafts or live values, debounced autosave for
 * existing articles and instant saves for new ones, flushing a queued
 * save on unmount, creating an article from the title (including the
 * upload-in-progress hold and retry), the route-leave guard, reseeding
 * when the article changes or a draft is published, the diff panel,
 * and the header/controls events.
 */
import { flushPromises, mount } from '@vue/test-utils';
import { useAlert } from 'dashboard/composables';
import ArticleEditor from '../ArticleEditor.vue';

const env = vi.hoisted(() => ({}));

vi.mock('vue-router', async importOriginal => ({
  ...(await importOriginal()),
  onBeforeRouteLeave: guard => {
    env.leave = guard;
  },
}));
vi.mock('dashboard/composables', () => ({ useAlert: vi.fn() }));
vi.mock('@vueuse/core', async importOriginal => {
  const { ref: appRef } = await import('vue');
  return {
    ...(await importOriginal()),
    useTimeoutFn: (fn, ms) => {
      const isPending = appRef(false);
      let timer = null;
      const stop = () => {
        clearTimeout(timer);
        isPending.value = false;
      };
      const start = () => {
        stop();
        isPending.value = true;
        timer = setTimeout(() => {
          isPending.value = false;
          fn();
        }, ms);
      };
      return { isPending, start, stop };
    },
  };
});

const Layout = {
  name: 'HelpCenterLayout',
  template: '<div><slot name="header-actions" /><slot name="content" /></div>',
};
const Header = {
  name: 'ArticleEditorHeader',
  props: ['isSaving', 'pendingChanges', 'hasPendingUploads', 'articleId'],
  emits: ['goBack', 'previewArticle', 'showDiff'],
  template: '<header />',
};
const Diff = {
  name: 'ArticleDiffPanel',
  props: ['article'],
  methods: {
    open: () => env.diff.open(),
    close: () => env.diff.close(),
  },
  template: '<aside />',
};
const Title = {
  name: 'TextArea',
  props: ['modelValue', 'autofocus'],
  emits: ['update:modelValue', 'blur'],
  template: '<textarea :value="modelValue" />',
};
const Controls = {
  name: 'ArticleEditorControls',
  emits: ['saveArticle', 'setAuthor', 'setCategory', 'previewArticle'],
  template: '<nav />',
};
const Editor = {
  name: 'FullEditor',
  props: ['modelValue', 'editorId', 'uploadsBlockedMessage', 'autofocus'],
  emits: ['update:modelValue'],
  methods: { hasPendingUploads: () => env.uploading },
  template: '<section />',
};

const mountEditor = (props = {}) =>
  mount(ArticleEditor, {
    props: {
      article: { id: 5, title: 'Live', content: 'Body', status: 'draft' },
      ...props,
    },
    global: {
      stubs: {
        HelpCenterLayout: Layout,
        ArticleEditorHeader: Header,
        ArticleDiffPanel: Diff,
        TextArea: Title,
        ArticleEditorControls: Controls,
        FullEditor: Editor,
      },
    },
  });

const saves = wrapper => wrapper.emitted('saveArticle') || [];

describe('ArticleEditor behaviour', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    env.uploading = false;
    env.diff = { open: vi.fn(), close: vi.fn() };
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('seeds from drafts, keeping a cleared draft, or from live values', () => {
    let wrapper = mountEditor({
      article: {
        id: 1,
        title: 'Live',
        content: 'Body',
        draftTitle: '',
        draftContent: 'Draft body',
      },
    });
    expect(wrapper.findComponent(Title).props('modelValue')).toBe('');
    expect(wrapper.findComponent(Editor).props('modelValue')).toBe(
      'Draft body'
    );
    expect(wrapper.findComponent(Header).props('pendingChanges')).toBe(true);

    wrapper = mountEditor();
    expect(wrapper.findComponent(Title).props('modelValue')).toBe('Live');
    expect(wrapper.findComponent(Header).props('pendingChanges')).toBe(false);
    expect(wrapper.findComponent(Editor).props('editorId')).toBe('5-0');
    expect(wrapper.findComponent(Editor).props('autofocus')).toBe(true);

    wrapper = mountEditor({ article: undefined });
    expect(wrapper.findComponent(Title).props('modelValue')).toBe('');
    expect(wrapper.findComponent(Editor).props('editorId')).toBe('new-0');
    expect(wrapper.findComponent(Title).props('autofocus')).toBe(true);
  });

  it('autosaves existing articles after a pause', async () => {
    const wrapper = mountEditor();
    await wrapper
      .findComponent(Title)
      .vm.$emit('update:modelValue', 'New title');
    await wrapper
      .findComponent(Editor)
      .vm.$emit('update:modelValue', 'New body');
    expect(wrapper.findComponent(Header).props('isSaving')).toBe(true);
    expect(saves(wrapper)).toEqual([]);
    vi.advanceTimersByTime(500);
    expect(saves(wrapper)).toEqual([
      [{ title: 'New title', content: 'New body' }],
    ]);
  });

  it('flushes a queued save on unmount', async () => {
    let wrapper = mountEditor();
    await wrapper.findComponent(Title).vm.$emit('update:modelValue', 'Edited');
    wrapper.unmount();
    expect(saves(wrapper)).toEqual([[{ title: 'Edited', content: 'Body' }]]);
    vi.advanceTimersByTime(500);
    expect(saves(wrapper)).toHaveLength(1);

    wrapper = mountEditor();
    wrapper.unmount();
    expect(saves(wrapper)).toEqual([]);
    wrapper = mountEditor({ article: {} });
    wrapper.unmount();
    expect(saves(wrapper)).toEqual([]);
  });

  it('saves new articles immediately and creates them from the title', async () => {
    const wrapper = mountEditor({ article: {} });
    await wrapper.findComponent(Title).vm.$emit('update:modelValue', 'Hello');
    expect(saves(wrapper)).toEqual([[{ title: 'Hello', content: '' }]]);
    const title = wrapper.findComponent(Title);
    await title.vm.$emit('blur', { target: { value: '   ' } });
    await title.vm.$emit('blur', {});
    await title.vm.$emit('blur');
    expect(wrapper.emitted('createArticle')).toBeUndefined();
    await title.vm.$emit('blur', { target: { value: 'Hello' } });
    expect(wrapper.emitted('createArticle')).toEqual([
      [{ title: 'Hello', content: '' }],
    ]);

    const existing = mountEditor();
    await existing
      .findComponent(Title)
      .vm.$emit('blur', { target: { value: 'Hello' } });
    expect(existing.emitted('createArticle')).toBeUndefined();
  });

  it('holds a create while uploads run and retries after', async () => {
    const wrapper = mountEditor({ article: {} });
    const editor = wrapper.findComponent(Editor);
    await editor.vm.$emit('update:modelValue', 'no pending create');
    env.uploading = true;
    await wrapper.findComponent(Title).vm.$emit('update:modelValue', 'Guide');
    await wrapper
      .findComponent(Title)
      .vm.$emit('blur', { target: { value: 'Guide' } });
    expect(useAlert).toHaveBeenCalledWith(
      'HELP_CENTER.EDIT_ARTICLE_PAGE.HEADER.UPLOAD_IN_PROGRESS'
    );
    expect(wrapper.emitted('createArticle')).toBeUndefined();
    await editor.vm.$emit('update:modelValue', 'still uploading');
    expect(wrapper.emitted('createArticle')).toBeUndefined();
    env.uploading = false;
    await editor.vm.$emit('update:modelValue', 'done');
    expect(wrapper.emitted('createArticle')).toEqual([
      [{ title: 'Guide', content: 'done' }],
    ]);
    await editor.vm.$emit('update:modelValue', 'again');
    expect(wrapper.emitted('createArticle')).toHaveLength(1);

    env.uploading = true;
    await wrapper.findComponent(Title).vm.$emit('update:modelValue', 'Draft');
    await wrapper
      .findComponent(Title)
      .vm.$emit('blur', { target: { value: 'Draft' } });
    await wrapper.findComponent(Title).vm.$emit('update:modelValue', '  ');
    env.uploading = false;
    await editor.vm.$emit('update:modelValue', 'later');
    expect(wrapper.emitted('createArticle')).toHaveLength(1);
  });

  it('guards leaving the route', async () => {
    let wrapper = mountEditor({ article: {}, isUpdating: true });
    env.uploading = true;
    expect(env.leave()).toBe(true);
    expect(wrapper.findComponent(Editor).props('uploadsBlockedMessage')).toBe(
      'HELP_CENTER.EDIT_ARTICLE_PAGE.HEADER.CREATE_IN_PROGRESS'
    );

    wrapper = mountEditor({ isUpdating: true });
    expect(wrapper.findComponent(Editor).props('uploadsBlockedMessage')).toBe(
      ''
    );
    expect(env.leave()).toBe(false);
    expect(wrapper.findComponent(Header).props('hasPendingUploads')()).toBe(
      true
    );
    env.uploading = false;
    expect(env.leave()).toBe(true);
    expect(
      mountEditor({ article: {} })
        .findComponent(Editor)
        .props('uploadsBlockedMessage')
    ).toBe('');
  });

  it('reseeds when the article changes or its draft is resolved', async () => {
    const wrapper = mountEditor({
      article: { id: 5, title: 'Live', draftTitle: 'Draft' },
    });
    await wrapper.findComponent(Title).vm.$emit('update:modelValue', 'Typing');
    await wrapper.setProps({
      article: { id: 5, title: 'Published', content: 'Done' },
    });
    await flushPromises();
    expect(wrapper.findComponent(Title).props('modelValue')).toBe('Published');
    expect(wrapper.findComponent(Editor).props('editorId')).toBe('5-1');
    expect(env.diff.close).toHaveBeenCalled();
    vi.advanceTimersByTime(500);
    expect(saves(wrapper)).toEqual([]);

    await wrapper.setProps({ article: { id: 6, title: 'Other' } });
    await flushPromises();
    expect(wrapper.findComponent(Title).props('modelValue')).toBe('Other');
    expect(wrapper.findComponent(Editor).props('editorId')).toBe('6-2');

    await wrapper.setProps({
      article: { id: 6, title: 'Other', status: 'published' },
    });
    await wrapper.setProps({ article: undefined });
    await flushPromises();
    expect(wrapper.findComponent(Editor).props('editorId')).toBe('new-2');
    expect(env.diff.close).toHaveBeenCalledTimes(1);
  });

  it('passes header and control events through', async () => {
    const wrapper = mountEditor();
    const header = wrapper.findComponent(Header);
    const controls = wrapper.findComponent(Controls);
    await header.vm.$emit('goBack');
    await header.vm.$emit('previewArticle');
    await header.vm.$emit('showDiff');
    await controls.vm.$emit('saveArticle', { slug: 'x' });
    await controls.vm.$emit('setAuthor', 3);
    await controls.vm.$emit('setCategory', 4);
    await controls.vm.$emit('previewArticle');
    expect(env.diff.open).toHaveBeenCalled();
    expect(wrapper.emitted('goBack')).toHaveLength(1);
    expect(wrapper.emitted('previewArticle')).toHaveLength(2);
    expect(saves(wrapper)).toEqual([[{ slug: 'x' }]]);
    expect(wrapper.emitted('setAuthor')).toEqual([[3]]);
    expect(wrapper.emitted('setCategory')).toEqual([[4]]);
  });
});
