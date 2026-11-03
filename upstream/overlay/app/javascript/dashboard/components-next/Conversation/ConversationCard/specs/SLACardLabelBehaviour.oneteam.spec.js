/**
 * OneTeam behaviour spec for the SLA label on a conversation card.
 *
 * Covers the status and threshold text, the missed style and fallback
 * text, and the exposed flag that tells the card to show an SLA row.
 */
import { computed } from 'vue';
import { mount } from '@vue/test-utils';
import SLACardLabel from '../SLACardLabel.vue';

const env = vi.hoisted(() => ({ status: null, inputs: null }));

vi.mock('vue-i18n', async importOriginal => ({
  ...(await importOriginal()),
  useI18n: () => ({ t: key => key }),
}));
vi.mock('dashboard/composables/useSlaStatus', () => ({
  useSlaStatus: inputs => {
    env.inputs = inputs;
    return { slaStatus: computed(() => env.status) };
  },
}));

/**
 * Mounts the label for a conversation.
 *
 * @param {object} conversation Conversation with SLA data.
 * @returns {import('@vue/test-utils').VueWrapper} The mounted wrapper.
 */
const mountLabel = conversation =>
  mount(SLACardLabel, { props: { conversation } });

describe('SLACardLabel behaviour', () => {
  it('shows an active threshold', () => {
    env.status = { type: 'frt', threshold: '2h', isSlaMissed: false };
    const wrapper = mountLabel({ appliedSla: { id: 3 }, slaEvents: [] });
    expect(wrapper.get('span').text()).toBe('FRT: 2h');
    expect(wrapper.get('span').classes()).toContain('text-n-slate-11');
    expect(wrapper.vm.hasSlaThreshold).toBe(3);
    expect(env.inputs.slaEvents.value).toEqual([]);
    expect(env.inputs.chat.value.appliedSla).toEqual({ id: 3 });
  });

  it('shows a missed SLA and no threshold without an applied SLA', () => {
    env.status = { type: 'nrt', isSlaMissed: true };
    const wrapper = mountLabel({});
    expect(wrapper.get('span').text()).toBe(
      'NRT: CONVERSATION.HEADER.SLA_STATUS.MISSED'
    );
    expect(wrapper.get('span').classes()).toContain('text-n-ruby-11');
    expect(wrapper.vm.hasSlaThreshold).toBeUndefined();
  });

  it('reports no threshold without a status', () => {
    env.status = null;
    expect(mountLabel({ appliedSla: { id: 1 } }).vm.hasSlaThreshold).toBe(
      undefined
    );
  });
});
