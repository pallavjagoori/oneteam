/**
 * OneTeam behaviour spec for the Captain model picker.
 *
 * Covers the placeholder and selected model label, opening and closing
 * the menu (button, outside click), provider icons, the preferred
 * badge, coming-soon models, credit labels on Chatwoot Cloud, and
 * selecting a model.
 */
import { ref } from 'vue';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { useCaptainConfigStore } from 'dashboard/store/captain/preferences';
import { useDropdownContext } from 'dashboard/components-next/dropdown-menu/base/provider.js';
import ModelDropdown from '../ModelDropdown.vue';

const isOnChatwootCloud = ref(false);
let clickaway;

vi.mock('dashboard/composables/useAccount', () => ({
  useAccount: () => ({ isOnChatwootCloud }),
}));

const DropdownBody = {
  name: 'DropdownBody',
  setup: () => ({ context: useDropdownContext() }),
  template: '<ul><li class="toggle" @click="context.toggle()" /><slot /></ul>',
};
const DropdownItem = {
  name: 'DropdownItem',
  props: ['click'],
  template: '<li class="item" @click="click()"><slot /></li>',
};
const Icon = {
  name: 'Icon',
  props: ['icon'],
  template: '<i class="icon" :data-icon="icon" />',
};

const mountPicker = () =>
  mount(ModelDropdown, {
    props: { featureKey: 'editor' },
    global: {
      stubs: { DropdownBody, DropdownItem, Icon },
      directives: {
        onClickaway: {
          mounted: (el, binding) => {
            clickaway = binding.value;
          },
        },
      },
    },
  });

const items = wrapper => wrapper.findAll('.item');

describe('ModelDropdown behaviour', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    isOnChatwootCloud.value = false;
    useCaptainConfigStore().features = {
      editor: {
        default: 'gpt',
        models: [
          {
            id: 'gpt',
            display_name: 'GPT',
            provider: 'openai',
            credit_multiplier: 2,
          },
          { id: 'claude', display_name: 'Claude', provider: 'anthropic' },
          {
            id: 'soon',
            display_name: 'Soon',
            provider: 'mistral',
            coming_soon: true,
          },
        ],
      },
    };
  });

  it('shows the preferred model and lists the options', async () => {
    const wrapper = mountPicker();
    expect(wrapper.find('button').text()).toBe('GPT');
    expect(wrapper.find('.dropdown').exists()).toBe(false);

    await wrapper.find('button').trigger('click');
    expect(
      wrapper.find('[data-icon="i-lucide-chevron-down"]').classes()
    ).toContain('rotate-180');
    const [gpt, claude, soon] = items(wrapper);
    expect(gpt.find('[data-icon="i-ri-openai-fill"]').exists()).toBe(true);
    expect(gpt.text()).toContain('GENERAL.PREFERRED');
    expect(gpt.classes()).toContain('bg-n-alpha-1');
    expect(claude.find('[data-icon="i-ri-anthropic-line"]').exists()).toBe(
      true
    );
    expect(claude.text()).not.toContain('GENERAL.PREFERRED');
    expect(claude.text()).not.toContain('CREDITS_PER_MESSAGE');
    expect(soon.classes()).toContain('pointer-events-none');
    expect(soon.text()).toContain('CAPTAIN_SETTINGS.MODEL_CONFIG.COMING_SOON');

    await wrapper.find('button').trigger('click');
    expect(items(wrapper)).toHaveLength(0);
  });

  it('shows credit labels on Chatwoot Cloud', async () => {
    isOnChatwootCloud.value = true;
    const wrapper = mountPicker();
    await wrapper.find('button').trigger('click');
    expect(items(wrapper)[0].text()).toContain(
      'CAPTAIN_SETTINGS.MODEL_CONFIG.CREDITS_PER_MESSAGE'
    );
    expect(items(wrapper)[1].text()).toContain(
      'CAPTAIN_SETTINGS.MODEL_CONFIG.CREDITS_PER_MESSAGE'
    );
  });

  it('selects a model and closes', async () => {
    const wrapper = mountPicker();
    await wrapper.find('button').trigger('click');
    await items(wrapper)[1].trigger('click');
    expect(wrapper.emitted('change')[0]).toEqual([
      { feature: 'editor', model: 'claude' },
    ]);
    expect(items(wrapper)).toHaveLength(0);
    expect(wrapper.find('button').text()).toBe('Claude');

    await wrapper.find('button').trigger('click');
    await wrapper.find('.toggle').trigger('click');
    expect(items(wrapper)).toHaveLength(0);
    await wrapper.find('button').trigger('click');
    clickaway();
    await wrapper.vm.$nextTick();
    expect(items(wrapper)).toHaveLength(0);
  });

  it('shows the placeholder without a selection or a known model', async () => {
    useCaptainConfigStore().features = {};
    let wrapper = mountPicker();
    expect(wrapper.find('button').text()).toBe(
      'CAPTAIN_SETTINGS.MODEL_CONFIG.SELECT_MODEL'
    );
    useCaptainConfigStore().features = {
      editor: { selected: 'gone', models: [] },
    };
    wrapper = mountPicker();
    expect(wrapper.find('button').text()).toBe(
      'CAPTAIN_SETTINGS.MODEL_CONFIG.SELECT_MODEL'
    );
  });
});
