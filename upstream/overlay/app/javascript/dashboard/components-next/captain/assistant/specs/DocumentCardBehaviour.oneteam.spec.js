/**
 * OneTeam behaviour spec for a Captain document card.
 *
 * Covers selection and hover events, the sync/retry and delete menu by
 * permission and sync state, choosing an action and closing the menu
 * (also on an outside click), retrying from the sync status, the created
 * date when the document isn't syncable, PDF and unsafe links, and a
 * missing assistant.
 */
import { mount } from '@vue/test-utils';
import DocumentCard from '../DocumentCard.vue';

const env = vi.hoisted(() => ({ admin: true }));
let outside;

vi.mock('dashboard/composables/usePolicy', () => ({
  usePolicy: () => ({ checkPermissions: () => env.admin }),
}));
vi.mock('shared/helpers/timeHelper', () => ({ dynamicTime: () => 'ago' }));
vi.mock('@vueuse/core', async importOriginal => {
  const { ref: appRef } = await import('vue');
  return {
    ...(await importOriginal()),
    useToggle: () => {
      const state = appRef(false);
      const toggle = value => {
        state.value = typeof value === 'boolean' ? value : !state.value;
      };
      return [state, toggle];
    },
  };
});

const DropdownMenu = {
  name: 'DropdownMenu',
  props: ['menuItems'],
  emits: ['action'],
  template: '<ul />',
};
const Checkbox = {
  name: 'Checkbox',
  props: ['modelValue'],
  emits: ['update:modelValue'],
  template: '<input type="checkbox" />',
};
const DocumentSyncStatus = {
  name: 'DocumentSyncStatus',
  props: ['showRetry'],
  emits: ['retry'],
  template: '<span class="sync" />',
};

const mountCard = props =>
  mount(DocumentCard, {
    props: {
      id: 9,
      name: 'Guide',
      externalLink: 'https://acme.test/guide',
      createdAt: 1,
      status: 'available',
      ...props,
    },
    global: {
      stubs: {
        DropdownMenu,
        Checkbox,
        DocumentSyncStatus,
        CardLayout: { template: '<section><slot /></section>' },
        Button: {
          emits: ['click'],
          template: '<button class="menu" @click="$emit(\'click\')" />',
        },
        Icon: { props: ['icon'], template: '<i :class="icon" />' },
      },
      directives: {
        tooltip: {},
        onClickaway: {
          mounted: (el, binding) => {
            outside = binding.value;
          },
        },
      },
    },
  });
const actions = wrapper =>
  wrapper.findComponent(DropdownMenu).props('menuItems');

describe('DocumentCard behaviour', () => {
  beforeEach(() => {
    env.admin = true;
  });

  it('selects, hovers and runs menu actions', async () => {
    const wrapper = mountCard({ isSelected: true, showSelectionControl: true });
    const box = wrapper.findComponent(Checkbox);
    expect(box.props('modelValue')).toBe(true);
    box.vm.$emit('update:modelValue', false);
    expect(wrapper.emitted('select')).toEqual([[9]]);
    await wrapper.find('section').trigger('mouseenter');
    await wrapper.find('section').trigger('mouseleave');
    expect(wrapper.emitted('hover')).toEqual([[true], [false]]);

    await wrapper.find('.menu').trigger('click');
    expect(actions(wrapper).map(item => item.label)).toEqual([
      'CAPTAIN.DOCUMENTS.OPTIONS.SYNC_NOW',
      'CAPTAIN.DOCUMENTS.OPTIONS.DELETE_DOCUMENT',
    ]);
    await wrapper
      .findComponent(DropdownMenu)
      .vm.$emit('action', { action: 'delete', value: 'delete' });
    expect(wrapper.emitted('action')).toEqual([
      [{ action: 'delete', value: 'delete', id: 9 }],
    ]);
    expect(wrapper.findComponent(DropdownMenu).exists()).toBe(false);

    await wrapper.find('.menu').trigger('click');
    outside();
    await wrapper.vm.$nextTick();
    expect(wrapper.findComponent(DropdownMenu).exists()).toBe(false);
    expect(wrapper.find('a').attributes('href')).toBe(
      'https://acme.test/guide'
    );
  });

  it('offers a retry for failed or stalled syncs', async () => {
    const failed = mountCard({ syncStatus: 'failed' });
    expect(failed.findComponent(DocumentSyncStatus).props('showRetry')).toBe(
      true
    );
    await failed.find('.menu').trigger('click');
    expect(actions(failed)[0].label).toBe(
      'CAPTAIN.DOCUMENTS.OPTIONS.RETRY_SYNC'
    );
    failed.findComponent(DocumentSyncStatus).vm.$emit('retry');
    expect(failed.emitted('action')).toEqual([[{ action: 'sync', id: 9 }]]);

    const stalled = mountCard({ syncStatus: 'syncing' });
    expect(stalled.findComponent(DocumentSyncStatus).props('showRetry')).toBe(
      true
    );
    const running = mountCard({ syncStatus: 'syncing', syncInProgress: true });
    expect(running.findComponent(DocumentSyncStatus).props('showRetry')).toBe(
      false
    );
    const pending = mountCard({ status: 'pending' });
    await pending.find('.menu').trigger('click');
    expect(actions(pending)).toHaveLength(1);
  });

  it('hides the menu without permission and shows non-syncable details', () => {
    env.admin = false;
    const pdf = mountCard({
      syncable: false,
      pdfDocument: true,
      assistant: null,
      externalLink: 'https://acme.test/files/guide.pdf',
    });
    expect(pdf.find('.menu').exists()).toBe(false);
    expect(pdf.find('.sync').exists()).toBe(false);
    expect(pdf.text()).toContain('ago');
    expect(pdf.find('a').exists()).toBe(false);
    expect(pdf.find('.i-ph-file-pdf').exists()).toBe(true);

    const unsafe = mountCard({ externalLink: 'ftp://acme.test/guide' });
    expect(unsafe.find('a').exists()).toBe(false);
    expect(unsafe.find('.i-ph-link-simple').exists()).toBe(true);

    const markdown = mountCard({ markdownDocument: true });
    expect(markdown.find('.i-lucide-file-text').exists()).toBe(true);
    expect(markdown.find('.truncate span').text()).toBe('Guide');
  });

  it('opens details from the title and follows the link without bubbling', async () => {
    const wrapper = mountCard();
    await wrapper.find('button[type="button"]').trigger('click');
    expect(wrapper.emitted('action')).toEqual([
      [{ action: 'viewDetails', id: 9 }],
    ]);
    const bubbled = vi.fn();
    wrapper.find('section').element.addEventListener('click', bubbled);
    const anchor = wrapper.find('a').element;
    anchor.addEventListener('click', event => event.preventDefault());
    anchor.click();
    expect(bubbled).not.toHaveBeenCalled();
  });
});
