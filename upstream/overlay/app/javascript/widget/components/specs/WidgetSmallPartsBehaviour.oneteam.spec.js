/**
 * Behaviour specs for small widget parts: the chat header (back button,
 * avatar, online dot), grouped avatars and the video bubble.
 */
import { mount } from '@vue/test-utils';
import ChatHeader from '../ChatHeader.vue';
import GroupedAvatars from '../GroupedAvatars.vue';
import VideoBubble from '../VideoBubble.vue';

const env = vi.hoisted(() => ({ replace: vi.fn(), online: true }));

vi.mock('vue-router', async importOriginal => ({
  ...(await importOriginal()),
  useRouter: () => ({ replace: env.replace }),
}));
vi.mock('widget/composables/useAvailability', async () => {
  const { computed } = await import('vue');
  return { useAvailability: () => ({ isOnline: computed(() => env.online) }) };
});

const mountHeader = props =>
  mount(ChatHeader, {
    props,
    global: {
      stubs: {
        FluentIcon: true,
        HeaderActions: true,
        AvailabilityContainer: true,
      },
      directives: { dompurifyHtml: {} },
    },
  });

describe('ChatHeader', () => {
  it('goes home from the back button and shows the avatar and online dot', async () => {
    const wrapper = mountHeader({
      showBackButton: true,
      avatarUrl: 'https://cdn.example.test/a.png',
    });
    expect(wrapper.find('img').attributes('src')).toBe(
      'https://cdn.example.test/a.png'
    );
    expect(wrapper.find('.bg-n-teal-10').exists()).toBe(true);
    await wrapper.find('button').trigger('click');
    expect(env.replace).toHaveBeenCalledWith({ name: 'home' });
  });

  it('hides the dot when offline', () => {
    env.online = false;
    const wrapper = mountHeader({});
    expect(wrapper.find('.bg-n-teal-10').exists()).toBe(false);
    expect(wrapper.find('img').exists()).toBe(false);
  });
});

describe('GroupedAvatars', () => {
  it('overlaps every avatar after the first, up to the limit', () => {
    const wrapper = mount(GroupedAvatars, {
      props: {
        limit: 2,
        users: [
          { id: 1, name: 'Ann' },
          { id: 2, name: 'Bo' },
          { id: 3, name: 'Cy' },
        ],
      },
      global: { stubs: { Avatar: true } },
    });
    const spans = wrapper.findAll('span.inline-block');
    expect(spans).toHaveLength(2);
    expect(spans[0].classes()).not.toContain('ltr:-ml-4');
    expect(spans[1].classes()).toContain('ltr:-ml-4');
  });
});

describe('VideoBubble', () => {
  it('emits error when the video fails to load', async () => {
    const wrapper = mount(VideoBubble, { props: { url: 'v.mp4' } });
    await wrapper.find('video').trigger('error');
    expect(wrapper.emitted('error')).toHaveLength(1);
  });
});
