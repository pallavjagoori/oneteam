/**
 * OneTeam behaviour spec for the website channel creation page.
 *
 * Covers the loading state, creating the channel with trimmed name and
 * greeting, routing to the agents step, and API error alerts.
 */
import { mount, flushPromises } from '@vue/test-utils';
import { createStore } from 'vuex';
import Website from '../Website.vue';
import router from 'dashboard/routes/index';
import { useAlert } from 'dashboard/composables';

vi.mock('dashboard/composables', () => ({ useAlert: vi.fn() }));
vi.mock('dashboard/routes/index', () => ({ default: { replace: vi.fn() } }));

/**
 * Mounts the page with a store.
 *
 * @param {object} options store options
 * @returns {import('@vue/test-utils').VueWrapper}
 */
const mountPage = ({ isCreating = false, create = vi.fn() } = {}) => {
  const store = createStore({
    getters: { 'inboxes/getUIFlags': () => ({ isCreating }) },
    actions: { 'inboxes/createWebsiteChannel': create },
  });
  return mount(Website, {
    global: {
      plugins: [store],
      mocks: { $t: key => key },
      stubs: {
        PageHeader: true,
        WootLoadingState: { template: '<div class="loading" />' },
        WootColorPicker: true,
        Editor: true,
        GreetingsEditor: {
          name: 'GreetingsEditor',
          props: ['richtext'],
          template: '<div class="greeting" />',
        },
        NextButton: { template: '<button type="submit" />' },
      },
    },
  });
};

describe('Website channel behaviour', () => {
  it('shows the loading state while creating', () => {
    const wrapper = mountPage({ isCreating: true });
    expect(wrapper.find('.loading').exists()).toBe(true);
    expect(wrapper.find('form').exists()).toBe(false);
  });

  it('creates the channel and opens the agents step', async () => {
    const create = vi.fn(() => ({ id: 42 }));
    const wrapper = mountPage({ create });
    const inputs = wrapper.findAll('input');
    await inputs[0].setValue('  Site  ');
    await inputs[1].setValue('https://x.co');
    await wrapper.find('select').setValue(true);
    expect(
      wrapper.findComponent({ name: 'GreetingsEditor' }).props('richtext')
    ).toBe(true);
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    expect(create.mock.calls[0][1]).toMatchObject({
      name: 'Site',
      greeting_enabled: true,
      channel: { type: 'web_widget', website_url: 'https://x.co' },
    });
    expect(router.replace).toHaveBeenCalledWith({
      name: 'settings_inboxes_add_agents',
      params: { page: 'new', inbox_id: 42 },
    });
  });

  it.each([
    [new Error('Taken'), 'Taken'],
    [new Error(''), 'INBOX_MGMT.ADD.WEBSITE_CHANNEL.API.ERROR_MESSAGE'],
  ])('alerts on failure', async (error, message) => {
    const wrapper = mountPage({
      create: () => {
        throw error;
      },
    });
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    expect(useAlert).toHaveBeenCalledWith(message);
  });

  it('reports text area greetings for Twilio channels', () => {
    const wrapper = mountPage();
    wrapper.vm.isATwilioChannel = true;
    expect(wrapper.vm.textAreaChannels).toBe(true);
  });
});
