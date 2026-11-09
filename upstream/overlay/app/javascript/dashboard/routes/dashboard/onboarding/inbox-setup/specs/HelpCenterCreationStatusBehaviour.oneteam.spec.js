/**
 * OneTeam behaviour spec for the onboarding help center status row.
 *
 * While the help center is generating and no article exists yet, the row
 * steps through the progress phases; once articles arrive it shows their
 * count, and a completed generation shows the summary.
 */
import { flushPromises, mount } from '@vue/test-utils';
import OnboardingAPI from 'dashboard/api/onboarding';
import HelpCenterCreationStatus from '../HelpCenterCreationStatus.vue';

vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: key => key }) }));
vi.mock('dashboard/api/onboarding', () => ({
  default: { getHelpCenterGeneration: vi.fn() },
}));

const CreationStatusRow = {
  name: 'CreationStatusRow',
  props: {
    ready: { type: Boolean, default: false },
    title: { type: String, default: '' },
    description: { type: String, default: '' },
    status: { type: String, default: '' },
  },
  template: '<div class="row" />',
};

const PREFIX = 'ONBOARDING_INBOX_SETUP.CREATED_FOR_YOU.';

const mountStatus = async data => {
  OnboardingAPI.getHelpCenterGeneration.mockResolvedValue({ data });
  const wrapper = mount(HelpCenterCreationStatus, {
    global: { stubs: { CreationStatusRow } },
  });
  await flushPromises();
  return wrapper;
};
const row = wrapper => wrapper.findComponent(CreationStatusRow);

describe('HelpCenterCreationStatus behaviour', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('steps through the generating phases before any article exists', async () => {
    const wrapper = await mountStatus({
      generation_id: 3,
      state: null,
      articles_count: 0,
    });
    expect(row(wrapper).props('status')).toBe(
      `${PREFIX}HELP_CENTER_GENERATING`
    );
    expect(row(wrapper).props('ready')).toBe(false);
    await vi.advanceTimersByTimeAsync(6000);
    expect(row(wrapper).props('status')).toBe(
      `${PREFIX}HELP_CENTER_ANALYZING_WEBSITE`
    );
    wrapper.unmount();
  });

  it('shows the article count, then hides when not started', async () => {
    const generating = await mountStatus({
      generation_id: 3,
      articles_count: 4,
    });
    expect(row(generating).props('status')).toBe(
      `${PREFIX}HELP_CENTER_ARTICLES`
    );
    generating.unmount();
    const idle = await mountStatus({ generation_id: null });
    expect(row(idle).exists()).toBe(false);
    idle.unmount();
  });
});
