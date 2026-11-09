/**
 * OneTeam behaviour spec for a contact note.
 *
 * Covers the author avatar and bot fallback, deleting, and collapsing
 * long notes with expand and collapse.
 */
import { mount } from '@vue/test-utils';
import ContactNoteItem from '../ContactNoteItem.vue';

vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: key => key }) }));
vi.mock('shared/composables/useExactTimestamp', () => ({
  useExactTimestamp: () => () => 'exact',
}));
vi.mock('shared/helpers/timeHelper', () => ({ dynamicTime: () => 'now' }));
vi.mock('@vueuse/core', async importOriginal => {
  const { ref: appRef } = await import('vue');
  return {
    ...(await importOriginal()),
    useToggle: () => {
      const value = appRef(false);
      return [
        value,
        () => {
          value.value = !value.value;
        },
      ];
    },
  };
});

/**
 * Mounts the note.
 *
 * @param {object} props component props
 * @returns {import('@vue/test-utils').VueWrapper}
 */
const mountNote = props =>
  mount(ContactNoteItem, {
    props: { writtenBy: 'Amy', note: { id: 9, createdAt: 1 }, ...props },
    global: {
      directives: { tooltip: {}, dompurifyHtml: {} },
      stubs: {
        Avatar: { name: 'Avatar', props: ['name', 'src'], template: '<i />' },
        Button: {
          props: ['icon'],
          emits: ['click'],
          template:
            '<button :class="icon" @click="$emit(\'click\')"><slot /></button>',
        },
      },
    },
  });

describe('ContactNoteItem behaviour', () => {
  afterEach(() => {
    delete HTMLElement.prototype.clientHeight;
  });

  it('shows the author and deletes the note', async () => {
    const wrapper = mountNote({
      allowDelete: true,
      note: { id: 9, createdAt: 1, user: { name: 'Amy', thumbnail: 'a.png' } },
    });
    expect(wrapper.findComponent({ name: 'Avatar' }).props()).toEqual({
      name: 'Amy',
      src: 'a.png',
    });
    await wrapper.find('.i-lucide-trash').trigger('click');
    expect(wrapper.emitted('delete')).toEqual([[9]]);
  });

  it('falls back to the bot avatar without a user', () => {
    const wrapper = mountNote({ collapsible: true });
    expect(wrapper.findComponent({ name: 'Avatar' }).props()).toEqual({
      name: 'Bot',
      src: '/assets/images/chatwoot_bot.png',
    });
    expect(wrapper.find('button').exists()).toBe(false);
  });

  it('collapses long notes and toggles them', async () => {
    Object.defineProperty(HTMLElement.prototype, 'clientHeight', {
      configurable: true,
      get: () => 200,
    });
    const wrapper = mountNote({ collapsible: true });
    await wrapper.vm.$nextTick();
    expect(wrapper.find('p').classes()).toContain('line-clamp-4');
    const toggle = wrapper.find('.i-lucide-chevron-down');
    expect(toggle.text()).toBe('CONTACTS_LAYOUT.SIDEBAR.NOTES.EXPAND');
    await toggle.trigger('click');
    expect(wrapper.find('.i-lucide-chevron-up').text()).toBe(
      'CONTACTS_LAYOUT.SIDEBAR.NOTES.COLLAPSE'
    );
    expect(wrapper.find('p').classes()).not.toContain('line-clamp-4');
  });
});
