import { DirectUpload } from 'activestorage';
import { useAlert } from 'dashboard/composables';
import { useFileUpload } from '../useFileUpload';

/*
 * OneTeam coverage for attachment size limits per channel and for direct
 * uploads: private notes and web widgets use the installation limit, other
 * channels the smaller of the two, and a failed direct upload is reported.
 */
const ctx = vi.hoisted(() => ({ config: {}, uploadError: null }));

vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: (key, args) => `${key}:${JSON.stringify(args)}` }),
}));
vi.mock('dashboard/composables', () => ({ useAlert: vi.fn() }));
vi.mock('dashboard/composables/store', () => ({
  useMapGetter: name =>
    ({
      getCurrentAccountId: { value: 1 },
      getSelectedChat: { value: { id: 2 } },
      'globalConfig/get': {
        get value() {
          return ctx.config;
        },
      },
    })[name],
}));
vi.mock('activestorage', () => ({
  DirectUpload: vi.fn(function FakeDirectUpload(file, url, delegate) {
    this.create = callback => {
      delegate.directUploadWillCreateBlobWithXHR({ setRequestHeader() {} });
      callback(ctx.uploadError, { signed_id: 'blob' });
    };
  }),
}));
vi.mock('dashboard/helper/directUploadsHelper', () => ({
  setDirectUploadAuthHeaders: vi.fn(),
}));

const MB = 1024 * 1024;
const fileOf = (sizeMB, type = 'image/png') => ({
  file: { size: sizeMB * MB, type },
});

describe('useFileUpload (OneTeam)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    ctx.config = { maximumFileUploadSize: 40 };
    ctx.uploadError = null;
  });

  it('allows the installation limit for private notes', () => {
    const attachFile = vi.fn();
    const { onFileUpload } = useFileUpload({
      inbox: { channel_type: 'Channel::Whatsapp' },
      attachFile,
      isPrivateNote: true,
    });
    onFileUpload(fileOf(30));
    expect(attachFile).toHaveBeenCalled();
    onFileUpload(null);
    expect(attachFile).toHaveBeenCalledTimes(1);
  });

  it('caps uploads at the channel limit when it is lower', () => {
    const attachFile = vi.fn();
    const { onFileUpload } = useFileUpload({
      inbox: { channel_type: 'Channel::Whatsapp' },
      attachFile,
    });
    onFileUpload(fileOf(30));
    expect(attachFile).not.toHaveBeenCalled();
    expect(useAlert).toHaveBeenCalledWith(
      expect.stringContaining('CONVERSATION.FILE_SIZE_LIMIT')
    );
  });

  it('uses the installation limit for channels without their own limit', () => {
    ctx.config = { maximumFileUploadSize: 100 };
    const attachFile = vi.fn();
    const { onFileUpload } = useFileUpload({
      inbox: { channel_type: 'Channel::Api' },
      attachFile,
    });
    const bare = { size: 60 * MB, type: 'application/pdf' };
    onFileUpload(bare);
    expect(attachFile).toHaveBeenCalledWith({ file: bare });
  });

  it('uploads directly and reports a failed upload', () => {
    ctx.config = { directUploadsEnabled: true };
    const attachFile = vi.fn();
    const { onFileUpload } = useFileUpload({ inbox: {}, attachFile });
    onFileUpload(fileOf(1));
    expect(attachFile).toHaveBeenCalledWith({
      file: fileOf(1),
      blob: { signed_id: 'blob' },
    });
    expect(DirectUpload).toHaveBeenCalledWith(
      fileOf(1).file,
      '/api/v1/accounts/1/conversations/2/direct_uploads',
      expect.any(Object)
    );

    ctx.uploadError = 'Upload failed';
    onFileUpload(fileOf(1));
    expect(useAlert).toHaveBeenCalledWith('Upload failed');
    onFileUpload(null);
    onFileUpload({ size: 999 * MB, type: 'image/png' });
    expect(attachFile).toHaveBeenCalledTimes(1);
  });
});
