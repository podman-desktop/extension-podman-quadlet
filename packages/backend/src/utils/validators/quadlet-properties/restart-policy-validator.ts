/**
 * @author axel7083
 */
import { Validator } from '../ivalidator';
import type { QuadletCheck } from '/@shared/src/models/quadlet-check';

export class RestartPolicyValidator extends Validator<unknown, QuadletCheck[]> {
  override validate(content: unknown): QuadletCheck[] {
    if (typeof content !== 'string') throw new Error('invalid restart policy content');

    switch (content) {
      case 'no':
      case 'always':
      case 'unless-stopped':
        return [];
    }

    const [onFailure, rawNumber] = content.split(':');

    if (onFailure !== 'on-failure') {
      return [
        {
          type: 'error',
          line: `Restart=${content}`,
          message: `Invalid restart policy. Accepted are \`no\`, \`always\`, \`unless-stopped\` and \`on-failure[:max_retries]\`.`,
        },
      ];
    }

    try {
      const value = parseInt(rawNumber);
      if (isNaN(value)) {
        throw new Error('on-failure max retry must be a positive integer.');
      }
      return [];
    } catch (err: unknown) {
      return [
        {
          type: 'error',
          line: `Restart=${content}`,
          message: `Invalid restart policy: ${err}`,
        },
      ];
    }
  }
}
