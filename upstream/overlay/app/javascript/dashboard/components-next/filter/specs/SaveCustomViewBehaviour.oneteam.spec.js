/**
 * OneTeam behaviour spec for the "save filter as folder/segment" popover.
 *
 * Covers name validation (blur, error message, disabled save), saving a
 * conversation folder or a contact segment (payload, success alert,
 * tracking, closing and opening the saved item), the failure alerts
 * (server message, folder without message, segment fallback), and
 * closing via cancel or an outside click.
 */
import { flushPromises, mount } from '@vue/test-utils';
import SaveCustomView from '../SaveCustomView.vue';

const env = vi.hoisted(() => ({ alert: null, track: null, outside: null }));

vi.mock('dashboard/composables', () => ({
  useAlert: (...args) => env.alert(...args),
  useTrack: (...args) => env.track(...args),
}));
vi.mock('@vueuse/components', () => ({
  vOnClickOutside: {
    mounted: (el, binding) => {
      env.outside = binding.value;
    },
  },
}));

const NextInput = {
  name: 'NextInput',
  props: ['modelValue', 'message', 'messageType'],
  emits: ['update:modelValue', 'blur'],
  template:
    '<input :value="modelValue" :data-message="message" :data-type="messageType" @input="$emit(\'update:modelValue\', $event.target.value)" @blur="$emit(\'blur\')" />',
};
const NextButton = {
  name: 'NextButton',
  props: { disabled: Boolean },
  emits: ['click'],
  template:
    '<button :disabled="disabled" @click="$emit(\'click\', $event)"><slot /></button>',
};

const query = { payload: [{ attribute_key: 'status' }] };
const mountPopover = (
  props = {},
  dispatch = vi.fn(() => Promise.resolve())
) => {
  const openLastSavedItem = vi.fn();
  const wrapper = mount(SaveCustomView, {
    props: { customViewsQuery: query, openLastSavedItem, ...props },
    global: {
      stubs: { NextInput, NextButton },
      mocks: { $t: key => key, $store: { dispatch } },
    },
  });
  return { wrapper, dispatch, openLastSavedItem };
};
const saveButton = wrapper => wrapper.findAll('button')[1];

describe('Save custom view behaviour', () => {
  beforeEach(() => {
    env.alert = vi.fn();
    env.track = vi.fn();
  });

  it('requires a name before saving', async () => {
    const { wrapper, dispatch } = mountPopover();
    expect(saveButton(wrapper).attributes('disabled')).toBeDefined();
    await wrapper.find('input').trigger('blur');
    expect(wrapper.find('input').attributes('data-message')).toBe(
      'FILTER.CUSTOM_VIEWS.ADD.ERROR_MESSAGE'
    );
    expect(wrapper.find('input').attributes('data-type')).toBe('error');
    await wrapper.find('form').trigger('submit');
    expect(dispatch).not.toHaveBeenCalled();
  });

  it('saves a conversation folder', async () => {
    const { wrapper, dispatch, openLastSavedItem } = mountPopover();
    await wrapper.find('input').setValue('Urgent');
    expect(saveButton(wrapper).attributes('disabled')).toBeUndefined();
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    expect(dispatch).toHaveBeenCalledWith('customViews/create', {
      name: 'Urgent',
      filter_type: 0,
      query,
    });
    expect(env.alert).toHaveBeenCalledWith(
      'FILTER.CUSTOM_VIEWS.ADD.API_FOLDERS.SUCCESS_MESSAGE'
    );
    expect(env.track).toHaveBeenCalledWith(expect.anything(), {
      type: 'folder',
    });
    expect(wrapper.emitted('close')).toHaveLength(1);
    expect(openLastSavedItem).toHaveBeenCalled();
  });

  it('saves a contact segment', async () => {
    const { wrapper } = mountPopover({ filterType: 1 });
    await wrapper.find('input').setValue('VIPs');
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    expect(env.alert).toHaveBeenCalledWith(
      'FILTER.CUSTOM_VIEWS.ADD.API_SEGMENTS.SUCCESS_MESSAGE'
    );
    expect(env.track).toHaveBeenCalledWith(expect.anything(), {
      type: 'segment',
    });
  });

  it.each([
    [0, new Error('Name taken'), 'Name taken'],
    [0, {}, undefined],
    [1, {}, 'FILTER.CUSTOM_VIEWS.ADD.API_SEGMENTS.ERROR_MESSAGE'],
  ])('alerts on failure (type %s)', async (filterType, error, message) => {
    const { wrapper, openLastSavedItem } = mountPopover(
      { filterType },
      vi.fn(() => Promise.reject(error))
    );
    await wrapper.find('input').setValue('Dup');
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    expect(env.alert).toHaveBeenCalledWith(message);
    expect(wrapper.emitted('close')).toBeUndefined();
    expect(openLastSavedItem).toHaveBeenCalled();
  });

  it('closes on cancel or an outside click', async () => {
    const { wrapper } = mountPopover();
    await wrapper.findAll('button')[0].trigger('click');
    expect(env.outside[1]).toEqual({ ignore: ['#saveFilterTeleportTarget'] });
    env.outside[0]();
    expect(wrapper.emitted('close')).toHaveLength(2);
  });
});
