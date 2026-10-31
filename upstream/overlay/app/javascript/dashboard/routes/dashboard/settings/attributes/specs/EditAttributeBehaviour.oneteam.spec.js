/**
 * OneTeam behaviour spec for the edit custom attribute dialog.
 *
 * Covers loading text, list and other attributes into the form,
 * the regex toggle and fields, the list-values requirement, the
 * required-field errors, saving (with the regex cleared when turned
 * off) and save errors, and cancelling.
 */
import { mount, flushPromises } from '@vue/test-utils';
import { useAlert } from 'dashboard/composables';
import EditAttribute from '../EditAttribute.vue';

vi.mock('dashboard/composables', () => ({ useAlert: vi.fn() }));

const WootInput = {
  name: 'WootInput',
  props: ['modelValue', 'label', 'error'],
  emits: ['update:modelValue', 'blur'],
  template: '<input class="woot-input" />',
};
const TagInput = {
  name: 'TagInput',
  props: ['modelValue'],
  emits: ['update:modelValue', 'blur'],
  template: '<div class="tags" />',
};
const NextButton = {
  name: 'NextButton',
  props: ['label', 'disabled', 'isLoading', 'type'],
  emits: ['click'],
  template:
    '<button :type="type" @click="$emit(`click`, $event)">{{ label }}</button>',
};

let dispatch;

const textAttribute = {
  id: 3,
  attribute_display_name: 'Plan',
  attribute_description: 'Customer plan',
  attribute_display_type: 'text',
  attribute_key: 'plan',
  regex_pattern: '/^[a-z]+$/',
  regex_cue: 'Lowercase only',
};

const mountDialog = async (selectedAttribute = textAttribute) => {
  const wrapper = mount(EditAttribute, {
    props: { selectedAttribute },
    global: {
      mocks: { $store: { dispatch } },
      stubs: {
        WootInput,
        TagInput,
        NextButton,
        WootModalHeader: {
          props: ['headerTitle'],
          template: '<h2>{{ headerTitle }}</h2>',
        },
      },
    },
  });
  await flushPromises();
  return wrapper;
};

const inputs = wrapper => wrapper.findAllComponents(WootInput);
const submitButton = wrapper => wrapper.findAllComponents(NextButton)[1];
const submit = async wrapper => {
  await wrapper.find('form').trigger('submit');
  await flushPromises();
};

