/**
 * OneTeam behaviour spec for the availability section of the sidebar
 * profile menu.
 *
 * Covers showing the current status with its colour, listing the three
 * statuses, changing availability (blocked while impersonating, with an
 * alert if the store throws) and toggling auto-offline.
 */
import { ref } from 'vue';
import { mount } from '@vue/test-utils';
import { useAlert } from 'dashboard/composables';
import SidebarProfileMenuStatus from '../SidebarProfileMenuStatus.vue';

const availability = ref('busy');
const autoOffline = ref(true);
const isImpersonating = ref(false);
const dispatch = vi.fn();

vi.mock('dashboard/composables', () => ({ useAlert: vi.fn() }));
vi.mock('dashboard/composables/store', () => ({
  useStore: () => ({ dispatch }),
  useMapGetter: name =>
    ({
      getCurrentUserAvailability: availability,
      getCurrentAccountId: ref(3),
      getCurrentUserAutoOffline: autoOffline,
    })[name],
}));
vi.mock('dashboard/composables/useImpersonation', () => ({
  useImpersonation: () => ({ isImpersonating }),
}));

const passthrough = name => ({ name, template: '<div><slot /></div>' });
const DropdownItem = {
  name: 'DropdownItem',
  props: ['label', 'icon', 'preserveOpen'],
  emits: ['click'],
  template:
    '<div class="item" @click="$emit(\'click\')">{{ label }}<slot /></div>',
};
const DropdownContainer = {
  name: 'DropdownContainer',
  template: '<div><slot name="trigger" :toggle="() => {}" /><slot /></div>',
};
const ToggleSwitch = {
  name: 'Switch',
  props: ['modelValue'],
  emits: ['update:modelValue'],
  template: '<button class="switch" />',
};

const mountMenu = () =>
  mount(SidebarProfileMenuStatus, {
    global: {
      stubs: {
        DropdownSection: passthrough('DropdownSection'),
        DropdownBody: passthrough('DropdownBody'),
        DropdownContainer,
        DropdownItem,
        Button: passthrough('Button'),
        Icon: true,
        Switch: ToggleSwitch,
      },
      directives: { tooltip: {} },
    },
  });

const statusItems = wrapper =>
  wrapper.findAllComponents(DropdownItem).filter(item => item.props('icon'));

describe('SidebarProfileMenuStatus behaviour', () => {
  beforeEach(() => {
    availability.value = 'busy';
    autoOffline.value = true;
    isImpersonating.value = false;
  });

  it('shows the active status and the three choices', () => {
    const wrapper = mountMenu();
    expect(wrapper.text()).toContain('SIDEBAR.SET_YOUR_AVAILABILITY');
    expect(wrapper.find('.bg-n-amber-9').exists()).toBe(true);
    expect(wrapper.find('.truncate').text()).toBe(
      'PROFILE_SETTINGS.FORM.AVAILABILITY.STATUS.BUSY'
    );
    const items = statusItems(wrapper);
    expect(items.map(item => item.props('label'))).toEqual([
      'PROFILE_SETTINGS.FORM.AVAILABILITY.STATUS.ONLINE',
      'PROFILE_SETTINGS.FORM.AVAILABILITY.STATUS.BUSY',
      'PROFILE_SETTINGS.FORM.AVAILABILITY.STATUS.OFFLINE',
    ]);
    expect(items[0].props('icon').props.class).toBe(
      'bg-n-teal-9 size-[12px] rounded'
    );
  });

  it('changes availability', async () => {
    const wrapper = mountMenu();
    await statusItems(wrapper)[2].trigger('click');
    expect(dispatch).toHaveBeenCalledWith('updateAvailability', {
      availability: 'offline',
      account_id: 3,
    });
  });

  it('blocks changes while impersonating', async () => {
    isImpersonating.value = true;
    const wrapper = mountMenu();
    await statusItems(wrapper)[0].trigger('click');
    expect(dispatch).not.toHaveBeenCalled();
    expect(useAlert).toHaveBeenCalledWith(
      'PROFILE_SETTINGS.FORM.AVAILABILITY.IMPERSONATING_ERROR'
    );
  });

  it('alerts when the update throws', async () => {
    dispatch.mockImplementation(() => {
      throw new Error('boom');
    });
    const wrapper = mountMenu();
    await statusItems(wrapper)[0].trigger('click');
    expect(useAlert).toHaveBeenCalledWith(
      'PROFILE_SETTINGS.FORM.AVAILABILITY.SET_AVAILABILITY_ERROR'
    );
  });

  it('reads and toggles auto-offline', async () => {
    const wrapper = mountMenu();
    const toggle = wrapper.findComponent(ToggleSwitch);
    expect(toggle.props('modelValue')).toBe(true);
    expect(wrapper.text()).toContain('SIDEBAR.SET_AUTO_OFFLINE.TEXT');
    await toggle.vm.$emit('update:modelValue', false);
    expect(dispatch).toHaveBeenCalledWith('updateAutoOffline', {
      accountId: 3,
      autoOffline: false,
    });
  });
});
