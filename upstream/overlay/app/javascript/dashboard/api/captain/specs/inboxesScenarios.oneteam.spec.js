import captainInboxesAPI from '../inboxes';
import scenariosAPI from '../scenarios';
import { useAxiosMock } from '../../specs/oneteamAxiosMock';

const url = '/api/v1/accounts/1/captain/assistants';

describe('CaptainInboxes API (OneTeam)', () => {
  const axios = useAxiosMock();

  it('lists, connects and disconnects inboxes', () => {
    captainInboxesAPI.get({ assistantId: 2 });
    expect(axios.get).toHaveBeenCalledWith(`${url}/2/inboxes`);
    captainInboxesAPI.create({ assistantId: 2, inboxId: 5 });
    expect(axios.post).toHaveBeenCalledWith(`${url}/2/inboxes`, {
      inbox: { inbox_id: 5 },
    });
    captainInboxesAPI.delete({ assistantId: 2, inboxId: 5 });
    expect(axios.delete).toHaveBeenCalledWith(`${url}/2/inboxes/5`);
  });

  it('tolerates missing arguments', () => {
    captainInboxesAPI.get();
    expect(axios.get).toHaveBeenCalledWith(`${url}/undefined/inboxes`);
    captainInboxesAPI.create();
    captainInboxesAPI.delete();
    expect(axios.delete).toHaveBeenCalledWith(
      `${url}/undefined/inboxes/undefined`
    );
  });
});

describe('CaptainScenarios API (OneTeam)', () => {
  const axios = useAxiosMock();

  it('lists scenarios, page 1 by default', () => {
    scenariosAPI.get({ assistantId: 2 });
    expect(axios.get).toHaveBeenCalledWith(`${url}/2/scenarios`, {
      params: { page: 1, searchKey: undefined },
    });
    scenariosAPI.get();
    expect(axios.get).toHaveBeenLastCalledWith(`${url}/undefined/scenarios`, {
      params: { page: 1, searchKey: undefined },
    });
  });

  it('shows, creates, updates and deletes a scenario', () => {
    scenariosAPI.show({ assistantId: 2, id: 4 });
    expect(axios.get).toHaveBeenCalledWith(`${url}/2/scenarios/4`);
    scenariosAPI.create({ assistantId: 2, title: 'Refunds' });
    expect(axios.post).toHaveBeenCalledWith(`${url}/2/scenarios`, {
      scenario: { title: 'Refunds' },
    });
    scenariosAPI.create();
    expect(axios.post).toHaveBeenLastCalledWith(`${url}/undefined/scenarios`, {
      scenario: {},
    });
    scenariosAPI.update({ assistantId: 2, id: 4 }, { title: 'Returns' });
    expect(axios.put).toHaveBeenCalledWith(`${url}/2/scenarios/4`, {
      scenario: { title: 'Returns' },
    });
    scenariosAPI.update({ assistantId: 2, id: 4 });
    expect(axios.put).toHaveBeenLastCalledWith(`${url}/2/scenarios/4`, {
      scenario: {},
    });
    scenariosAPI.delete({ assistantId: 2, id: 4 });
    expect(axios.delete).toHaveBeenCalledWith(`${url}/2/scenarios/4`);
  });
});
