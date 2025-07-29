/**
 * @author axel7083
 */

import { Parser } from './iparser';
import { type IIniObject, parse } from 'js-ini';
import type { Quadlet } from '/@shared/src/models/quadlet';
import type { QuadletType } from '/@shared/src/utils/quadlet-type';
import { QuadletExtensionParser } from './quadlet-extension-parser';
import { randomUUID } from 'node:crypto';
import type { ServiceQuadlet } from '/@shared/src/models/service-quadlet';
import { QuadletServiceTypeParser, ServiceType } from './quadlet-service-type-parser';
import type { TemplateQuadlet } from '/@shared/src/models/template-quadlet';
import type { TemplateInstanceQuadlet } from '/@shared/src/models/template-instance-quadlet';

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

  protected findDefaultInstance(source: IIniObject): string | undefined {
    if (!('Install' in source)) return undefined;
    if (typeof source['Install'] !== 'object') return undefined;
    if (!('DefaultInstance' in source['Install'])) return undefined;
    return `${source['Install']['DefaultInstance']}`;
  }

  override parse(): Quadlet {
    const raw = parse(this.content, {
      comment: ['#', ';'],
      keyMergeStrategy: 'join-to-array',
    });
    const unit = this.toUnit(raw['Unit'] as Record<string, string>);
    // extract the type from the path
    const type: QuadletType = new QuadletExtensionParser(unit.SourcePath).parse();

    const serviceQuadlet: ServiceQuadlet = {
      path: unit.SourcePath,
      service: this.serviceName,
      id: this.generateUUID(),
      content: this.content,
      state: 'unknown',
      type: type,
      requires: unit.Requires,
    };

    const [serviceType, result] = new QuadletServiceTypeParser({
      filename: this.serviceName,
      extension: 'service',
    }).parse();

    // we have a very specific case where user may specify in the [Install] section
    // the `DefaultInstance` property, allowing a template to have a default instance without specifying an argument
    const defaultInstance = this.findDefaultInstance(raw);

    switch (serviceType) {
      case ServiceType.SIMPLE:
        return serviceQuadlet;
      case ServiceType.TEMPLATE:
        return {
          ...serviceQuadlet,
          service: defaultInstance ? `${result}@${defaultInstance}.service` : serviceQuadlet.service,
          template: result,
          defaultInstance: defaultInstance,
        } as TemplateQuadlet & ServiceQuadlet;
      case ServiceType.TEMPLATE_INSTANCE:
        return {
          ...serviceQuadlet,
          template: result.template,
          argument: result.argument,
        } as TemplateInstanceQuadlet;
    }
  }
}
