/**
 * OneTeam behaviour spec for the reply editor's Copilot menu.
 *
 * Covers which actions show for replies, notes and empty editors, the
 * tone submenu, emitting the chosen action (but not for the submenu
 * parent), placing the submenu on the side with room, and the floating
 * selection-menu offset that follows the menu height.
 */
import { computed, ref } from 'vue';
import { flushPromises, mount } from '@vue/test-utils';
import CopilotMenuBar from '../CopilotMenuBar.vue';

const env = vi.hoisted(() => ({}));

vi.mock('vue-i18n', async importOriginal => ({
  ...(await importOriginal()),
  useI18n: () => ({ t: key => key }),
}));
vi.mock('dashboard/composables/store', () => ({
  useMapGetter: () => computed(() => env.mode),
}));
vi.mock('@vueuse/core', async importOriginal => ({
  ...(await importOriginal()),
  useElementSize: () => ({ height: env.height }),
  useWindowSize: () => ({ width: env.width }),
}));

const NextButton = {
  name: 'Button',
  props: ['label', 'icon'],
  emits: ['click'],
  template:
    '<button :data-label="label" @click="$emit(\'click\')"><slot>{{ label }}</slot></button>',
};
const DropdownBody = {
  name: 'DropdownBody',
  template: '<div class="dropdown"><slot /></div>',
};

const mountMenu = async (props = {}, mode = 'REPLY') => {
  env.mode = mode;
  const wrapper = mount(CopilotMenuBar, {
    props: { conversationId: 4, hasContent: true, ...props },
    global: { stubs: { Button: NextButton, DropdownBody, Icon: true } },
  });
  await flushPromises();
  return wrapper;
};

const keyOf = label => label.split('.').at(-1);
const labels = wrapper =>
  wrapper.findAllComponents(NextButton).map(b => keyOf(b.props('label')));
const clickLabel = (wrapper, key) =>
  wrapper
    .findAllComponents(NextButton)
    .find(b => keyOf(b.props('label')) === key)
    .trigger('click');

describe('Copilot menu bar behaviour', () => {
  beforeEach(() => {
    env.height = ref(0);
    env.width = ref(1200);
  });

  it('offers every action while replying with content', async () => {
    const wrapper = await mountMenu();
    expect(labels(wrapper)).toEqual([
      'IMPROVE_REPLY',
      'TITLE',
      'PROFESSIONAL',
      'CASUAL',
      'STRAIGHTFORWARD',
      'CONFIDENT',
      'FRIENDLY',
      'GRAMMAR',
      'SUGGESTION',
      'SUMMARIZE',
      'ASK_COPILOT',
    ]);
    expect(wrapper.find('.h-px').exists()).toBe(true);
  });

  it('drops reply-only actions in notes and outside conversations', async () => {
    expect(labels(await mountMenu({}, 'NOTE'))).toEqual([
      'TITLE',
      'PROFESSIONAL',
      'CASUAL',
      'STRAIGHTFORWARD',
      'CONFIDENT',
      'FRIENDLY',
      'GRAMMAR',
      'SUMMARIZE',
      'ASK_COPILOT',
    ]);
    expect(labels(await mountMenu({ conversationId: null }))).toContain(
      'GRAMMAR'
    );
    expect(labels(await mountMenu({ conversationId: null }))).toEqual(
      expect.not.arrayContaining(['IMPROVE_REPLY', 'SUGGESTION', 'SUMMARIZE'])
    );
    const empty = await mountMenu({ hasContent: false });
    expect(labels(empty)).toEqual(['SUGGESTION', 'SUMMARIZE', 'ASK_COPILOT']);
    expect(empty.find('.h-px').exists()).toBe(false);
  });

  it('emits chosen actions but not the tone parent', async () => {
    const wrapper = await mountMenu();
    await clickLabel(wrapper, 'TITLE');
    await clickLabel(wrapper, 'CASUAL');
    await clickLabel(wrapper, 'GRAMMAR');
    await clickLabel(wrapper, 'ASK_COPILOT');
    expect(wrapper.emitted('executeCopilotAction')).toEqual([
      ['casual'],
      ['fix_spelling_grammar'],
      ['ask_copilot'],
    ]);
  });

  it('places the tone submenu on the side with room', async () => {
    const wrapper = await mountMenu();
    const submenu = () => wrapper.findAll('.dropdown')[1];
    const root = wrapper.findComponent(DropdownBody).element;
    const place = async (left, right, width) => {
      root.getBoundingClientRect = () => ({ left, right });
      env.width.value = width;
      wrapper.vm.$forceUpdate();
      await flushPromises();
    };
    expect(submenu().classes()).toContain('left-full');
    await place(900, 1100, 1201);
    expect(submenu().classes()).toContain('right-full');
    await place(10, 1100, 1150);
    expect(submenu().classes()).toContain('left-full');
    env.width.value = undefined;
    root.getBoundingClientRect = () => ({
      left: 0,
      right: window.innerWidth - 300,
    });
    wrapper.vm.$forceUpdate();
    await flushPromises();
    expect(submenu().classes()).toContain('left-full');
  });

  it('floats above a selection using the menu height', async () => {
    const wrapper = await mountMenu({
      hasSelection: true,
      isEditorMenuPopover: true,
    });
    const root = () => wrapper.find('.dropdown');
    expect(root().classes()).toContain('selection-menu');
    expect(root().attributes('style')).toContain(
      'calc(var(--selection-top) - 60px)'
    );
    env.height.value = 40;
    await flushPromises();
    expect(root().attributes('style')).toContain(
      'calc(var(--selection-top) - 50px)'
    );
    const plain = await mountMenu({ hasSelection: true });
    expect(plain.find('.dropdown').classes()).not.toContain('selection-menu');
  });
});
