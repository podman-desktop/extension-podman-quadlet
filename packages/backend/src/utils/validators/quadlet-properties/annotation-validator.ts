/**
 * @author axel7083
 */
import { Validator } from '../ivalidator';
import type { QuadletCheck } from '/@shared/src/models/quadlet-check';

export class AnnotationValidator extends Validator<unknown, QuadletCheck[]> {
  override validate(content: unknown): QuadletCheck[] {
    let items: string[];
    if (typeof content === 'string') {
      items = [content];
    } else if (Array.isArray(content)) {
      items = content;
    } else {
      throw new Error('invalid annotations content');
    }

    // items
    const results: QuadletCheck[] = [];
    for (const item of items) {
      if (!item.includes('=')) {
        results.push({
          type: 'error',
          line: `Annotation=${item}`,
          message: 'Invalid annotation: the format is key=value',
        });
      }
    }
    return results;
  }
}
