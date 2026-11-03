/**
 * OneTeam behaviour spec for the contacts "load more" button.
 *
 * Covers the loading state and emitting loadMore.
 */
import { mount } from '@vue/test-utils';
import ContactsLoadMore from '../ContactsLoadMore.vue';

vi.mock('vue-i18n', async importOriginal => ({
  ...(await importOriginal()),
  useI18n: () => ({ t: key => key }),
}));

const Button = {
  name: 'NextButton',
  props: { label: String, isLoading: Boolean },
  emits: ['click'],
  template: '<button @click="$emit(\'click\')" />',
};

describe('ContactsLoadMore behaviour', () => {
  it('loads more contacts', async () => {
    const wrapper = mount(ContactsLoadMore, {
      props: { isLoading: true },
      global: { stubs: { Button } },
    });
    expect(wrapper.getComponent(Button).props()).toEqual({
      label: 'CONTACTS_LAYOUT.LOAD_MORE',
      isLoading: true,
    });
    await wrapper.get('button').trigger('click');
    expect(wrapper.emitted('loadMore')).toHaveLength(1);
  });
});
