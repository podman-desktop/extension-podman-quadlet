/**
 * @author axel7083
 */

import { Parser } from './iparser';
import { parse } from 'js-ini';
import type { Quadlet } from '../../models/quadlet';

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

    return {
      path: unit.SourcePath,
      id: this.serviceName,
      content: this.content,
    };
  }
}
