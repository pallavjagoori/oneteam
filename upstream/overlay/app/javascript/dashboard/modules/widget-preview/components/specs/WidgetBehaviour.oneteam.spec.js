/**
 * OneTeam behaviour spec for the website widget builder preview.
 *
 * Covers the preview with its branding, switching to the chat screen,
 * the reply time text, hiding and showing the widget from the bubble
 * (which returns to the default screen), the bubble's position and the
 * expanded bubble's launcher title, and the script tab with the bubble
 * options inserted into the embed script.
 */
import { mount } from '@vue/test-utils';
import { ref } from 'vue';
import Widget from '../Widget.vue';

vi.mock('@vueuse/core', async importOriginal => {
  const { ref: appRef } = await import('vue');
  return {
    ...(await importOriginal()),
    useToggle: initial => {
      const state = appRef(initial);
      return [
        state,
        () => {
          state.value = !state.value;
        },
      ];
    },
  };
});
vi.mock('shared/composables/useBranding', () => ({
  useBranding: () => ({ replaceInstallationName: text => `[${text}]` }),
}));
vi.mock('dashboard/composables/store', () => ({
  useMapGetter: () => ref({ logoThumbnail: '/logo.png' }),
}));

const TabBar = {
  name: 'TabBar',
  props: ['tabs'],
  emits: ['tabChanged'],
  template: '<nav />',
};
const Switch = {
  name: 'Switch',
  props: ['modelValue'],
  emits: ['update:modelValue'],
  template: '<input type="checkbox" />',
};
const configStub = name => ({
  name,
  props: ['config'],
  template: `<div class="${name}" />`,
});
const Code = {
  name: 'Code',
  props: ['script', 'codepenTitle'],
  template: '<pre />',
};

const mountWidget = props =>
  mount(Widget, {
    props: { websiteName: 'Acme', color: '#123456', ...props },
    global: {
      stubs: {
        TabBar,
        Switch,
        Code,
        WidgetHead: configStub('WidgetHead'),
        WidgetBody: configStub('WidgetBody'),
        WidgetFooter: configStub('WidgetFooter'),
      },
    },
  });

const config = wrapper =>
  wrapper.findComponent({ name: 'WidgetHead' }).props('config');
const bubble = wrapper => wrapper.find('button.rounded-full');

describe('Widget builder preview behaviour', () => {
  it('previews the widget with branding and reply time', async () => {
    const wrapper = mountWidget({ replyTime: 'in_a_day', isOnline: false });
    expect(config(wrapper)).toMatchObject({
      websiteName: 'Acme',
      isDefaultScreen: true,
      isOnline: false,
      replyTime: 'INBOX_MGMT.WIDGET_BUILDER.REPLY_TIME.IN_A_DAY',
    });
    expect(wrapper.find('img').attributes('src')).toBe('/logo.png');
    expect(wrapper.text()).toContain(
      '[INBOX_MGMT.WIDGET_BUILDER.BRANDING_TEXT]'
    );
    expect(wrapper.find('.WidgetBody').exists()).toBe(false);

    await wrapper.findComponent(Switch).vm.$emit('update:modelValue', true);
    expect(config(wrapper).isDefaultScreen).toBe(false);
    expect(wrapper.find('.WidgetBody').exists()).toBe(true);

    expect(
      config(mountWidget({ replyTime: 'in_a_few_minutes' })).replyTime
    ).toBe('INBOX_MGMT.WIDGET_BUILDER.REPLY_TIME.IN_A_FEW_MINUTES');
    expect(config(mountWidget()).replyTime).toBe(
      'INBOX_MGMT.WIDGET_BUILDER.REPLY_TIME.IN_A_FEW_HOURS'
    );
  });

  it('hides and shows the widget from the bubble', async () => {
    const wrapper = mountWidget({ widgetBubblePosition: 'left' });
    expect(wrapper.find('[style*="justify-content: start"]').exists()).toBe(
      true
    );
    await wrapper.findComponent(Switch).vm.$emit('update:modelValue', true);

    await bubble(wrapper).trigger('click');
    expect(wrapper.find('.widget-wrapper').exists()).toBe(false);
    expect(bubble(wrapper).find('img').exists()).toBe(true);
    // A standard bubble shows no launcher title.
    expect(bubble(wrapper).classes()).toContain('w-16');

    await bubble(wrapper).trigger('click');
    expect(wrapper.find('.widget-wrapper').exists()).toBe(true);
    expect(config(wrapper).isDefaultScreen).toBe(true);
    expect(mountWidget().find('[style*="justify-content: end"]').exists()).toBe(
      true
    );
  });

  it('shows the launcher title on a hidden expanded bubble', async () => {
    const wrapper = mountWidget({
      widgetBubbleType: 'expanded_bubble',
      widgetBubbleLauncherTitle: 'Chat with us',
    });
    expect(wrapper.vm.getWidgetBubbleLauncherTitle).toBe(' ');
    await bubble(wrapper).trigger('click');
    expect(bubble(wrapper).classes()).toContain('h-12');
    expect(bubble(wrapper).text()).toBe('Chat with us');

    const standard = mountWidget({
      widgetBubbleType: 'standard',
      widgetBubbleLauncherTitle: 'Chat with us',
    });
    await bubble(standard).trigger('click');
    expect(standard.vm.getWidgetBubbleLauncherTitle).toBe(' ');
  });

  it('shows the embed script with the bubble options', async () => {
    const wrapper = mountWidget({
      webWidgetScript: '<script>\n  (function(){})()\n</script>',
      widgetBubblePosition: 'right',
      widgetBubbleType: 'standard',
      widgetBubbleLauncherTitle: 'Hi',
    });
    const [, scriptTab] = wrapper.findComponent(TabBar).props('tabs');
    await wrapper.findComponent(TabBar).vm.$emit('tabChanged', scriptTab);
    expect(wrapper.findComponent(Switch).exists()).toBe(false);
    const code = wrapper.findComponent(Code);
    expect(code.props('codepenTitle')).toBe('Acme - Chatwoot Widget Test');
    expect(code.props('script')).toBe(
      '<script>\n  (fINBOX_MGMT.WIDGET_BUILDER.SCRIPT_SETTINGSunction(){})()\n</script>'
    );

    const empty = mountWidget();
    await empty.findComponent(TabBar).vm.$emit('tabChanged', scriptTab);
    expect(empty.findComponent(Code).props('script')).toBe('');
  });
});
