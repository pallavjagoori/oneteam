/**
 * OneTeam behaviour spec for the contact labels list.
 *
 * Covers fetching labels on mount and on contact change, the saved labels
 * and the sorted menu, adding and removing labels (by menu or by the
 * label's remove button), unknown labels, failed updates, and the hover
 * state that drives the remove buttons.
 */
import { computed } from 'vue';
import { mount, flushPromises } from '@vue/test-utils';
import ContactLabels from '../ContactLabels.vue';

const env = vi.hoisted(() => ({
  state: {},
  route: { params: {} },
  dispatch: null,
}));

vi.mock('dashboard/composables/store', () => ({
  useMapGetter: name => computed(() => env.state[name]),
  useStore: () => ({ dispatch: env.dispatch }),
}));
vi.mock('vue-router', () => ({ useRoute: () => env.route }));

const LabelItem = {
  name: 'LabelItem',
  props: ['label', 'isHovered'],
  emits: ['remove', 'hover'],
  template:
    '<span class="label" :data-hovered="String(isHovered)">{{ label.title }}</span>',
};
const AddLabel = {
  name: 'AddLabel',
  props: ['labelMenuItems'],
  emits: ['updateLabel'],
  template: '<button class="add" />',
};

const labels = [
  { id: 1, title: 'vip', color: '#f00' },
  { id: 2, title: 'lead', color: '#0f0' },
  { id: 3, title: 'churn', color: '#00f' },
];

const mountLabels = async (props = { contactId: 7 }) => {
  const wrapper = mount(ContactLabels, {
    props,
    global: { stubs: { LabelItem, AddLabel } },
  });
  await flushPromises();
  return wrapper;
};
const menu = wrapper => wrapper.findComponent(AddLabel);
const items = wrapper => wrapper.findAllComponents(LabelItem);

describe('ContactLabels behaviour', () => {
  beforeEach(() => {
    env.dispatch = vi.fn();
    env.route = { params: {} };
    env.state = {
      'labels/getLabels': labels,
      'contactLabels/getContactLabels': () => ['lead', 'vip'],
    };
  });

  it('fetches labels for the routed contact on mount', async () => {
    env.route = { params: { contactId: '7' } };
    await mountLabels();
    expect(env.dispatch).toHaveBeenCalledWith('contactLabels/get', '7');
  });

  it('skips fetching without a routed contact and refetches on change', async () => {
    const wrapper = await mountLabels();
    expect(env.dispatch).not.toHaveBeenCalled();
    await wrapper.setProps({ contactId: 8 });
    expect(env.dispatch).toHaveBeenCalledWith('contactLabels/get', 8);
    env.dispatch.mockClear();
    await wrapper.setProps({ contactId: null });
    expect(env.dispatch).not.toHaveBeenCalled();
  });

  it('shows saved labels and lists unselected labels first', async () => {
    const wrapper = await mountLabels();
    expect(items(wrapper).map(item => item.text())).toEqual(['vip', 'lead']);
    expect(menu(wrapper).props('labelMenuItems')).toEqual([
      {
        label: 'churn',
        value: 3,
        thumbnail: { name: 'churn', color: '#00f' },
        isSelected: false,
        action: 'contactLabel',
      },
      {
        label: 'vip',
        value: 1,
        thumbnail: { name: 'vip', color: '#f00' },
        isSelected: true,
        action: 'contactLabel',
      },
      {
        label: 'lead',
        value: 2,
        thumbnail: { name: 'lead', color: '#0f0' },
        isSelected: true,
        action: 'contactLabel',
      },
    ]);
  });

  it('adds and removes labels', async () => {
    const wrapper = await mountLabels();
    await menu(wrapper).vm.$emit('updateLabel', { value: 3 });
    expect(env.dispatch).toHaveBeenLastCalledWith('contactLabels/update', {
      contactId: 7,
      labels: ['vip', 'lead', 'churn'],
    });
    await menu(wrapper).vm.$emit('updateLabel', { value: 1 });
    expect(env.dispatch).toHaveBeenLastCalledWith('contactLabels/update', {
      contactId: 7,
      labels: ['lead'],
    });
    await items(wrapper)[1].vm.$emit('remove', labels[1]);
    expect(env.dispatch).toHaveBeenLastCalledWith('contactLabels/update', {
      contactId: 7,
      labels: ['vip'],
    });
  });

  it('ignores unknown labels and swallows failed updates', async () => {
    const wrapper = await mountLabels();
    await menu(wrapper).vm.$emit('updateLabel', { value: 99 });
    expect(env.dispatch).not.toHaveBeenCalled();
    env.dispatch.mockRejectedValue(new Error('nope'));
    await menu(wrapper).vm.$emit('updateLabel', { value: 3 });
    await flushPromises();
    expect(env.dispatch).toHaveBeenCalledTimes(1);
  });

  it('tracks the hovered label and resets on mouse leave', async () => {
    const wrapper = await mountLabels();
    await items(wrapper)[0].vm.$emit('hover');
    expect(items(wrapper).map(i => i.attributes('data-hovered'))).toEqual([
      'true',
      'false',
    ]);
    await wrapper.trigger('mouseleave');
    expect(items(wrapper).map(i => i.attributes('data-hovered'))).toEqual([
      'false',
      'false',
    ]);
  });
});
