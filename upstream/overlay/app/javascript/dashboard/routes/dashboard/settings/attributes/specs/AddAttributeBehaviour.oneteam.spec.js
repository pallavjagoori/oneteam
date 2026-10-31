/**
 * OneTeam behaviour spec for the add custom attribute dialog.
 *
 * Covers the applies-to choices (company only with the feature),
 * deriving the key from the name, required field and list-value
 * errors, the regex toggle, creating attributes with every field,
 * create errors, and cancelling.
 */
import { mount, flushPromises } from '@vue/test-utils';
import { useAlert } from 'dashboard/composables';
import AddAttribute from '../AddAttribute.vue';

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
  props: ['label', 'disabled', 'type'],
  emits: ['click'],
  template:
    '<button :type="type" @click="$emit(`click`, $event)">{{ label }}</button>',
};

let store;

const mountDialog = (props = {}) =>
  mount(AddAttribute, {
    props: { onClose: vi.fn(), ...props },
    global: {
      mocks: { $store: store },
      stubs: { WootInput, TagInput, NextButton, WootModalHeader: true },
    },
  });

const inputs = wrapper => wrapper.findAllComponents(WootInput);
const selects = wrapper => wrapper.findAll('select');
const submitButton = wrapper => wrapper.findAllComponents(NextButton)[1];
const submit = async wrapper => {
  await wrapper.find('form').trigger('submit');
  await flushPromises();
};
const fill = async wrapper => {
  await inputs(wrapper)[0].vm.$emit('update:modelValue', 'Plan Tier!');
  await wrapper.find('textarea').setValue('Which plan');
};

