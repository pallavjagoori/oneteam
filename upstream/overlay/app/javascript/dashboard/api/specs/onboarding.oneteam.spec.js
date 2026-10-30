import onboardingAPI from '../onboarding';
import { useAxiosMock } from './oneteamAxiosMock';

describe('OnboardingAPI (OneTeam)', () => {
  const axios = useAxiosMock();
  const url = '/api/v1/accounts/1/onboarding';

  it('updates onboarding data', () => {
    onboardingAPI.update({ step: 2 });
    expect(axios.patch).toHaveBeenCalledWith(url, { step: 2 });
  });

  it('fetches the help center generation status', () => {
    onboardingAPI.getHelpCenterGeneration();
    expect(axios.get).toHaveBeenCalledWith(`${url}/help_center_generation`);
  });
});
