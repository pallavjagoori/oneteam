/**
 * OneTeam spec for quoted email headers when the date can't be formatted.
 *
 * Covers both header builders returning an empty header when the
 * quoted date formatter gives up.
 */
import {
  buildQuotedEmailHeaderFromContact,
  buildQuotedEmailHeaderFromInbox,
} from '../quotedEmailHelper';

vi.mock('date-fns', async importOriginal => ({
  ...(await importOriginal()),
  format: () => '',
}));

const lastEmail = {
  created_at: 1700000000,
  sender: { email: 'ann@example.com' },
  content_attributes: { email: { to: ['support@example.com'] } },
};

describe('quoted email headers without a formatted date', () => {
  it('returns an empty contact header', () => {
    expect(buildQuotedEmailHeaderFromContact(lastEmail, { name: 'Ann' })).toBe(
      ''
    );
  });

  it('returns an empty inbox header', () => {
    expect(
      buildQuotedEmailHeaderFromInbox(lastEmail, {
        name: 'Support',
        email: 'support@example.com',
      })
    ).toBe('');
  });
});