describe('EditAttribute behaviour', () => {
  beforeEach(() => {
    dispatch = vi.fn().mockResolvedValue();
  });

  it('loads a text attribute with its regex', async () => {
    const wrapper = await mountDialog();
    expect(wrapper.find('h2').text()).toBe('ATTRIBUTES_MGMT.EDIT.TITLE - Plan');
    expect(inputs(wrapper).map(i => i.props('modelValue'))).toEqual([
      'Plan',
      'plan',
      '/^[a-z]+$/',
      'Lowercase only',
    ]);
    expect(wrapper.find('textarea').element.value).toBe('Customer plan');
    expect(wrapper.find('select').element.value).toBe('0');
    expect(wrapper.find('input[type="checkbox"]').element.checked).toBe(true);
    expect(wrapper.find('.tags').exists()).toBe(false);
  });

  it('saves changes and closes', async () => {
    const wrapper = await mountDialog();
    await inputs(wrapper)[0].vm.$emit('update:modelValue', 'Tier');
    await inputs(wrapper)[2].vm.$emit('update:modelValue', '^[A-Z]+$');
    await inputs(wrapper)[3].vm.$emit('update:modelValue', 'Caps');
    await submit(wrapper);
    expect(dispatch).toHaveBeenCalledWith('attributes/update', {
      id: 3,
      attribute_description: 'Customer plan',
      attribute_display_name: 'Tier',
      attribute_values: [],
      regex_pattern: '/^[A-Z]+$/',
      regex_cue: 'Caps',
    });
    expect(useAlert).toHaveBeenCalledWith(
      'ATTRIBUTES_MGMT.EDIT.API.SUCCESS_MESSAGE'
    );
    expect(wrapper.emitted('onClose')).toHaveLength(1);
  });

  it('clears the regex when it is turned off', async () => {
    const wrapper = await mountDialog();
    await wrapper.find('input[type="checkbox"]').trigger('input');
    expect(inputs(wrapper)).toHaveLength(2);
    await submit(wrapper);
    expect(dispatch.mock.calls[0][1]).toMatchObject({
      regex_pattern: null,
      regex_cue: null,
    });
  });

  it('reports save errors', async () => {
    const wrapper = await mountDialog();
    dispatch.mockRejectedValueOnce(new Error('Key taken'));
    await submit(wrapper);
    expect(useAlert).toHaveBeenLastCalledWith('Key taken');
    dispatch.mockRejectedValueOnce({});
    await submit(wrapper);
    expect(useAlert).toHaveBeenLastCalledWith(
      'ATTRIBUTES_MGMT.EDIT.API.ERROR_MESSAGE'
    );
    expect(wrapper.emitted('onClose')).toBeUndefined();
  });

  it('shows required field errors and blocks saving', async () => {
    const wrapper = await mountDialog({
      ...textAttribute,
      regex_pattern: null,
    });
    expect(inputs(wrapper)).toHaveLength(2);
    await inputs(wrapper)[0].vm.$emit('update:modelValue', '');
    await inputs(wrapper)[0].vm.$emit('blur');
    await inputs(wrapper)[1].vm.$emit('update:modelValue', '');
    await inputs(wrapper)[1].vm.$emit('blur');
    await wrapper.find('textarea').setValue('');
    await wrapper.find('textarea').trigger('blur');
    expect(inputs(wrapper)[0].props('error')).toBe(
      'ATTRIBUTES_MGMT.ADD.FORM.NAME.ERROR'
    );
    expect(inputs(wrapper)[1].props('error')).toBe(
      'ATTRIBUTES_MGMT.ADD.FORM.KEY.ERROR'
    );
    expect(wrapper.text()).toContain('ATTRIBUTES_MGMT.ADD.FORM.DESC.ERROR');
    expect(submitButton(wrapper).props('disabled')).toBe(true);
    await submit(wrapper);
    expect(dispatch).not.toHaveBeenCalled();

    // A key with a space is invalid but still shows the generic message.
    await inputs(wrapper)[1].vm.$emit('update:modelValue', 'two words');
    expect(inputs(wrapper)[1].props('error')).toBe(
      'ATTRIBUTES_MGMT.ADD.FORM.KEY.ERROR'
    );
  });

  it('requires at least one value for list attributes', async () => {
    const wrapper = await mountDialog({
      ...textAttribute,
      attribute_display_type: 'list',
      attribute_values: ['Free', 'Pro'],
      regex_pattern: null,
    });
    const tags = wrapper.findComponent(TagInput);
    expect(tags.props('modelValue')).toEqual(['Free', 'Pro']);
    expect(wrapper.find('input[type="checkbox"]').exists()).toBe(false);
    await tags.vm.$emit('update:modelValue', []);
    await tags.vm.$emit('blur');
    expect(wrapper.find('.border-n-ruby-9').exists()).toBe(true);
    expect(submitButton(wrapper).props('disabled')).toBe(true);
    await tags.vm.$emit('update:modelValue', ['Team']);
    await submit(wrapper);
    expect(dispatch.mock.calls[0][1].attribute_values).toEqual(['Team']);
  });

  it('loads other types without list values and has no type match for unknown ones', async () => {
    let wrapper = await mountDialog({
      ...textAttribute,
      attribute_display_type: 'list',
      regex_pattern: null,
    });
    expect(wrapper.findComponent(TagInput).props('modelValue')).toEqual([]);
    wrapper = await mountDialog({
      ...textAttribute,
      attribute_display_type: 'mystery',
    });
    expect(wrapper.find('input[type="checkbox"]').exists()).toBe(false);
    await submit(wrapper);
    expect(wrapper.text()).toContain('ATTRIBUTES_MGMT.ADD.FORM.TYPE.ERROR');
    expect(dispatch).not.toHaveBeenCalled();
  });

  it('cancels', async () => {
    const wrapper = await mountDialog();
    await wrapper.findAllComponents(NextButton)[0].trigger('click');
    expect(wrapper.emitted('onClose')).toHaveLength(1);
    expect(dispatch).not.toHaveBeenCalled();
  });
});
