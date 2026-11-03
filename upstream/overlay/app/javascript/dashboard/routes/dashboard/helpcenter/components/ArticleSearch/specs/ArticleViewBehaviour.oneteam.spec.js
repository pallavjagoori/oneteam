/**
 * OneTeam behaviour spec for the article search preview.
 *
 * Covers loading the article in an iframe with the account direction,
 * and going back or inserting without the click reaching the parent.
 */
import { computed } from 'vue';
import { mount } from '@vue/test-utils';
import ArticleView from '../ArticleView.vue';

vi.mock('dashboard/composables/store', () => ({
  useMapGetter: () => computed(() => true),
}));

const IframeLoader = {
  name: 'IframeLoader',
  props: { url: String, isRtl: Boolean },
  template: '<iframe />',
};
const Button = {
  name: 'NextButton',
  props: ['label'],
  emits: ['click'],
  template: '<button @click="$emit(\'click\', $event)">{{ label }}</button>',
};

describe('ArticleView behaviour', () => {
  it('previews the article and handles back and insert', async () => {
    const parentClick = vi.fn();
    const wrapper = mount(
      {
        components: { ArticleView },
        methods: { parentClick },
        template:
          '<div @click="parentClick"><ArticleView url="https://help.test/a" /></div>',
      },
      {
        global: {
          stubs: { IframeLoader, Button },
          mocks: { $t: key => key },
        },
      }
    );
    expect(wrapper.getComponent(IframeLoader).props()).toMatchObject({
      url: 'https://help.test/a',
      isRtl: true,
    });
    const view = wrapper.getComponent(ArticleView);
    const [topBack, back, insert] = wrapper.findAll('button');
    await topBack.trigger('click');
    await back.trigger('click');
    await insert.trigger('click');
    expect(view.emitted('back')).toHaveLength(2);
    expect(view.emitted('insert')).toHaveLength(1);
    expect(parentClick).not.toHaveBeenCalled();
  });
});
