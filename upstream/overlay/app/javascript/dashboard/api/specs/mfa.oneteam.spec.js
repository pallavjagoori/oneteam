import mfaAPI from '../mfa';
import { useAxiosMock } from './oneteamAxiosMock';

describe('MfaAPI (OneTeam)', () => {
  const axios = useAxiosMock();
  const url = '/api/v1/profile/mfa';

  it('enables MFA', () => {
    mfaAPI.enable();
    expect(axios.post).toHaveBeenCalledWith(url);
  });

  it('verifies an OTP code', () => {
    mfaAPI.verify('123456');
    expect(axios.post).toHaveBeenCalledWith(`${url}/verify`, {
      otp_code: '123456',
    });
  });

  it('disables MFA with a password and a code', () => {
    mfaAPI.disable('secret', { otpCode: '123456', backupCode: 'b-1' });
    expect(axios.delete).toHaveBeenCalledWith(url, {
      data: { password: 'secret', otp_code: '123456', backup_code: 'b-1' },
    });
  });

  it('disables MFA with only a password', () => {
    mfaAPI.disable('secret');
    expect(axios.delete).toHaveBeenCalledWith(url, {
      data: { password: 'secret', otp_code: undefined, backup_code: undefined },
    });
  });

  it('regenerates backup codes', () => {
    mfaAPI.regenerateBackupCodes('123456');
    expect(axios.post).toHaveBeenCalledWith(`${url}/backup_codes`, {
      otp_code: '123456',
    });
  });
});
