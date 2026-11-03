/**
 * OneTeam behaviour spec for the shared Spinner colour schemes and the
 * ChatOption button.
 */
import { mount } from '@vue/test-utils';
import { createStore } from 'vuex';
import Spinner from '../Spinner.vue';
import ChatOption from '../ChatOption.vue';

describe('Spinner', () => {
  it.each([
    ['primary', 'before:!border-t-n-brand'],
    ['warning', 'before:!border-t-n-amber-6'],
    ['success', 'before:!border-t-n-teal-9'],
    ['custom-class', 'custom-class'],
  ])('maps the %s scheme', (colorScheme, expected) => {
    const wrapper = mount(Spinner, { props: { colorScheme, size: 'large' } });
    expect(wrapper.classes()).toEqual(
      expect.arrayContaining(['spinner', 'large', expected])
    );
  });
});

describe('ChatOption', () => {
  it('emits the action when picked', async () => {
    const store = createStore({
      modules: {
        appConfig: {
          namespaced: true,
          getters: { getWidgetColor: () => '#ff0000' },
        },
      },
    });
    const action = { id: 1, title: 'Yes' };
    const wrapper = mount(ChatOption, {
      props: { action, isSelected: true },
      global: { plugins: [store] },
    });
    expect(wrapper.classes()).toContain('is-selected');
    expect(wrapper.find('span').text()).toBe('Yes');
    await wrapper.find('button').trigger('click');
    expect(wrapper.emitted('optionSelect')).toEqual([[action]]);
  });
});
