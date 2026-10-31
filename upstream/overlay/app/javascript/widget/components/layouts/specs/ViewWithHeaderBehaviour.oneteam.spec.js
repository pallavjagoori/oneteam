/**
 * OneTeam behaviour spec for the widget's header layout.
 *
 * Covers the expanded home header (app config overriding the channel's
 * welcome text) versus the collapsed header on other views or without
 * intro text, the back button and branding per route, fading the
 * expanded header as the home view scrolls, the animation frame tick,
 * closing the widget with Escape, and cleaning up on unmount.
 */
import { mount } from '@vue/test-utils';
import { IFrameHelper } from 'widget/helpers/utils';
import ViewWithHeader from '../ViewWithHeader.vue';

vi.mock('widget/helpers/utils', () => ({
  IFrameHelper: { sendMessage: vi.fn() },
}));

const Expanded = {
  name: 'ChatHeaderExpanded',
  props: ['introHeading', 'introBody', 'avatarUrl', 'showPopoutButton'],
  template: '<header class="expanded-header" />',
};
const Collapsed = {
  name: 'ChatHeader',
  props: [
    'title',
    'avatarUrl',
    'showPopoutButton',
    'availableAgents',
    'showBackButton',
  ],
  template: '<header class="collapsed-header" />',
};
const Branding = {
  name: 'Branding',
  props: ['disableBranding'],
  template: '<footer class="branding" />',
};

const channel = {
  welcomeTitle: 'Hi',
  welcomeTagline: 'Ask us',
  websiteName: 'Acme',
  avatarUrl: 'logo.png',
  portal: { slug: 'help' },
  enabledFeatures: [],
};

const mountLayout = ({
  route = 'home',
  web = channel,
  appConfig = {},
} = {}) => {
  window.chatwootWebChannel = { ...web };
  return mount(ViewWithHeader, {
    attachTo: document.body,
    global: {
      stubs: {
        ChatHeaderExpanded: Expanded,
        ChatHeader: Collapsed,
        Branding,
        Banner: true,
        RouterView: true,
      },
      mocks: {
        $route: { name: route },
        $store: {
          getters: {
            'appConfig/getAppConfig': appConfig,
            'agent/availableAgents': [{ id: 1 }],
          },
        },
      },
    },
  });
};
const header = wrapper => wrapper.find('.relative > div');
const scrollTo = async (wrapper, top) => {
  wrapper.element.scrollTop = top;
  await wrapper.trigger('scroll');
};

afterEach(() => {
  document.body.innerHTML = '';
});

describe('ViewWithHeader behaviour', () => {
  it('shows the expanded header on home with the channel welcome text', () => {
    const wrapper = mountLayout();
    expect(wrapper.classes()).toContain('overflow-auto');
    expect(header(wrapper).classes()).toContain('expanded');
    expect(wrapper.findComponent(Expanded).props()).toEqual({
      introHeading: 'Hi',
      introBody: 'Ask us',
      avatarUrl: 'logo.png',
      showPopoutButton: undefined,
    });
    expect(wrapper.findComponent(Collapsed).exists()).toBe(false);
    expect(wrapper.findComponent(Branding).props('disableBranding')).toBe(
      false
    );
    expect(wrapper.vm.portal).toEqual({ slug: 'help' });
  });

  it('prefers the app config welcome text', () => {
    const wrapper = mountLayout({
      appConfig: {
        welcomeTitle: 'Hello there',
        welcomeDescription: 'Custom',
        showPopoutButton: true,
      },
      web: { ...channel, welcomeTitle: '', disableBranding: true },
    });
    expect(wrapper.findComponent(Expanded).props()).toMatchObject({
      introHeading: 'Hello there',
      introBody: 'Custom',
      showPopoutButton: true,
    });
    expect(wrapper.findComponent(Branding).props('disableBranding')).toBe(true);
  });

  it('collapses the header on home without intro text', () => {
    const wrapper = mountLayout({
      web: { ...channel, welcomeTitle: '', welcomeTagline: '' },
    });
    expect(header(wrapper).classes()).toContain('collapsed');
    expect(wrapper.findComponent(Collapsed).props()).toMatchObject({
      title: 'Acme',
      availableAgents: [{ id: 1 }],
      showBackButton: false,
    });
  });

  it('collapses with a back button on inner views', () => {
    const wrapper = mountLayout({ route: 'messages' });
    expect(wrapper.classes()).not.toContain('overflow-auto');
    expect(wrapper.findComponent(Collapsed).props('showBackButton')).toBe(true);
    expect(wrapper.findComponent(Branding).exists()).toBe(true);
  });

  it('hides branding on the article viewer', () => {
    const wrapper = mountLayout({ route: 'article-viewer' });
    expect(wrapper.findComponent(Branding).exists()).toBe(false);
  });

  it('fades the expanded header as the home view scrolls', async () => {
    const wrapper = mountLayout();
    const steps = [
      [35, 'opacity-30'],
      [28, 'opacity-40'],
      [22, 'opacity-60'],
      [17, 'opacity-80'],
      [12, 'opacity-90'],
    ];
    await steps.reduce(async (previous, [top, cls]) => {
      await previous;
      await scrollTo(wrapper, top);
      expect(header(wrapper).classes()).toContain(cls);
    }, Promise.resolve());
    await scrollTo(wrapper, 5);
    expect(
      header(wrapper)
        .classes()
        .some(c => c.startsWith('opacity'))
    ).toBe(false);
  });

  it('does not fade a collapsed header', async () => {
    const wrapper = mountLayout({ route: 'messages' });
    await scrollTo(wrapper, 40);
    expect(
      header(wrapper)
        .classes()
        .some(c => c.startsWith('opacity'))
    ).toBe(false);
  });

  it('schedules a frame when not already ticking and cancels it on unmount', async () => {
    const raf = vi
      .spyOn(window, 'requestAnimationFrame')
      .mockImplementation(callback => {
        callback();
        return 7;
      });
    const cancel = vi.spyOn(window, 'cancelAnimationFrame');
    const wrapper = mountLayout();
    wrapper.vm.ticking = false;
    await scrollTo(wrapper, 3);
    expect(raf).toHaveBeenCalledTimes(1);
    expect(wrapper.vm.ticking).toBe(true);
    wrapper.unmount();
    expect(cancel).toHaveBeenCalledWith(7);
    raf.mockRestore();
    cancel.mockRestore();
  });

  it('closes the widget on Escape', async () => {
    const wrapper = mountLayout();
    await wrapper.trigger('keydown', { key: 'Escape' });
    expect(IFrameHelper.sendMessage).toHaveBeenCalledWith({
      event: 'closeWindow',
    });
  });
});
