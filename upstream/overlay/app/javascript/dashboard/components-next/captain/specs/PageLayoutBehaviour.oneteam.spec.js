/**
 * OneTeam behaviour spec for the shared Captain page layout.
 *
 * Covers the back button and title, the active assistant's name (or the
 * new assistant fallback, hidden while assistants load), opening and
 * closing the assistant switcher (including a click outside) and creating
 * an assistant from it, the header button and its click-away, the know
 * more slot, the spinner, paywall, empty and body states, and the
 * pagination footer.
 */
import { mount } from '@vue/test-utils';
import { ref } from 'vue';
import PageLayout from '../PageLayout.vue';

const env = vi.hoisted(() => ({
  paywall: false,
  assistants: [],
  fetching: false,
  log: [],
}));

vi.mock('vue-router', async importOriginal => ({
  ...(await importOriginal()),
  useRoute: () => ({ params: { assistantId: '2' } }),
}));
vi.mock('dashboard/composables/usePolicy', () => ({
  usePolicy: () => ({ shouldShowPaywall: () => env.paywall }),
}));
vi.mock('dashboard/composables/store.js', () => ({
  useMapGetter: name =>
    name === 'captainAssistants/getRecords'
      ? ref(env.assistants)
      : ref({ fetchingList: env.fetching }),
}));
vi.mock('@vueuse/components', async importOriginal => ({
  ...(await importOriginal()),
  OnClickOutside: {
    name: 'OnClickOutside',
    emits: ['trigger'],
    template: '<div class="outside"><slot /></div>',
  },
}));

const Button = {
  name: 'Button',
  props: ['icon', 'label', 'variant'],
  emits: ['click'],
  template:
    '<button :class="icon" @click="$emit(\'click\')">{{ label }}</button>',
};
const Switcher = {
  name: 'AssistantSwitcher',
  emits: ['close', 'createAssistant'],
  template: '<div class="switcher" />',
};
const Pagination = {
  name: 'PaginationFooter',
  props: ['currentPage', 'totalItems'],
  emits: ['update:currentPage'],
  template: '<nav />',
};

let clickaway;
const slots = {
  knowMore: '<a class="know-more" />',
  controls: '<div class="controls" />',
  paywall: '<div class="paywall" />',
  emptyState: '<div class="empty" />',
  body: '<div class="body" />',
};
const mountLayout = (props = {}) =>
  mount(PageLayout, {
    props,
    slots,
    global: {
      stubs: {
        Button,
        AssistantSwitcher: Switcher,
        PaginationFooter: Pagination,
        BackButton: { props: ['backUrl'], template: '<a class="back" />' },
        Spinner: { template: '<i class="spinner" />' },
        Policy: { template: '<div><slot /></div>' },
        CreateAssistantDialog: {
          setup: () => ({
            dialogRef: { open: () => env.log.push('create') },
          }),
          template: '<div />',
        },
      },
      directives: {
        'on-clickaway': {
          mounted: (el, { value }) => {
            clickaway = value;
          },
        },
      },
    },
  });

const chevron = wrapper => wrapper.find('button.i-lucide-chevron-down');

describe('Captain PageLayout behaviour', () => {
  beforeEach(() => {
    env.paywall = false;
    env.fetching = false;
    env.assistants = [{ id: 2, name: 'Helper' }];
    env.log = [];
  });

  it('shows the header, assistant name and body', () => {
    const wrapper = mountLayout({ headerTitle: 'FAQs', backUrl: '/back' });
    expect(wrapper.find('.back').exists()).toBe(true);
    expect(wrapper.text()).toContain('Helper');
    expect(wrapper.text()).toContain('FAQs');
    expect(wrapper.find('.know-more').exists()).toBe(true);
    expect(wrapper.find('.controls').exists()).toBe(true);
    expect(wrapper.find('.body').exists()).toBe(true);

    env.assistants = [];
    expect(mountLayout().text()).toContain(
      'CAPTAIN.ASSISTANT_SWITCHER.NEW_ASSISTANT'
    );
    env.assistants = null;
    expect(mountLayout().text()).toContain(
      'CAPTAIN.ASSISTANT_SWITCHER.NEW_ASSISTANT'
    );
    env.fetching = true;
    expect(mountLayout().text()).not.toContain(
      'CAPTAIN.ASSISTANT_SWITCHER.NEW_ASSISTANT'
    );
  });

  it('opens, closes and creates from the assistant switcher', async () => {
    const wrapper = mountLayout();
    await chevron(wrapper).trigger('click');
    expect(chevron(wrapper).attributes()).toBeDefined();
    expect(wrapper.findComponent(Button).props('variant')).toBe('faded');
    await wrapper.findComponent(Switcher).vm.$emit('close');
    expect(wrapper.find('.switcher').exists()).toBe(false);

    await chevron(wrapper).trigger('click');
    await wrapper.findComponent({ name: 'OnClickOutside' }).vm.$emit('trigger');
    expect(wrapper.find('.switcher').exists()).toBe(false);

    await chevron(wrapper).trigger('click');
    await wrapper.findComponent(Switcher).vm.$emit('createAssistant');
    expect(wrapper.find('.switcher').exists()).toBe(false);
    expect(env.log).toEqual(['create']);
  });

  it('clicks and clicks away from the header button', async () => {
    const wrapper = mountLayout({ buttonLabel: 'Add FAQ' });
    await wrapper.find('button.i-lucide-plus').trigger('click');
    expect(wrapper.emitted('click')).toHaveLength(1);
    clickaway();
    expect(wrapper.emitted('close')).toHaveLength(1);
  });

  it('shows the spinner, paywall and empty states', () => {
    expect(mountLayout({ isFetching: true }).find('.spinner').exists()).toBe(
      true
    );
    const empty = mountLayout({ isEmpty: true });
    expect(empty.find('.empty').exists()).toBe(true);
    expect(empty.find('.know-more').exists()).toBe(false);

    env.paywall = true;
    const paywall = mountLayout({ buttonLabel: 'Add', headerTitle: 'FAQs' });
    expect(paywall.find('.paywall').exists()).toBe(true);
    expect(paywall.find('.controls').exists()).toBe(false);
    expect(chevron(paywall).exists()).toBe(false);
    expect(paywall.find('button.i-lucide-plus').exists()).toBe(false);
  });

  it('pages and can hide the footer and switcher', async () => {
    const wrapper = mountLayout({ currentPage: 2, totalCount: 60 });
    const pagination = wrapper.findComponent(Pagination);
    expect(pagination.props()).toMatchObject({
      currentPage: 2,
      totalItems: 60,
    });
    await pagination.vm.$emit('update:currentPage', 3);
    expect(wrapper.emitted('update:currentPage')).toEqual([[3]]);

    const bare = mountLayout({
      showPaginationFooter: false,
      showAssistantSwitcher: false,
      showKnowMore: false,
    });
    expect(bare.findComponent(Pagination).exists()).toBe(false);
    expect(chevron(bare).exists()).toBe(false);
    expect(bare.find('.know-more').exists()).toBe(false);
  });
});
