/**
 * @author axel7083
 */
import { test, expect } from 'vitest';
import { RestartPolicyValidator } from './restart-policy-validator';

test.each(['no', 'always', 'unless-stopped', 'on-failure:3'])('%s to be valid', content => {
  const checks = new RestartPolicyValidator().validate(content);
  expect(checks).toHaveLength(0);
});

test('unknown value should return an error', () => {
  const checks = new RestartPolicyValidator().validate('hello');
  expect(checks[0]).toStrictEqual({
    type: 'error',
    line: `Restart=hello`,
    message: `Invalid restart policy. Accepted are \`no\`, \`always\`, \`unless-stopped\` and \`on-failure[:max_retries]\`.`,
  });
});

test('invalid integer for on-failure should return an error', () => {
  const checks = new RestartPolicyValidator().validate('on-failure:a');
  expect(checks[0]).toStrictEqual({
    line: 'Restart=on-failure:a',
    message: 'Invalid restart policy: Error: on-failure max retry must be a positive integer.',
    type: 'error',
  });
});
