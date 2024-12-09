/**
 * @author axel7083
 */

import { Validator } from './ivalidator';
import type { QuadletCheck } from '/@shared/src/models/quadlet-check';
import { KeyMergeStrategies, parse } from 'js-ini';
import { AnnotationValidator } from './quadlet-properties/annotation-validator';
import { RestartPolicyValidator } from './quadlet-properties/restart-policy-validator';

const CONTAINER_VALIDATORS: Record<string, Validator<unknown, QuadletCheck[]>> = {
  Annotation: new AnnotationValidator(),
};

const SERVICE_VALIDATORS: Record<string, Validator<unknown, QuadletCheck[]>> = {
  Restart: new RestartPolicyValidator(),
};

export class QuadletValidator extends Validator<string, QuadletCheck[]> {
  override validate(content: string): QuadletCheck[] {
    const parsed = parse(content, {
      comment: ['#', ';'],
      keyMergeStrategy: KeyMergeStrategies.JOIN_TO_ARRAY,
    });

    const output: QuadletCheck[] = [];

    // validate container section
    if ('Container' in parsed && typeof parsed['Container'] === 'object') {
      output.push(...this.validateSection(parsed['Container'] as Record<string, unknown>, CONTAINER_VALIDATORS));
    }

    if ('Service' in parsed && typeof parsed['Service'] === 'object') {
      output.push(...this.validateSection(parsed['Service'] as Record<string, unknown>, SERVICE_VALIDATORS));
    }

    return output;
  }

  protected validateSection(
    section: Record<string, unknown>,
    validators: Record<string, Validator<unknown, QuadletCheck[]>>,
  ): QuadletCheck[] {
    // collect all entries
    const entries = Object.entries(section);

    // ensure entries with validator are validated
    return entries.reduce((output, [key, value]) => {
      if (key in validators) {
        output.push(...validators[key].validate(value));
      }

      return output;
    }, [] as QuadletCheck[]);
  }
}
