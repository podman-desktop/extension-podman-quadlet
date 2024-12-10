/**
 * @author axel7083
 */
import { Parser } from './iparser';
import { QuadletType } from '/@shared/src/utils/quadlet-type';
import { parse } from 'js-ini';

export class QuadletTypeParser extends Parser<string, QuadletType> {
  constructor(content: string) {
    super(content);
  }

  override parse(): QuadletType {
    const raw = parse(this.content, {
      comment: ['#', ';'],
    });

    const quadletType = Object.values(QuadletType).find(type => type in raw);
    if (!quadletType) {
      throw new Error('cannot determine quadletType');
    }
    return quadletType;
  }
}
