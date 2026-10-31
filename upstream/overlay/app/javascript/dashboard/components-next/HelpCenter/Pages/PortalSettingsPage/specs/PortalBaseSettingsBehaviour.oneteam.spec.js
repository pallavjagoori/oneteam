/**
 * OneTeam behaviour spec for the help center portal's basic settings.
 *
 * Covers loading the portal (with and without a logo, ignoring loads while
 * fetching), the save button state (no changes, updating, invalid), the
 * update payload, field validation messages, logo upload (success, empty
 * response, failure, file too large) and logo deletion (success, API
 * message, fallback message).
 */
import { computed } from 'vue';
import { flushPromises, mount } from '@vue/test-utils';
import { useAlert } from 'dashboard/composables';
import { uploadFile } from 'dashboard/helper/uploadHelper';
import { checkFileSizeLimit } from 'shared/helpers/FileHelper';
import PortalBaseSettings from '../PortalBaseSettings.vue';

const env = vi.hoisted(() => ({}));

vi.mock('dashboard/composables', () => ({ useAlert: vi.fn() }));
vi.mock('dashboard/helper/uploadHelper', () => ({ uploadFile: vi.fn() }));
vi.mock('shared/helpers/FileHelper', () => ({ checkFileSizeLimit: vi.fn() }));
vi.mock('dashboard/composables/store', () => ({
  useStore: () => ({ dispatch: (...args) => env.dispatch(...args) }),
  useStoreGetters: () => ({
    'portals/uiFlagsIn': computed(() => slug => env.flags[slug]),
  }),
}));

const Input = {
  name: 'Input',
  props: ['modelValue', 'placeholder', 'messageType', 'message'],
  emits: ['update:modelValue', 'input', 'blur'],
  template: '<input />',
};
const Avatar = {
  name: 'Avatar',
  props: ['src', 'name'],
  emits: ['upload', 'delete'],
  template: '<div class="avatar" />',
};
const ColorPicker = {
  name: 'ColorPicker',
  props: ['modelValue'],
  emits: ['update:modelValue'],
  template: '<div class="color" />',
};
const Button = {
  name: 'Button',
  props: { label: String, disabled: Boolean, isLoading: Boolean },
  emits: ['click'],
  template: '<button @click="$emit(\'click\')" />',
};

const portal = (overrides = {}) => ({
  id: 11,
  name: 'Docs',
  header_text: 'Welcome',
  page_title: 'Docs title',
  color: '#123456',
  homepage_link: 'https://example.com',
  slug: 'docs',
  logo: { file_url: 'https://cdn/logo.png', blob_id: 'blob-1' },
  ...overrides,
});

const mountSettings = (props = {}) =>
  mount(PortalBaseSettings, {
    props: { activePortal: portal(), ...props },
    global: { stubs: { Input, Avatar, ColorPicker, Button } },
  });

const inputs = wrapper => wrapper.findAllComponents(Input);
const save = wrapper => wrapper.findComponent(Button);
const FIELD = { name: 0, header: 1, title: 2, link: 3, slug: 4 };

