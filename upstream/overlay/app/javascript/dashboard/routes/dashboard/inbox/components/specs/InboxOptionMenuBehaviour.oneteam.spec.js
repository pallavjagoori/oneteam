/**
 * OneTeam behaviour spec for the inbox InboxOptionMenu.
 *
 * Covers the three bulk options and emitting the chosen key.
 */
import { mount } from '@vue/test-utils';
import InboxOptionMenu from '../InboxOptionMenu.vue';

describe('InboxOptionMenu behaviour', () => {
  it('lists the bulk options and emits the clicked one', async () => {
    const wrapper = mount(InboxOptionMenu, {
      global: {
        mocks: { $t: key => key },
        stubs: {
          MenuItem: {
            props: ['label'],
            emits: ['click'],
            template:
              '<button @click="$emit(\'click\', $event)">{{ label }}</button>',
          },
        },
      },
    });
    const buttons = wrapper.findAll('button');
    expect(buttons.map(button => button.text())).toEqual([
      'INBOX.MENU_ITEM.MARK_ALL_READ',
      'INBOX.MENU_ITEM.DELETE_ALL',
      'INBOX.MENU_ITEM.DELETE_ALL_READ',
    ]);
    await buttons[2].trigger('click');
    expect(wrapper.emitted('optionClick')).toEqual([['delete_all_read']]);
  });
});
