/**
 * @author axel7083
 */

import { Parser } from './iparser';
import { type IIniObject, parse } from 'js-ini';
import type { Quadlet } from '/@shared/src/models/quadlet';
import type { QuadletType } from '/@shared/src/utils/quadlet-type';
import { QuadletExtensionParser } from './quadlet-extension-parser';
import { randomUUID } from 'node:crypto';

interface Unit {
  SourcePath: string;
  Requires: Array<string>;
}

export class QuadletUnitParser extends Parser<string, Quadlet> {
  constructor(
    private serviceName: string,
    content: string,
  ) {
    super(content);
  }

  protected toUnit(unit: IIniObject): Unit {
    if (!('SourcePath' in unit) || typeof unit['SourcePath'] !== 'string')
      throw new Error('missing SourcePath in systemd unit section');

    const requires: Array<string> = [];
    if ('Requires' in unit) {
      if (Array.isArray(unit['Requires'])) {
        requires.push(...unit['Requires']);
      } else if (typeof unit['Requires'] === 'string') {
        requires.push(unit['Requires']);
      }
    }

    return {
      SourcePath: unit['SourcePath'],
      Requires: requires,
    };
  }

  protected generateUUID(): string {
    return randomUUID();
  }

  override parse(): Quadlet {
    const raw = parse(this.content, {
      comment: ['#', ';'],
      keyMergeStrategy: 'join-to-array',
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
      requires: unit.Requires,
    };
  }
}
