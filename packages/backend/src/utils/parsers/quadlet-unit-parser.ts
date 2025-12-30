/**
 * @author axel7083
 */

import { Parser } from './iparser';
import { type IIniObject, parse } from 'js-ini';
import type { Quadlet } from '/@shared/src/models/quadlet';
import { QuadletType } from '/@shared/src/utils/quadlet-type';
import { QuadletExtensionParser } from './quadlet-extension-parser';
import { randomUUID } from 'node:crypto';
import type { ServiceQuadlet } from '/@shared/src/models/service-quadlet';
import { QuadletServiceTypeParser, ServiceType } from './quadlet-service-type-parser';
import type { TemplateQuadlet } from '/@shared/src/models/template-quadlet';
import type { TemplateInstanceQuadlet } from '/@shared/src/models/template-instance-quadlet';
import type { FileReference } from '/@shared/src/models/base-quadlet';
import { basename, dirname, isAbsolute, join } from 'node:path/posix';

interface Unit {
  SourcePath: string;
  Requires: Array<string>;
}

/**
 * To determine the {@link import('/@shared/src/models/base-quadlet').BaseQuadlet#resources} we need to specify which
 * properties if defined correspond to a file reference
 */
export const QUADLET_RESOURCES_PATHS: Record<QuadletType, Array<string>> = {
  [QuadletType.CONTAINER]: ['EnvironmentFile', 'SeccompProfile', 'ContainersConfModule'],
  [QuadletType.KUBE]: ['Yaml', 'ConfigMap', 'ContainersConfModule'],
  [QuadletType.BUILD]: ['AuthFile', 'IgnoreFile', 'ContainersConfModule'],
  [QuadletType.IMAGE]: ['AuthFile', 'ContainersConfModule'],
  [QuadletType.NETWORK]: ['ContainersConfModule'],
  [QuadletType.POD]: ['ContainersConfModule'],
  [QuadletType.VOLUME]: ['ContainersConfModule'],
};

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

  protected toAbsolute(sourcePath: string, path: string): string {
    if (isAbsolute(path)) return path;
    if (path.startsWith('~')) return path;

    return join(dirname(sourcePath), path);
  }

  protected findResources(sourcePath: string, source: IIniObject): Array<FileReference> {
    return Object.entries(QUADLET_RESOURCES_PATHS).reduce((accumulator, [quadletType, properties]) => {
      const key = `X-${quadletType}`;
      if (!(key in source)) return accumulator;
      if (typeof source[key] !== 'object' || Array.isArray(source[key])) return accumulator;

      for (const property of properties) {
        if (!(property in source[key])) continue;

        let values: string[];
        if (Array.isArray(source[key][property])) {
          values = source[key][property];
        } else if (typeof source[key][property] === 'string') {
          values = [source[key][property]];
        } else {
          return accumulator;
        }

        accumulator.push(
          ...values.map(value => ({
            path: this.toAbsolute(sourcePath, value),
            name: basename(value),
          })),
        );
      }
      return accumulator;
    }, [] as Array<FileReference>);
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
      resources: this.findResources(unit.SourcePath, raw),
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
          service: defaultInstance ? `${result.template}@${defaultInstance}.service` : serviceQuadlet.service,
          template: result.template,
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
