/**
 * @author axel7083
 */

import { Parser } from './iparser';
import { parse } from 'js-ini';
import type { Quadlet } from '../../models/quadlet';
import type { QuadletType } from '/@shared/src/utils/quadlet-type';
import { QuadletExtensionParser } from './quadlet-extension-parser';
import { randomUUID } from 'node:crypto';

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

  protected generateUUID(): string {
    return randomUUID();
  }

  override parse(): Quadlet {
    const raw = parse(this.content, {
      comment: ['#', ';'],
    });
    const unit = this.toUnit(raw['Unit'] as Record<string, string>);
    // extract the type from the path
    const type: QuadletType = new QuadletExtensionParser(unit.SourcePath).parse();

    return {
      path: unit.SourcePath,
      service: this.serviceName,
      id: this.generateUUID(),
      content: this.content,
      state: 'unknown',
      type: type,
    };
  }
}
