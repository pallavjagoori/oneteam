/**
 * OneTeam behaviour spec for the SLA label on conversation cards.
 *
 * Covers showing the countdown threshold in amber, the missed labels for
 * first response, next response and resolution in ruby, and hiding the
 * label when no SLA applies.
 */
import { mount } from '@vue/test-utils';
import { ref } from 'vue';
import SLACardLabel from '../SLACardLabel.vue';

const env = vi.hoisted(() => ({ status: null, args: null }));

vi.mock('dashboard/composables/useSlaStatus', () => ({
  useSlaStatus: args => {
    env.args = args;
    return { slaStatus: env.status };
  },
}));
vi.mock('vue-i18n', async importOriginal => ({
  ...(await importOriginal()),
  useI18n: () => ({
    t: (key, params) => (params ? `${key}:${params.status}` : key),
  }),
}));

const Label = {
  name: 'Label',
  props: ['label', 'color'],
  template: '<span class="label"><slot name="icon" /></span>',
};

/**
 * Mounts the label for an SLA status.
 *
 * @param {object} status Value of the slaStatus ref.
 * @param {object} chat Conversation.
 * @returns {import('@vue/test-utils').VueWrapper} The mounted wrapper.
 */
const mountLabel = (status, chat = {}) => {
  env.status = ref(status);
  return mount(SLACardLabel, {
    props: { chat },
    global: { stubs: { Label, Icon: true } },
  });
};

describe('SLACardLabel behaviour', () => {
  it('shows the countdown threshold in amber', () => {
    const wrapper = mountLabel(
      { type: 'FRT', threshold: '5m', isSlaMissed: false },
      { applied_sla: { id: 1 }, sla_events: [{ id: 2 }] }
    );
    expect(wrapper.getComponent(Label).props()).toEqual({
      label: '5m',
      color: 'amber',
    });
    expect(env.args.appliedSla.value).toEqual({ id: 1 });
    expect(env.args.slaEvents.value).toEqual([{ id: 2 }]);
    expect(wrapper.vm.hasSlaThreshold).toBe('FRT');
  });

  it.each(['FRT', 'NRT', 'RT'])('labels a missed %s in ruby', type => {
    const wrapper = mountLabel({ type, threshold: null, isSlaMissed: true });
    expect(wrapper.getComponent(Label).props()).toEqual({
      label: `CONVERSATION.HEADER.SLA_STATUS.${type}:CONVERSATION.HEADER.SLA_STATUS.MISSED`,
      color: 'ruby',
    });
  });

  it('hides the label without an SLA', () => {
    expect(
      mountLabel({ type: null, threshold: null }).findComponent(Label).exists()
    ).toBe(false);
  });
});
