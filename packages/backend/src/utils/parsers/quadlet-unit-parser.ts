/**
 * @author axel7083
 */

import { Parser } from './iparser';
import { parse } from 'js-ini';
import type { Quadlet } from '../../models/quadlet';
import { QuadletType } from '/@shared/src/utils/quadlet-type';

interface Unit {
  SourcePath: string;
}

export class QuadletUnitParser extends Parser<string, Quadlet> {
  constructor(
    private serviceName: string,
    content: string,
  ) {
    super(content);
  }

  protected toUnit(unit: Record<string, string>): Unit {
    if (!('SourcePath' in unit)) throw new Error('missing SourcePath in systemd unit section');

    return {
      SourcePath: unit['SourcePath'],
    };
  }

  override parse(): Quadlet {
    const raw = parse(this.content, {
      comment: ['#', ';'],
    });
    const unit = this.toUnit(raw['Unit'] as Record<string, string>);

    const extension = unit.SourcePath.split('.').pop();
    const type: QuadletType | undefined = Object.values(QuadletType).find(type => extension === type.toLowerCase());
    if(!type) throw new Error(`cannot found quadlet type for file ${unit.SourcePath}`);

    return {
      path: unit.SourcePath,
      id: this.serviceName,
      content: this.content,
      state: 'unknown',
      type: type,
    };
  }
}
