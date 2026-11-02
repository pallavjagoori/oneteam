/**
 * OneTeam behaviour spec for the shared next-gen dialog.
 *
 * Covers opening and closing through the exposed methods (content only
 * renders while open), the title, description and custom description
 * slot, the default and custom button labels, confirming by submit, the
 * loading and disabled confirm button, hiding either button, the edit
 * and alert colours, the width, position and overflow classes, closing
 * on the native close event only when it comes from this dialog, and
 * closing on an outside click only when this dialog is the topmost one.
 */
import { mount } from '@vue/test-utils';
import Dialog from '../Dialog.vue';

const env = vi.hoisted(() => ({}));

const OnClickOutside = {
  name: 'OnClickOutside',
  emits: ['trigger'],
  setup(props, { emit }) {
    env.outside = () => emit('trigger');
  },
  template: '<div><slot /></div>',
};
const Button = {
  name: 'Button',
  props: ['label', 'color', 'isLoading', 'disabled', 'type'],
  emits: ['click'],
  template:
    '<button :type="type" :disabled="disabled" @click="$emit(\'click\')">{{ label }}</button>',
};

const mountDialog = (props = {}, slots = {}) =>
  mount(Dialog, {
    attachTo: document.body,
    props,
    slots: { default: '<p class="content">Body</p>', ...slots },
    global: {
      stubs: {
        TeleportWithDirection: { template: '<div><slot /></div>' },
        OnClickOutside,
        Button,
        NextButton: Button,
      },
    },
  });

describe('Dialog behaviour', () => {
  let wrappers = [];
  const make = (...args) => {
    const wrapper = mountDialog(...args);
    wrappers.push(wrapper);
    return wrapper;
  };

  const { showModal: realShowModal, close: realClose } =
    HTMLDialogElement.prototype;

  beforeAll(() => {
    HTMLDialogElement.prototype.showModal = function showModal() {
      this.setAttribute('open', '');
    };
    HTMLDialogElement.prototype.close = function close() {
      this.removeAttribute('open');
    };
  });

  afterAll(() => {
    HTMLDialogElement.prototype.showModal = realShowModal;
    HTMLDialogElement.prototype.close = realClose;
  });

  afterEach(() => {
    wrappers.forEach(w => w.unmount());
    wrappers = [];
  });

  it('opens, confirms and closes', async () => {
    const wrapper = make({ title: 'Delete inbox', description: 'Sure?' });
    const dialog = wrapper.find('dialog');
    expect(wrapper.find('.content').exists()).toBe(false);
    expect(dialog.classes()).toEqual(
      expect.arrayContaining(['max-w-lg', 'overflow-visible'])
    );
    expect(wrapper.find('h3').text()).toBe('Delete inbox');
    expect(wrapper.find('p.text-n-slate-11').text()).toBe('Sure?');

    wrapper.vm.open();
    await wrapper.vm.$nextTick();
    expect(dialog.attributes('open')).toBeDefined();
    expect(wrapper.find('.content').exists()).toBe(true);
    const [cancel, confirm] = wrapper.findAllComponents(Button);
    expect(cancel.text()).toBe('DIALOG.BUTTONS.CANCEL');
    expect(confirm.props()).toMatchObject({
      label: 'DIALOG.BUTTONS.CONFIRM',
      color: 'blue',
      disabled: false,
    });

    await wrapper.find('form').trigger('submit');
    expect(wrapper.emitted('confirm')).toHaveLength(1);
    await cancel.trigger('click');
    expect(wrapper.emitted('close')).toHaveLength(1);
    expect(dialog.attributes('open')).toBeUndefined();
    expect(wrapper.find('.content').exists()).toBe(false);
  });

  it('closes on its own close event but not a child dialog’s', async () => {
    const wrapper = make({}, { default: '<dialog class="child" />' });
    wrapper.vm.open();
    await wrapper.vm.$nextTick();
    await wrapper.find('dialog.child').trigger('close');
    expect(wrapper.emitted('close')).toBeUndefined();
    await wrapper.find('dialog').trigger('close');
    expect(wrapper.emitted('close')).toHaveLength(1);
  });

  it('closes on an outside click only when topmost', async () => {
    const wrapper = make();
    wrapper.vm.open();
    const other = document.createElement('dialog');
    other.setAttribute('open', '');
    document.body.appendChild(other);
    env.outside();
    expect(wrapper.emitted('close')).toBeUndefined();
    other.remove();
    env.outside();
    expect(wrapper.emitted('close')).toHaveLength(1);
  });

  it('uses custom labels, alert colours and layout options', () => {
    const wrapper = make({
      type: 'alert',
      cancelButtonLabel: 'Keep',
      confirmButtonLabel: 'Delete',
      isLoading: true,
      width: '3xl',
      position: 'top',
      overflowYAuto: true,
    });
    const [cancel, confirm] = wrapper.findAllComponents(Button);
    expect(cancel.text()).toBe('Keep');
    expect(confirm.props()).toMatchObject({
      label: 'Delete',
      color: 'ruby',
      isLoading: true,
      disabled: true,
    });
    expect(wrapper.find('dialog').classes()).toEqual(
      expect.arrayContaining([
        'max-w-3xl',
        'dialog-position-top',
        'overflow-y-auto',
      ])
    );
    expect(wrapper.find('h3').exists()).toBe(false);

    expect(
      make({ disableConfirmButton: true })
        .findAllComponents(Button)[1]
        .props('disabled')
    ).toBe(true);
  });

  it('hides buttons and accepts custom description and footer slots', () => {
    expect(
      make({ showCancelButton: false }).findAllComponents(Button)
    ).toHaveLength(1);
    expect(
      make({ showConfirmButton: false }).findAllComponents(Button)
    ).toHaveLength(1);
    const none = make({ showCancelButton: false, showConfirmButton: false });
    expect(none.find('.justify-between').exists()).toBe(false);

    const custom = make(
      { title: 'Import' },
      {
        description: '<span class="desc">Pick a file</span>',
        footer: '<div class="foot" />',
      }
    );
    expect(custom.find('.desc').exists()).toBe(true);
    expect(custom.find('.foot').exists()).toBe(true);
    expect(custom.findAllComponents(Button)).toHaveLength(0);
    expect(
      make({ title: 'Only title' }).find('p.text-n-slate-11').exists()
    ).toBe(false);
  });

  it('falls back to a medium width for an unknown size', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(make({ width: 'huge' }).find('dialog').classes()).toContain(
      'max-w-md'
    );
    warn.mockRestore();
  });
});
