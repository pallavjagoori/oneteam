/**
 * OneTeam behaviour spec for a single detail row in the contact panel
 * (email, phone, company and similar).
 *
 * Covers linked and plain rows, the "not available" text, copying the
 * value, and inline editing: starting it (only when editable), saving a
 * trimmed change on Enter or blur, skipping unchanged values, and
 * cancelling with Escape.
 */
import { flushPromises, mount } from '@vue/test-utils';
import { useAlert } from 'dashboard/composables';
import { copyTextToClipboard } from 'shared/helpers/clipboard';
import ContactInfoRow from '../ContactInfoRow.vue';

const env = vi.hoisted(() => ({ focus: null }));

vi.mock('dashboard/composables', () => ({ useAlert: vi.fn() }));
vi.mock('shared/helpers/clipboard', () => ({ copyTextToClipboard: vi.fn() }));

const NextButton = {
  name: 'NextButton',
  props: ['icon'],
  emits: ['click'],
  template: '<button :data-icon="icon" @click="$emit(\'click\', $event)" />',
};
const InlineInput = {
  name: 'InlineInput',
  props: ['modelValue', 'placeholder'],
  emits: ['update:modelValue', 'enterPress', 'escapePress', 'blur'],
  methods: {
    focus() {
      env.focus();
    },
  },
  template: '<input class="edit" />',
};

const mountRow = props =>
  mount(ContactInfoRow, {
    props: { icon: 'mail', emoji: '✉️', ...props },
    global: {
      directives: {
        dompurifyHtml: (el, binding) => {
          el.innerHTML = binding.value;
        },
      },
      stubs: {
        NextButton,
        Button: NextButton,
        InlineInput,
        EmojiOrIcon: { template: '<i class="icon" />' },
      },
    },
  });

const button = (wrapper, icon) =>
  wrapper.find(`[data-icon="i-lucide-${icon}"]`);
const input = wrapper => wrapper.findComponent(InlineInput);

describe('ContactInfoRow behaviour', () => {
  beforeEach(() => {
    env.focus = vi.fn();
  });

  it('shows linked and plain values and copies them', async () => {
    const linked = mountRow({
      href: 'mailto:ann@acme.io',
      value: 'ann@acme.io',
      showCopy: true,
    });
    expect(linked.find('a').attributes('href')).toBe('mailto:ann@acme.io');
    expect(linked.find('[title="ann@acme.io"]').text()).toBe('ann@acme.io');
    await button(linked, 'clipboard').trigger('click');
    await flushPromises();
    expect(copyTextToClipboard).toHaveBeenCalledWith('ann@acme.io');
    expect(useAlert).toHaveBeenCalledWith('CONTACT_PANEL.COPY_SUCCESSFUL');

    const plain = mountRow({ value: '<b>Acme</b>', showCopy: true });
    expect(plain.find('a').exists()).toBe(false);
    expect(plain.find('b').text()).toBe('Acme');
    await button(plain, 'clipboard').trigger('click');
    expect(copyTextToClipboard).toHaveBeenLastCalledWith('<b>Acme</b>');

    expect(mountRow({ href: 'tel:' }).text()).toBe(
      'CONTACT_PANEL.NOT_AVAILABLE'
    );
    expect(mountRow().text()).toBe('CONTACT_PANEL.NOT_AVAILABLE');
    expect(mountRow().find('button').exists()).toBe(false);
  });

  it('edits a linked value and saves the trimmed change', async () => {
    const wrapper = mountRow({
      href: 'mailto:ann@acme.io',
      value: 'ann@acme.io',
      editable: true,
      title: 'Email',
    });
    await button(wrapper, 'pencil').trigger('click');
    await flushPromises();
    expect(env.focus).toHaveBeenCalled();
    expect(input(wrapper).props()).toEqual({
      modelValue: 'ann@acme.io',
      placeholder: 'Email',
    });

    await input(wrapper).vm.$emit('update:modelValue', '  ann@new.io ');
    await input(wrapper).vm.$emit('enterPress');
    expect(wrapper.emitted('update')[0]).toEqual(['ann@new.io']);
    expect(input(wrapper).exists()).toBe(false);

    wrapper.vm.saveEdit();
    expect(wrapper.emitted('update')).toHaveLength(1);
  });

  it('skips unchanged values and cancels with Escape', async () => {
    const wrapper = mountRow({ editable: true });
    await button(wrapper, 'pencil').trigger('click');
    expect(input(wrapper).props('modelValue')).toBe('');
    await input(wrapper).vm.$emit('update:modelValue', '   ');
    await input(wrapper).vm.$emit('blur');
    expect(wrapper.emitted('update')).toBeUndefined();

    await button(wrapper, 'pencil').trigger('click');
    await input(wrapper).vm.$emit('update:modelValue', 'Acme');
    await input(wrapper).vm.$emit('escapePress');
    expect(input(wrapper).exists()).toBe(false);
    expect(wrapper.emitted('update')).toBeUndefined();
  });

  it('ignores editing when the row is read-only', () => {
    const wrapper = mountRow({ value: 'Acme' });
    wrapper.vm.startEditing();
    expect(wrapper.vm.isEditing).toBe(false);
  });
});
