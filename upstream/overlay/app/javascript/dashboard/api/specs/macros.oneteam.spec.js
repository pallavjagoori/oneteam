import macrosAPI from '../macros';
import { useAxiosMock } from './oneteamAxiosMock';

describe('MacrosAPI (OneTeam)', () => {
  const axios = useAxiosMock();

  it('runs a macro on conversations', () => {
    macrosAPI.executeMacro({ macroId: 3, conversationIds: [1, 2] });
    expect(axios.post).toHaveBeenCalledWith(
      '/api/v1/accounts/1/macros/3/execute',
      { conversation_ids: [1, 2] }
    );
  });
});
