/**
 * OneTeam spec for fileUploadMixin's size limits and direct uploads: the
 * limit for a file depends on the note type, the channel and its medium,
 * capped by the installation limit; direct uploads go through ActiveStorage.
 */
import { DirectUpload } from 'activestorage';
import { getMaxUploadSizeByChannel } from '@chatwoot/utils';
import { useAlert } from 'dashboard/composables';
import { setDirectUploadAuthHeaders } from 'dashboard/helper/directUploadsHelper';
import fileUploadMixin from '../fileUploadMixin';

vi.mock('activestorage', () => ({ DirectUpload: vi.fn() }));
vi.mock('@chatwoot/utils', async importOriginal => ({
  ...(await importOriginal()),
  getMaxUploadSizeByChannel: vi.fn(),
}));
vi.mock('dashboard/composables', () => ({ useAlert: vi.fn() }));
vi.mock('dashboard/helper/directUploadsHelper', () => ({
  setDirectUploadAuthHeaders: vi.fn(),
}));

const MB = 1024 * 1024;
const { methods } = fileUploadMixin;

// A component instance as the mixin sees it.
const mixinHost = (overrides = {}) => {
  const vm = {
    accountId: 1,
    currentChat: { id: 7 },
    installationLimit: 40,
    isOnPrivateNote: false,
    inbox: { channel_type: 'Channel::Whatsapp' },
    globalConfig: { directUploadsEnabled: true },
    attachFile: vi.fn(),
    $t: (key, params) => `${key} ${JSON.stringify(params)}`,
    ...overrides,
  };
  Object.keys(methods).forEach(name => {
    vm[name] ||= methods[name].bind(vm);
  });
  return vm;
};
const file = size => ({ file: { size, type: 'image/png' } });

describe('maxSizeFor', () => {
  it('uses the installation limit for notes, web widgets and no inbox', () => {
    expect(mixinHost({ isOnPrivateNote: true }).maxSizeFor('image/png')).toBe(
      40
    );
    expect(
      mixinHost({ inbox: { channel_type: 'Channel::WebWidget' } }).maxSizeFor()
    ).toBe(40);
    expect(mixinHost({ inbox: null }).maxSizeFor()).toBe(40);
  });

  it('uses the installation limit when the channel has no limit of its own', () => {
    getMaxUploadSizeByChannel.mockReturnValue(40);
    expect(mixinHost().maxSizeFor('image/png')).toBe(40);
  });

  it('caps the channel limit at the installation limit', () => {
    getMaxUploadSizeByChannel.mockReturnValue(5);
    const vm = mixinHost({
      inbox: { channel_type: 'Channel::Twilio', medium: 'whatsapp' },
    });
    expect(vm.maxSizeFor('image/png')).toBe(5);
    expect(getMaxUploadSizeByChannel).toHaveBeenCalledWith({
      channelType: 'Channel::Twilio',
      medium: 'whatsapp',
      mime: 'image/png',
    });
    getMaxUploadSizeByChannel.mockReturnValue(100);
    expect(mixinHost({ installationLimit: 20 }).maxSizeFor('video/mp4')).toBe(
      20
    );
  });
});

describe('onDirectFileUpload', () => {
  beforeEach(() => {
    getMaxUploadSizeByChannel.mockReturnValue(16);
  });

  it('ignores a missing file', () => {
    const vm = mixinHost();
    vm.onFileUpload(null);
    expect(DirectUpload).not.toHaveBeenCalled();
  });

  it('refuses a file over the limit with an alert', () => {
    mixinHost().onFileUpload(file(20 * MB));
    expect(useAlert).toHaveBeenCalledWith(
      'CONVERSATION.FILE_SIZE_LIMIT {"MAXIMUM_SUPPORTED_FILE_UPLOAD_SIZE":16}'
    );
    expect(DirectUpload).not.toHaveBeenCalled();
  });

  it('uploads to the conversation with auth headers and attaches the blob', () => {
    let finish;
    let options;
    DirectUpload.mockImplementation(function Upload(_file, url, delegate) {
      this.url = url;
      options = delegate;
      this.create = callback => {
        finish = callback;
      };
    });
    const vm = mixinHost();
    const upload = file(MB);
    vm.onFileUpload(upload);
    expect(DirectUpload.mock.instances[0].url).toBe(
      '/api/v1/accounts/1/conversations/7/direct_uploads'
    );
    const xhr = {};
    options.directUploadWillCreateBlobWithXHR(xhr);
    expect(setDirectUploadAuthHeaders).toHaveBeenCalledWith(xhr);
    finish(null, { signed_id: 'blob-1' });
    expect(vm.attachFile).toHaveBeenCalledWith({
      file: upload,
      blob: { signed_id: 'blob-1' },
    });
    finish('Upload failed');
    expect(useAlert).toHaveBeenCalledWith('Upload failed');
  });
});

describe('onIndirectFileUpload', () => {
  beforeEach(() => {
    getMaxUploadSizeByChannel.mockReturnValue(16);
  });

  it('attaches a file under the limit, refuses one over it', () => {
    const vm = mixinHost({ globalConfig: { directUploadsEnabled: false } });
    vm.onFileUpload(null);
    const small = { size: MB, type: 'image/png' };
    vm.onFileUpload(small);
    expect(vm.attachFile).toHaveBeenCalledWith({ file: small });
    vm.onFileUpload(file(20 * MB));
    expect(useAlert).toHaveBeenCalled();
    expect(vm.attachFile).toHaveBeenCalledTimes(1);
  });
});
