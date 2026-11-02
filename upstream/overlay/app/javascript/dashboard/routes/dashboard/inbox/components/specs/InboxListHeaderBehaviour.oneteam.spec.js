/**
 * OneTeam behaviour spec for the notifications inbox list header.
 *
 * Covers toggling the display and options menus (and closing them on an
 * outside click or when a context menu opens), the mark-all-read,
 * delete-all and delete-all-read actions with their alerts, ignoring an
 * unknown option, and forwarding display filter changes.
 */
import { flushPromises, mount } from '@vue/test-utils';
import InboxListHeader from '../InboxListHeader.vue';

const env = vi.hoisted(() => ({ alert: null, track: null }));

vi.mock('dashboard/composables', () => ({
  useAlert: (...args) => env.alert(...args),
  useTrack: (...args) => env.track(...args),
}));

const NextButton = {
  name: 'NextButton',
  props: ['label', 'icon', 'variant'],
  emits: ['click'],
  template: '<button :data-icon="icon" :data-variant="variant" @click="$emit(\'click\')" />',
};
const InboxDisplayMenu = {
  name: 'InboxDisplayMenu',
  emits: ['filter'],
  template: '<div class="display-menu" />',
};
const InboxOptionMenu = {
  name: 'InboxOptionMenu',
  emits: ['optionClick'],
  template: '<div class="option-menu" />',
};

const mountHeader = (props = {}) => {
  const dispatch = vi.fn(() => Promise.resolve());
  const clickaway = [];
  const wrapper = mount(InboxListHeader, {
    props,
    global: {
      stubs: { NextButton, InboxDisplayMenu, InboxOptionMenu },
      mocks: { $store: { dispatch }, $t: key => key },
      directives: {
        onClickaway: {
          mounted: (el, binding) => {
            clickaway.push(binding.value);
          },
        },
      },
    },
  });
  return { wrapper, dispatch, clickaway };
};
const displayButton = wrapper => wrapper.find('[data-icon="i-lucide-chevron-down"]');
const optionsButton = wrapper => wrapper.find('[data-icon="i-lucide-sliders-vertical"]');

describe('Inbox list header behaviour', () => {
  beforeEach(() => {
    env.alert = vi.fn();
    env.track = vi.fn();
  });

  it('toggles both menus and closes them on clickaway or context menu', async () => {
    const { wrapper, clickaway } = mountHeader();
    expect(displayButton(wrapper).attributes('data-variant')).toBe('solid');
    expect(optionsButton(wrapper).attributes('data-variant')).toBe('ghost');
    await displayButton(wrapper).trigger('click');
    await optionsButton(wrapper).trigger('click');
    expect(displayButton(wrapper).attributes('data-variant')).toBe('faded');
    expect(optionsButton(wrapper).attributes('data-variant')).toBe('faded');
    expect(wrapper.find('.display-menu').exists()).toBe(true);
    expect(wrapper.find('.option-menu').exists()).toBe(true);
    clickaway[0]();
    clickaway[1]();
    await wrapper.vm.$nextTick();
    expect(wrapper.find('.display-menu').exists()).toBe(false);
    expect(wrapper.find('.option-menu').exists()).toBe(false);

    await displayButton(wrapper).trigger('click');
    await optionsButton(wrapper).trigger('click');
    await wrapper.setProps({ isContextMenuOpen: false });
    expect(wrapper.find('.display-menu').exists()).toBe(true);
    await wrapper.setProps({ isContextMenuOpen: true });
    expect(wrapper.find('.display-menu').exists()).toBe(false);
    expect(wrapper.find('.option-menu').exists()).toBe(false);
  });

  it('runs each bulk option with its alert and redirects', async () => {
    const { wrapper, dispatch } = mountHeader();
    await optionsButton(wrapper).trigger('click');
    const menu = wrapper.findComponent(InboxOptionMenu);
    menu.vm.$emit('optionClick', 'mark_all_read');
    menu.vm.$emit('optionClick', 'delete_all');
    menu.vm.$emit('optionClick', 'delete_all_read');
    menu.vm.$emit('optionClick', 'unknown');
    await flushPromises();
    expect(env.track).toHaveBeenCalledTimes(1);
    expect(dispatch.mock.calls.map(c => c[0])).toEqual([
      'notifications/readAll',
      'notifications/deleteAll',
      'notifications/deleteAllRead',
    ]);
    expect(env.alert.mock.calls.map(c => c[0])).toEqual([
      'INBOX.ALERTS.MARK_ALL_READ',
      'INBOX.ALERTS.DELETE_ALL',
      'INBOX.ALERTS.DELETE_ALL_READ',
    ]);
    expect(wrapper.emitted('redirect')).toHaveLength(4);
  });

  it('forwards a display filter and closes the display menu', async () => {
    const { wrapper } = mountHeader();
    await displayButton(wrapper).trigger('click');
    wrapper.findComponent(InboxDisplayMenu).vm.$emit('filter', { sort: 'desc' });
    await wrapper.vm.$nextTick();
    expect(wrapper.emitted('filter')).toEqual([[{ sort: 'desc' }]]);
    expect(wrapper.emitted('redirect')).toHaveLength(1);
    expect(wrapper.find('.display-menu').exists()).toBe(false);
  });
});
