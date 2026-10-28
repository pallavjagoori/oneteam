import * as Sentry from '@sentry/vue';
import { useCamelCase, useSnakeCase } from '../useTransformKeys';

/*
 * OneTeam coverage for the failure path of the key transformers: when the
 * library throws, the error goes to Sentry and the payload comes back as is.
 */
vi.mock('camelcase-keys', () => ({
  default: () => {
    throw new Error('camel');
  },
}));
vi.mock('snakecase-keys', () => ({
  default: () => {
    throw new Error('snake');
  },
}));
vi.mock('@sentry/vue', () => ({
  setContext: vi.fn(),
  captureException: vi.fn(),
}));

describe('useTransformKeys failures (OneTeam)', () => {
  it.each([
    [useCamelCase, 'camelCase'],
    [useSnakeCase, 'snakeCase'],
  ])('returns the payload and reports %#', (transform, op) => {
    const payload = { a_b: 1 };
    expect(transform(payload, { deep: true })).toBe(payload);
    expect(Sentry.setContext).toHaveBeenCalledWith('transform-keys-error', {
      payload,
      options: { deep: true },
      op,
    });
    expect(Sentry.captureException).toHaveBeenCalled();
  });
});
