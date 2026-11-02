/**
 * OneTeam behaviour spec for the code snippet block.
 *
 * Covers removing blank lines and shared indentation, highlighting in
 * the chosen language, copying the cleaned code with a success alert,
 * the optional CodePen button and its payload (with "js" for
 * JavaScript), and hiding the code when there is none.
 */
import { flushPromises, mount } from '@vue/test-utils';
import { useAlert } from 'dashboard/composables';
import { copyTextToClipboard } from 'shared/helpers/clipboard';
import Code from '../Code.vue';

vi.mock('dashboard/composables', () => ({ useAlert: vi.fn() }));
vi.mock('shared/helpers/clipboard', () => ({ copyTextToClipboard: vi.fn() }));

const NextButton = {
  name: 'NextButton',
  props: { label: String, type: String },
  emits: ['click'],
  template:
    '<button :type="type" @click="$emit(\'click\', $event)">{{ label }}</button>',
};
const Highlightjs = {
  name: 'Highlightjs',
  props: ['language', 'code'],
  template: '<pre>{{ code }}</pre>',
};

const script = `

    <script>
      window.go();
    </script>

`;

const mountCode = props =>
  mount(Code, {
    props,
    global: { stubs: { NextButton, Highlightjs } },
  });

describe('Code behaviour', () => {
  it('cleans and highlights the code and copies it', async () => {
    copyTextToClipboard.mockResolvedValue();
    const wrapper = mountCode({ script, lang: 'html' });
    const cleaned = '<script>\n  window.go();\n</script>\n';
    expect(wrapper.findComponent(Highlightjs).props()).toEqual({
      language: 'html',
      code: cleaned,
    });
    expect(wrapper.find('form').exists()).toBe(false);

    await wrapper.find('button').trigger('click');
    await flushPromises();
    expect(copyTextToClipboard).toHaveBeenCalledWith(cleaned);
    expect(useAlert).toHaveBeenCalledWith('COMPONENTS.CODE.COPY_SUCCESSFUL');
  });

  it('offers CodePen with the code under its language key', () => {
    const js = mountCode({ script: 'a();', enableCodePen: true });
    expect(js.find('form').attributes('action')).toBe(
      'https://codepen.io/pen/define'
    );
    expect(JSON.parse(js.find('input[name="data"]').element.value)).toEqual({
      title: 'Chatwoot Codepen',
      private: true,
      js: 'a();',
    });

    const css = mountCode({
      script: 'a {}',
      lang: 'css',
      enableCodePen: true,
      codepenTitle: 'Styles',
    });
    expect(JSON.parse(css.find('input[name="data"]').element.value)).toEqual({
      title: 'Styles',
      private: true,
      css: 'a {}',
    });
  });

  it('shows no code block without a script', () => {
    const wrapper = mountCode();
    expect(wrapper.findComponent(Highlightjs).exists()).toBe(false);
    expect(wrapper.vm.scrubbedScript).toBe('');
  });
});