describe('Portal base settings behaviour', () => {
  beforeEach(() => {
    window.chatwootConfig = { hostURL: 'https://app.example.com' };
    env.dispatch = vi.fn();
    env.flags = {};
  });

  it('loads the portal and keeps saving disabled until something changes', () => {
    const wrapper = mountSettings();
    expect(wrapper.findComponent(Avatar).props()).toMatchObject({
      src: 'https://cdn/logo.png',
      name: 'Docs',
    });
    expect(inputs(wrapper).map(i => i.props('modelValue'))).toEqual([
      'Docs',
      'Welcome',
      'Docs title',
      'https://example.com',
      'docs',
    ]);
    expect(wrapper.findComponent(ColorPicker).props('modelValue')).toBe(
      '#123456'
    );
    expect(inputs(wrapper)[FIELD.slug].props('message')).toContain('docs');
    expect(save(wrapper).props('disabled')).toBe(true);
  });

  it('handles portals without a logo and ignores loads while fetching', async () => {
    const wrapper = mountSettings({ activePortal: portal({ logo: null }) });
    expect(wrapper.findComponent(Avatar).props('src')).toBe('');
    await wrapper.setProps({
      isFetching: true,
      activePortal: portal({ name: 'New' }),
    });
    expect(inputs(wrapper)[FIELD.name].props('modelValue')).toBe('Docs');
  });

  it('emits the updated portal', async () => {
    const wrapper = mountSettings();
    await inputs(wrapper)[FIELD.header].vm.$emit('update:modelValue', 'Hi');
    await inputs(wrapper)[FIELD.title].vm.$emit('update:modelValue', 'T');
    await wrapper
      .findComponent(ColorPicker)
      .vm.$emit('update:modelValue', '#000');
    expect(save(wrapper).props('disabled')).toBe(false);
    await save(wrapper).trigger('click');
    expect(wrapper.emitted('updatePortal')[0][0]).toEqual({
      id: 11,
      slug: 'docs',
      name: 'Docs',
      color: '#000',
      page_title: 'T',
      header_text: 'Hi',
      homepage_link: 'https://example.com',
      blob_id: 'blob-1',
    });
  });

  it('shows the loading state while the portal is updating', () => {
    env.flags = { docs: { isUpdating: true } };
    const wrapper = mountSettings();
    expect(save(wrapper).props()).toMatchObject({
      isLoading: true,
      disabled: true,
    });
    env.flags = {};
    const noSlug = mountSettings({ activePortal: portal({ slug: '' }) });
    expect(save(noSlug).props('isLoading')).toBe(false);
  });

  it('validates name, home page link and slug', async () => {
    const wrapper = mountSettings();
    const field = key => inputs(wrapper)[FIELD[key]];
    await field('name').vm.$emit('update:modelValue', 'D');
    await field('name').vm.$emit('input');
    expect(field('name').props()).toMatchObject({
      messageType: 'error',
      message: 'HELP_CENTER.CREATE_PORTAL_DIALOG.NAME.ERROR',
    });
    await field('link').vm.$emit('update:modelValue', 'not a url');
    await field('link').vm.$emit('blur');
    expect(field('link').props('message')).toBe(
      'HELP_CENTER.PORTAL_SETTINGS.FORM.HOME_PAGE_LINK.ERROR'
    );
    await field('link').vm.$emit('input');
    await field('slug').vm.$emit('update:modelValue', '');
    await field('slug').vm.$emit('input');
    expect(field('slug').props('message')).toBe(
      'HELP_CENTER.CREATE_PORTAL_DIALOG.SLUG.ERROR'
    );
    await field('slug').vm.$emit('update:modelValue', 'Bad Slug!');
    await field('slug').vm.$emit('blur');
    expect(field('slug').props()).toMatchObject({
      messageType: 'error',
      message: 'HELP_CENTER.CREATE_PORTAL_DIALOG.SLUG.FORMAT_ERROR',
    });
    await field('name').vm.$emit('blur');
    expect(save(wrapper).props('disabled')).toBe(true);
  });

  it('uploads a new logo', async () => {
    checkFileSizeLimit.mockReturnValue(true);
    uploadFile.mockResolvedValueOnce({
      fileUrl: 'https://cdn/new.png',
      blobId: 'b2',
    });
    const wrapper = mountSettings();
    const file = new File(['x'], 'logo.png');
    await wrapper.findComponent(Avatar).vm.$emit('upload', { file });
    await flushPromises();
    expect(uploadFile).toHaveBeenCalledWith(file);
    expect(wrapper.findComponent(Avatar).props('src')).toBe(
      'https://cdn/new.png'
    );
    expect(useAlert).toHaveBeenLastCalledWith(
      'HELP_CENTER.PORTAL_SETTINGS.FORM.AVATAR.IMAGE_UPLOAD_SUCCESS'
    );
    await save(wrapper).trigger('click');
    expect(wrapper.emitted('updatePortal')[0][0].blob_id).toBe('b2');
  });

  it('keeps the logo when the upload returns nothing or fails', async () => {
    checkFileSizeLimit.mockReturnValue(true);
    uploadFile.mockResolvedValueOnce({}).mockRejectedValueOnce(new Error('x'));
    const wrapper = mountSettings();
    const avatar = wrapper.findComponent(Avatar);
    await avatar.vm.$emit('upload', { file: 'f' });
    await flushPromises();
    expect(avatar.props('src')).toBe('https://cdn/logo.png');
    await avatar.vm.$emit('upload', { file: 'f' });
    await flushPromises();
    expect(useAlert).toHaveBeenLastCalledWith(
      'HELP_CENTER.PORTAL_SETTINGS.FORM.AVATAR.IMAGE_UPLOAD_ERROR'
    );
  });

  it('rejects files over the size limit', async () => {
    checkFileSizeLimit.mockReturnValue(false);
    const wrapper = mountSettings();
    await wrapper.findComponent(Avatar).vm.$emit('upload', { file: 'big' });
    expect(uploadFile).not.toHaveBeenCalled();
    expect(useAlert).toHaveBeenCalledWith(
      'HELP_CENTER.PORTAL_SETTINGS.FORM.AVATAR.IMAGE_UPLOAD_SIZE_ERROR'
    );
  });

  it('deletes the logo and reports the outcome', async () => {
    const wrapper = mountSettings();
    const avatar = wrapper.findComponent(Avatar);
    await avatar.vm.$emit('delete');
    await flushPromises();
    expect(env.dispatch).toHaveBeenCalledWith('portals/deleteLogo', {
      portalSlug: 'docs',
    });
    expect(avatar.props('src')).toBe('');
    expect(useAlert).toHaveBeenLastCalledWith(
      'HELP_CENTER.PORTAL_SETTINGS.FORM.AVATAR.IMAGE_DELETE_SUCCESS'
    );
    env.dispatch.mockRejectedValueOnce(new Error('Locked'));
    await avatar.vm.$emit('delete');
    await flushPromises();
    expect(useAlert).toHaveBeenLastCalledWith('Locked');
    env.dispatch.mockRejectedValueOnce({});
    await avatar.vm.$emit('delete');
    await flushPromises();
    expect(useAlert).toHaveBeenLastCalledWith(
      'HELP_CENTER.PORTAL_SETTINGS.FORM.AVATAR.IMAGE_DELETE_ERROR'
    );
  });
});
