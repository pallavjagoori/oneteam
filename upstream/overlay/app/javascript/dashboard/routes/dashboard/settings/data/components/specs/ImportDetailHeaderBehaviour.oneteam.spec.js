/**
 * OneTeam behaviour spec for the data import ImportDetailHeader.
 *
 * Covers the unnamed fallback, stage labels, the live and refreshing
 * notes, and the refresh, retry and abandon buttons.
 */
import { mount } from '@vue/test-utils';
import ImportDetailHeader from '../ImportDetailHeader.vue';

const env = vi.hoisted(() => ({ stage: null }));

vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: key => key }) }));
vi.mock('../../importStatus', async importOriginal => {
  const original = await importOriginal();
  return {
    ...original,
    importStageKey: dataImport =>
      env.stage ?? original.importStageKey(dataImport),
  };
});

const ACTIVE = {
  name: 'Intercom',
  status: 'processing',
  data_type: 'intercom',
  source_provider: 'intercom',
  stalled: true,
};

/**
 * Mounts the header.
 *
 * @param {object} props component props
 * @returns {import('@vue/test-utils').VueWrapper}
 */
const mountHeader = props =>
  mount(ImportDetailHeader, {
    props,
    global: {
      mocks: { $t: key => key },
      stubs: {
        BaseSettingsHeader: {
          template:
            '<header><slot name="title" /><p class="desc"><slot name="description" /></p></header>',
        },
        Button: {
          props: ['icon', 'label'],
          emits: ['click'],
          template:
            '<button :class="icon" @click="$emit(\'click\')">{{ label }}</button>',
        },
      },
    },
  });

describe('ImportDetailHeader behaviour', () => {
  beforeEach(() => {
    env.stage = null;
  });

  it('shows the unnamed fallback without an import', () => {
    const wrapper = mountHeader({});
    expect(wrapper.find('h1').text()).toBe('DATA_IMPORTS.TABLE.UNNAMED');
    expect(wrapper.find('.desc').text()).toBe(
      'DATA_IMPORTS.MONITOR.STAGES.unknown'
    );
    expect(wrapper.find('button').exists()).toBe(false);
  });

  it('falls back to the unknown label for an unmapped stage', () => {
    env.stage = 'mystery';
    const wrapper = mountHeader({ dataImport: { name: 'X', status: 'x' } });
    expect(wrapper.find('.desc').text()).toBe(
      'DATA_IMPORTS.MONITOR.STAGES.unknown'
    );
  });

  it('offers refresh, retry and abandon for a live import', async () => {
    const wrapper = mountHeader({ dataImport: ACTIVE });
    expect(wrapper.find('h1').text()).toBe('Intercom');
    expect(wrapper.find('.desc').text()).toContain('DATA_IMPORTS.MONITOR.LIVE');
    expect(wrapper.find('.animate-pulse').exists()).toBe(true);
    await wrapper.find('.i-lucide-refresh-cw').trigger('click');
    await wrapper.find('.i-lucide-rotate-ccw').trigger('click');
    await wrapper.findAll('button')[2].trigger('click');
    expect(wrapper.emitted('refresh')).toHaveLength(1);
    expect(wrapper.emitted('retry')).toHaveLength(1);
    expect(wrapper.emitted('abandon')).toHaveLength(1);
  });

  it('shows the refreshing note while polling', () => {
    const wrapper = mountHeader({ dataImport: ACTIVE, isPolling: true });
    expect(wrapper.find('.desc').text()).toContain(
      'DATA_IMPORTS.MONITOR.REFRESHING'
    );
  });
});
