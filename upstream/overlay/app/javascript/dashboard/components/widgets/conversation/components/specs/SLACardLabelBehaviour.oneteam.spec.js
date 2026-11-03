/**
 * OneTeam behaviour spec for the conversation SLACardLabel.
 *
 * Covers hiding without a threshold, due and missed styles, the full
 * status text on wide extended cards, the threshold value and the
 * popover card for missed events.
 */
import { ref } from 'vue';
import { mount } from '@vue/test-utils';
import SLACardLabel from '../SLACardLabel.vue';

const status = ref(null);

vi.mock('dashboard/composables/useSlaStatus', () => ({
  useSlaStatus: () => ({ slaStatus: status }),
}));

vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key, params) => (params ? `${key}:${params.status}` : key),
  }),
}));

const PopoverStub = {
  name: 'SLAPopoverCard',
  props: { slaMissedEvents: Array },
  template: '<div class="popover" />',
};

/**
 * Mounts the SLA label.
 *
 * @param {object} props component props
 * @returns {import('@vue/test-utils').VueWrapper}
 */
const mountLabel = props =>
  mount(SLACardLabel, {
    props,
    global: {
      stubs: {
        SLAPopoverCard: PopoverStub,
        FluentIcon: {
          props: { iconLib: String },
          template: '<i :data-lib="iconLib" />',
        },
      },
    },
  });

describe('SLACardLabel behaviour', () => {
  it('renders nothing without an SLA type', () => {
    status.value = null;
    expect(mountLabel({}).html()).toBe('<!--v-if-->');
  });

  it('shows the due threshold on a compact card', () => {
    status.value = { type: 'frt', threshold: '2h', icon: 'alarm' };
    const wrapper = mountLabel({});
    expect(wrapper.text()).toBe('2h');
    expect(wrapper.classes()).toContain('border-n-strong');
    expect(wrapper.find('[data-lib]').attributes('data-lib')).toBe('fluent');
    expect(wrapper.find('span').classes()).toContain('text-n-amber-11');
  });

  it('shows the status text when there is no threshold', () => {
    status.value = { type: 'nrt', isSlaMissed: true, icon: 'flame' };
    const wrapper = mountLabel({});
    expect(wrapper.text()).toBe(
      'CONVERSATION.HEADER.SLA_STATUS.NRT:CONVERSATION.HEADER.SLA_STATUS.MISSED'
    );
    expect(wrapper.find('[data-lib]').attributes('data-lib')).toBe('lucide');
  });

  it('shows the full status and popover on a wide extended card', () => {
    status.value = { type: 'rt', isSlaMissed: true, icon: 'flame' };
    const events = [{ id: 1 }];
    const wrapper = mountLabel({
      showExtendedInfo: true,
      chat: { applied_sla: {}, sla_events: events },
    });
    expect(wrapper.classes()).toContain('bg-n-alpha-1');
    expect(wrapper.text()).toBe(
      'CONVERSATION.HEADER.SLA_STATUS.RT:CONVERSATION.HEADER.SLA_STATUS.MISSED'
    );
    expect(wrapper.findComponent(PopoverStub).props('slaMissedEvents')).toEqual(
      events
    );
  });

  it('falls back to the short value on a narrow extended card', () => {
    status.value = { type: 'frt', icon: 'alarm' };
    const wrapper = mountLabel({ showExtendedInfo: true, parentWidth: 500 });
    expect(wrapper.text()).toBe(
      'CONVERSATION.HEADER.SLA_STATUS.FRT:CONVERSATION.HEADER.SLA_STATUS.DUE'
    );
    expect(wrapper.findComponent(PopoverStub).exists()).toBe(false);
  });

  it('handles an unknown type and a missing chat', () => {
    status.value = { type: 'xyz', icon: 'alarm' };
    const wrapper = mountLabel({ chat: null });
    expect(wrapper.text()).toBe('');
  });
});