describe('AddAttribute behaviour', () => {
  beforeEach(() => {
    store = {
      dispatch: vi.fn().mockResolvedValue(),
      getters: {
        getUIFlags: { isCreating: false },
        getCurrentAccountId: 1,
        'accounts/isFeatureEnabledonAccount': () => true,
      },
    };
  });

  it('offers models by feature and starts on the selected tab', () => {
    let wrapper = mountDialog({ selectedAttributeModelTab: 2 });
    expect(selects(wrapper)[0].findAll('option')).toHaveLength(3);
    expect(selects(wrapper)[0].element.value).toBe('2');
    store.getters['accounts/isFeatureEnabledonAccount'] = () => false;
    wrapper = mountDialog();
    expect(
      selects(wrapper)[0]
        .findAll('option')
        .map(o => o.text())
    ).toEqual([
      'ATTRIBUTES_MGMT.ATTRIBUTE_MODELS.CONVERSATION',
      'ATTRIBUTES_MGMT.ATTRIBUTE_MODELS.CONTACT',
    ]);
    expect(selects(wrapper)[0].element.value).toBe('0');
  });

  it('derives the key and creates a text attribute with a regex', async () => {
    const wrapper = mountDialog();
    expect(submitButton(wrapper).props('disabled')).toBe(true);
    await fill(wrapper);
    expect(inputs(wrapper)[1].props('modelValue')).toBe('plan_tier');
    await selects(wrapper)[0].setValue('1');
    await wrapper.find('input[type="checkbox"]').trigger('input');
    await inputs(wrapper)[2].vm.$emit('update:modelValue', '^[a-z]+$');
    await inputs(wrapper)[3].vm.$emit('update:modelValue', 'Lowercase');
    expect(submitButton(wrapper).props('disabled')).toBe(false);
    await submit(wrapper);
    expect(store.dispatch).toHaveBeenCalledWith('attributes/create', {
      attribute_display_name: 'Plan Tier!',
      attribute_description: 'Which plan',
      attribute_model: 1,
      attribute_display_type: 0,
      attribute_key: 'plan_tier',
      attribute_values: [],
      regex_pattern: '/^[a-z]+$/',
      regex_cue: 'Lowercase',
    });
    expect(useAlert).toHaveBeenCalledWith(
      'ATTRIBUTES_MGMT.ADD.API.SUCCESS_MESSAGE'
    );
    expect(wrapper.props('onClose')).toHaveBeenCalled();
  });

  it('drops the regex when turned off and reports create errors', async () => {
    const wrapper = mountDialog();
    await fill(wrapper);
    await wrapper.find('input[type="checkbox"]').trigger('input');
    await inputs(wrapper)[2].vm.$emit('update:modelValue', 'x');
    await wrapper.find('input[type="checkbox"]').trigger('input');
    store.dispatch.mockRejectedValueOnce(new Error('Key taken'));
    await submit(wrapper);
    expect(store.dispatch.mock.calls[0][1]).toMatchObject({
      regex_pattern: null,
      regex_cue: null,
    });
    expect(useAlert).toHaveBeenLastCalledWith('Key taken');
    store.dispatch.mockRejectedValueOnce({});
    await submit(wrapper);
    expect(useAlert).toHaveBeenLastCalledWith(
      'ATTRIBUTES_MGMT.ADD.API.ERROR_MESSAGE'
    );
    expect(wrapper.props('onClose')).not.toHaveBeenCalled();
  });

  it('shows field errors and blocks invalid keys', async () => {
    const wrapper = mountDialog();
    await inputs(wrapper)[0].vm.$emit('blur');
    await inputs(wrapper)[1].vm.$emit('blur');
    await wrapper.find('textarea').trigger('blur');
    expect(inputs(wrapper)[0].props('error')).toBe(
      'ATTRIBUTES_MGMT.ADD.FORM.NAME.ERROR'
    );
    expect(inputs(wrapper)[1].props('error')).toBe(
      'ATTRIBUTES_MGMT.ADD.FORM.KEY.ERROR'
    );
    expect(wrapper.text()).toContain('ATTRIBUTES_MGMT.ADD.FORM.DESC.ERROR');

    await fill(wrapper);
    await inputs(wrapper)[1].vm.$emit('update:modelValue', 'two words');
    expect(inputs(wrapper)[1].props('error')).toBe(
      'ATTRIBUTES_MGMT.ADD.FORM.KEY.ERROR'
    );
    await submit(wrapper);
    expect(store.dispatch).not.toHaveBeenCalled();

    store.getters.getUIFlags = { isCreating: true };
    expect(submitButton(mountDialog()).props('disabled')).toBe(true);
  });

  it('needs list values for list attributes and resets them on type change', async () => {
    const wrapper = mountDialog();
    await fill(wrapper);
    await selects(wrapper)[1].setValue('6');
    const tags = () => wrapper.findComponent(TagInput);
    expect(wrapper.find('input[type="checkbox"]').exists()).toBe(false);
    expect(submitButton(wrapper).props('disabled')).toBe(true);
    await tags().vm.$emit('blur');
    expect(wrapper.find('.border-n-ruby-9').exists()).toBe(true);
    await tags().vm.$emit('update:modelValue', ['Free', 'Pro']);
    expect(wrapper.find('.border-n-ruby-9').exists()).toBe(false);
    await submit(wrapper);
    expect(store.dispatch.mock.calls[0][1]).toMatchObject({
      attribute_display_type: 6,
      attribute_values: ['Free', 'Pro'],
    });

    await selects(wrapper)[1].setValue('1');
    await selects(wrapper)[1].setValue('6');
    expect(tags().props('modelValue')).toEqual([]);
  });

  it('cancels and works with the default close handler', async () => {
    let wrapper = mountDialog();
    await wrapper.findAllComponents(NextButton)[0].trigger('click');
    expect(wrapper.props('onClose')).toHaveBeenCalled();
    wrapper = mount(AddAttribute, {
      global: {
        mocks: { $store: store },
        stubs: { WootInput, TagInput, NextButton, WootModalHeader: true },
      },
    });
    await wrapper.findAllComponents(NextButton)[0].trigger('click');
    expect(wrapper.exists()).toBe(true);
  });
});
