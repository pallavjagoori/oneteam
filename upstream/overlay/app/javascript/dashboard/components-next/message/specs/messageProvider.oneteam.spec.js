/**
 * OneTeam spec for the message context provider.
 *
 * Covers the error outside a Message parent and the filtered chat
 * attachments list that keeps only gallery media in snake case.
 */
/* eslint-disable vue/one-component-per-file */
import { defineComponent, h } from 'vue';
import { mount } from '@vue/test-utils';
import { provideMessageContext, useMessageContext } from '../provider';

vi.mock('dashboard/composables/store', async () => {
  const { computed } = await import('vue');
  return {
    useMapGetter: () =>
      computed(() => [
        { file_type: 'image', dataUrl: 'a' },
        { file_type: 'file', dataUrl: 'b' },
        { file_type: 'video', dataUrl: 'c' },
        { file_type: 'audio', dataUrl: 'd' },
        { file_type: 'ig_reel', dataUrl: 'e' },
        { file_type: 'location', dataUrl: 'f' },
      ]),
  };
});

describe('message provider', () => {
  it('throws without a parent Message component', () => {
    const Child = defineComponent({
      setup() {
        useMessageContext();
        return () => null;
      },
    });
    expect(() => mount(Child)).toThrow(
      'Component is missing a parent <Message /> component.'
    );
  });

  it('shares the context and filters gallery attachments', () => {
    let context;
    const Child = defineComponent({
      setup() {
        context = useMessageContext();
        return () => null;
      },
    });
    const Parent = defineComponent({
      setup() {
        provideMessageContext({ id: 7 });
        return () => h(Child);
      },
    });
    mount(Parent);
    expect(context.id).toBe(7);
    expect(context.filteredCurrentChatAttachments.value).toEqual([
      { file_type: 'image', data_url: 'a' },
      { file_type: 'video', data_url: 'c' },
      { file_type: 'audio', data_url: 'd' },
      { file_type: 'ig_reel', data_url: 'e' },
    ]);
  });
});
