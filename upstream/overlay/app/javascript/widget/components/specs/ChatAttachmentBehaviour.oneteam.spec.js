/**
 * OneTeam behaviour spec for the widget's attachment button.
 *
 * Covers pasting files (only when attachments are allowed, legacy
 * clipboard events, non-file items), direct uploads (success, upload
 * error, size limit, thrown errors, missing file) and regular uploads
 * (success, size limit, failing handler, missing file), the auth header
 * for direct uploads, the spinner, and removing the paste listener.
 */
import { flushPromises, mount } from '@vue/test-utils';
import { emitter } from 'shared/helpers/mitt';
import { checkFileSizeLimit } from 'shared/helpers/FileHelper';
import ChatAttachment from '../ChatAttachment.vue';

const env = vi.hoisted(() => ({}));

vi.mock('shared/helpers/mitt', () => ({ emitter: { emit: vi.fn() } }));
vi.mock('shared/helpers/FileHelper', () => ({
  checkFileSizeLimit: vi.fn(() => true),
  resolveMaximumFileUploadSize: size => size || 40,
}));
vi.mock('../../composables/useAttachments', () => ({
  useAttachments: () => ({ canHandleAttachments: env.canAttach }),
}));
vi.mock('activestorage', () => ({
  DirectUpload: class {
    constructor(file, url, delegate) {
      env.upload = { file, url, delegate };
      this.delegate = delegate;
    }

    create(callback) {
      env.finish = callback;
      env.created = this.delegate;
      if (env.uploadThrows) throw new Error('boom');
    }
  },
}));

const Upload = {
  name: 'FileUpload',
  props: ['accept', 'size'],
  emits: ['inputFile'],
  methods: { add: file => env.added.push(file) },
  template: '<div><slot /></div>',
};

const mountButton = (config = {}, onAttach = vi.fn()) =>
  mount(ChatAttachment, {
    props: { onAttach },
    global: {
      stubs: { FileUpload: Upload, FluentIcon: true, Spinner: true },
      mocks: {
        $store: { getters: { 'globalConfig/get': config } },
        $t: (key, args) => `${key}:${JSON.stringify(args)}`,
      },
    },
  });

const file = { file: new Blob(['x']), type: 'image/png' };
const paste = data => {
  const event = new Event('paste', { cancelable: true });
  Object.assign(event, data);
  document.dispatchEvent(event);
  return event;
};

describe('ChatAttachment behaviour', () => {
  beforeEach(() => {
    env.canAttach = true;
    env.added = [];
    env.uploadThrows = false;
    window.URL.createObjectURL = vi.fn(() => 'blob:thumb');
    window.chatwootWebChannel = { websiteToken: 'tok' };
    window.authToken = 'auth';
  });

  it('adds pasted files when attachments are allowed', () => {
    const wrapper = mountButton();
    const image = { kind: 'file', getAsFile: () => 'IMG' };
    const text = { kind: 'string' };
    const event = paste({ clipboardData: { items: [image, text] } });
    expect(env.added).toEqual(['IMG']);
    expect(event.defaultPrevented).toBe(true);
    paste({ originalEvent: { clipboardData: { items: [image] } } });
    expect(env.added).toHaveLength(2);
    wrapper.unmount();
    paste({ clipboardData: { items: [image] } });
    expect(env.added).toHaveLength(2);

    env.canAttach = false;
    const blocked = mountButton();
    paste({ clipboardData: { items: [image] } });
    expect(env.added).toHaveLength(2);
    blocked.unmount();
  });

  it('uploads directly to storage', async () => {
    const onAttach = vi.fn();
    const wrapper = mountButton(
      { directUploadsEnabled: true, maximumFileUploadSize: 10 },
      onAttach
    );
    expect(wrapper.findComponent(Upload).props('accept')).toBeTruthy();
    await wrapper.findComponent(Upload).vm.$emit('inputFile', file);
    await flushPromises();
    expect(env.upload.url).toBe(
      '/api/v1/widget/direct_uploads?website_token=tok'
    );
    const xhr = { setRequestHeader: vi.fn() };
    env.upload.delegate.directUploadWillCreateBlobWithXHR(xhr);
    expect(xhr.setRequestHeader).toHaveBeenCalledWith('X-Auth-Token', 'auth');
    env.finish(null, { signed_id: 'sig' });
    expect(onAttach).toHaveBeenCalledWith({
      file: 'sig',
      thumbUrl: 'blob:thumb',
      fileType: 'image',
    });
    env.finish('Upload failed');
    expect(emitter.emit).toHaveBeenCalledWith(expect.anything(), {
      message: 'Upload failed',
    });

    env.uploadThrows = true;
    await wrapper.findComponent(Upload).vm.$emit('inputFile', file);
    await flushPromises();
    expect(wrapper.find('spinner-stub').exists()).toBe(false);

    checkFileSizeLimit.mockReturnValueOnce(false);
    await wrapper.findComponent(Upload).vm.$emit('inputFile', file);
    expect(emitter.emit).toHaveBeenLastCalledWith(expect.anything(), {
      message: 'FILE_SIZE_LIMIT:{"MAXIMUM_FILE_UPLOAD_SIZE":10}',
    });

    emitter.emit.mockClear();
    await wrapper.findComponent(Upload).vm.$emit('inputFile', undefined);
    expect(emitter.emit).not.toHaveBeenCalled();
  });

  it('hands files to the widget for regular uploads', async () => {
    let finish;
    const onAttach = vi.fn(
      () =>
        new Promise(resolve => {
          finish = resolve;
        })
    );
    const wrapper = mountButton({}, onAttach);
    await wrapper
      .findComponent(Upload)
      .vm.$emit('inputFile', { file: file.file, type: 'application/pdf' });
    expect(onAttach).toHaveBeenCalledWith({
      file: file.file,
      thumbUrl: 'blob:thumb',
      fileType: 'file',
    });
    expect(wrapper.find('spinner-stub').exists()).toBe(true);
    finish();
    await flushPromises();
    expect(wrapper.find('spinner-stub').exists()).toBe(false);

    onAttach.mockRejectedValueOnce(new Error('down'));
    await wrapper.findComponent(Upload).vm.$emit('inputFile', file);
    await flushPromises();
    expect(wrapper.find('spinner-stub').exists()).toBe(false);

    checkFileSizeLimit.mockReturnValueOnce(false);
    await wrapper.findComponent(Upload).vm.$emit('inputFile', file);
    expect(emitter.emit).toHaveBeenLastCalledWith(expect.anything(), {
      message: 'FILE_SIZE_LIMIT:{"MAXIMUM_FILE_UPLOAD_SIZE":40}',
    });

    onAttach.mockClear();
    await wrapper.findComponent(Upload).vm.$emit('inputFile', null);
    expect(onAttach).not.toHaveBeenCalled();
  });

  it('falls back to a no-op attach handler', async () => {
    const wrapper = mount(ChatAttachment, {
      global: {
        stubs: { FileUpload: Upload, FluentIcon: true, Spinner: true },
        mocks: {
          $store: { getters: { 'globalConfig/get': {} } },
          $t: key => key,
        },
      },
    });
    await wrapper.findComponent(Upload).vm.$emit('inputFile', file);
    await flushPromises();
    expect(wrapper.find('spinner-stub').exists()).toBe(false);
  });
});
