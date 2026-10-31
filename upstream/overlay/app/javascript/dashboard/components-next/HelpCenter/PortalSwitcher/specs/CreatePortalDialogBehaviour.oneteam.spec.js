/**
 * OneTeam behaviour spec for the "create portal" dialog.
 *
 * Covers deriving the slug from the name, name and slug validation
 * messages, the disabled and loading confirm button, refusing to submit an
 * invalid form, creating a portal (tracking, alert, reset and the create
 * event), and failures with and without an error message.
 */
import { computed } from 'vue';
import { mount, flushPromises } from '@vue/test-utils';
import { useAlert, useTrack } from 'dashboard/composables';
import CreatePortalDialog from '../CreatePortalDialog.vue';

const env = vi.hoisted(() => ({ state: {}, dispatch: null, log: [] }));

vi.mock('dashboard/composables/store', () => ({
  useMapGetter: name => computed(() => env.state[name]),
  useStore: () => ({ dispatch: env.dispatch }),
}));
vi.mock('dashboard/composables', () => ({
  useAlert: vi.fn(),
  useTrack: vi.fn(),
}));
vi.mock('dashboard/helper/portalHelper', () => ({
  buildPortalURL: slug => `https://help.example.com/hc/${slug}`,
}));

const Dialog = {
  name: 'Dialog',
  props: ['disableConfirmButton', 'isLoading'],
  emits: ['confirm'],
  methods: { close: () => env.log.push('close') },
  template: '<div class="dialog"><slot /></div>',
};
const Input = {
  name: 'Input',
  props: ['modelValue', 'message', 'messageType'],
  emits: ['update:modelValue', 'blur', 'input'],
  template: '<input :value="modelValue" />',
};

const mountDialog = () =>
  mount(CreatePortalDialog, { global: { stubs: { Dialog, Input } } });
const inputs = wrapper => wrapper.findAllComponents(Input);
const dialog = wrapper => wrapper.findComponent(Dialog);
const setName = async (wrapper, name) => {
  await inputs(wrapper)[0].vm.$emit('update:modelValue', name);
  await flushPromises();
};

describe('CreatePortalDialog behaviour', () => {
  beforeEach(() => {
    env.state = { 'portals/isCreatingPortal': false };
    env.dispatch = vi.fn();
    env.log = [];
  });

  it('derives the slug and validates fields', async () => {
    const wrapper = mountDialog();
    const [name, slug] = inputs(wrapper);
    expect(dialog(wrapper).props('disableConfirmButton')).toBe(true);
    expect(name.props('message')).toBe(
      'HELP_CENTER.CREATE_PORTAL_DIALOG.NAME.MESSAGE'
    );
    await name.vm.$emit('blur');
    expect(name.props('messageType')).toBe('error');
    expect(name.props('message')).toBe(
      'HELP_CENTER.CREATE_PORTAL_DIALOG.NAME.ERROR'
    );
    await slug.vm.$emit('input');
    expect(slug.props('message')).toBe(
      'HELP_CENTER.CREATE_PORTAL_DIALOG.SLUG.ERROR'
    );
    expect(slug.props('messageType')).toBe('error');

    await setName(wrapper, 'Help Docs');
    expect(slug.props('modelValue')).toBe('help-docs');
    expect(slug.props('message')).toBe('https://help.example.com/hc/help-docs');
    expect(name.props('messageType')).toBe('info');
    expect(dialog(wrapper).props('disableConfirmButton')).toBe(false);

    await slug.vm.$emit('update:modelValue', 'Bad Slug!');
    await slug.vm.$emit('blur');
    expect(slug.props('message')).toBe(
      'HELP_CENTER.CREATE_PORTAL_DIALOG.SLUG.FORMAT_ERROR'
    );
  });

  it('disables the button while creating', () => {
    env.state['portals/isCreatingPortal'] = true;
    const wrapper = mountDialog();
    expect(dialog(wrapper).props('isLoading')).toBe(true);
  });

  it('does not submit an invalid form', async () => {
    const wrapper = mountDialog();
    await dialog(wrapper).vm.$emit('confirm');
    await flushPromises();
    expect(env.dispatch).not.toHaveBeenCalled();
  });

  it('creates a portal, tracks it and resets', async () => {
    const wrapper = mountDialog();
    expect(wrapper.vm.dialogRef).toBeTruthy();
    await setName(wrapper, 'Docs');
    await dialog(wrapper).vm.$emit('confirm');
    await flushPromises();
    expect(env.dispatch).toHaveBeenCalledWith('portals/create', {
      name: 'Docs',
      slug: 'docs',
      custom_domain: '',
      blob_id: null,
      color: '#2781F6',
    });
    expect(env.log).toEqual(['close']);
    expect(useTrack).toHaveBeenCalledTimes(2);
    expect(useTrack.mock.calls[0][1]).toEqual({ has_custom_domain: false });
    expect(useAlert).toHaveBeenCalledWith(
      'HELP_CENTER.PORTAL_SETTINGS.API.CREATE_PORTAL.SUCCESS_MESSAGE'
    );
    expect(wrapper.emitted('create')).toEqual([
      [{ slug: 'docs', locale: 'en' }],
    ]);
    expect(inputs(wrapper)[0].props('modelValue')).toBe('');
  });

  it('alerts the error message or a fallback on failure', async () => {
    const wrapper = mountDialog();
    await setName(wrapper, 'Docs');
    env.dispatch.mockRejectedValueOnce(new Error('Slug taken'));
    await dialog(wrapper).vm.$emit('confirm');
    await flushPromises();
    expect(useAlert).toHaveBeenLastCalledWith('Slug taken');
    env.dispatch.mockRejectedValueOnce(null);
    await dialog(wrapper).vm.$emit('confirm');
    await flushPromises();
    expect(useAlert).toHaveBeenLastCalledWith(
      'HELP_CENTER.PORTAL_SETTINGS.API.CREATE_PORTAL.ERROR_MESSAGE'
    );
    expect(env.log).toEqual(['close', 'close']);
    expect(wrapper.emitted('create')).toBeUndefined();
  });
});
