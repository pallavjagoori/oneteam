/**
 * OneTeam behaviour spec for the SLA report SLAViewDetails toggle.
 *
 * Covers opening and closing the missed events card from the button
 * and closing it on click away.
 */
import { mount } from '@vue/test-utils';
import SLAViewDetails from '../SLAViewDetails.vue';

const clickaway = vi.hoisted(() => ({ handler: null }));

const CardStub = {
  name: 'SLAPopoverCard',
  props: ['slaMissedEvents'],
  template: '<div class="card" />',
};

describe('SLAViewDetails behaviour', () => {
  it('passes no events by default', async () => {
    const wrapper = mount(SLAViewDetails, {
      global: {
        mocks: { $t: key => key },
        directives: { onClickaway: {} },
        stubs: {
          SLAPopoverCard: CardStub,
          NextButton: {
            emits: ['click'],
            template: '<button @click="$emit(\'click\')" />',
          },
        },
      },
    });
    await wrapper.find('button').trigger('click');
    expect(wrapper.findComponent(CardStub).props('slaMissedEvents')).toEqual(
      []
    );
  });

  it('toggles the card and closes on click away', async () => {
    const events = [{ id: 1 }];
    const wrapper = mount(SLAViewDetails, {
      props: { slaEvents: events },
      global: {
        mocks: { $t: key => key },
        directives: {
          onClickaway: {
            mounted: (el, binding) => {
              clickaway.handler = binding.value;
            },
          },
        },
        stubs: {
          SLAPopoverCard: CardStub,
          NextButton: {
            emits: ['click'],
            template: '<button @click="$emit(\'click\')" />',
          },
        },
      },
    });
    await wrapper.find('button').trigger('click');
    expect(wrapper.findComponent(CardStub).props('slaMissedEvents')).toEqual(
      events
    );
    await wrapper.find('button').trigger('click');
    expect(wrapper.find('.card').exists()).toBe(false);
    await wrapper.find('button').trigger('click');
    clickaway.handler();
    await wrapper.vm.$nextTick();
    expect(wrapper.find('.card').exists()).toBe(false);
  });
});
