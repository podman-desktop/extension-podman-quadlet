/**
 * @author axel7083
 */

import { Parser } from '/@/utils/parsers/iparser';
import { QuadletUnitParser } from '/@/utils/parsers/quadlet-unit-parser';
import type {
  Quadlet,
  ServiceLessQuadlet,
  TemplateQuadlet,
  TemplateInstanceQuadlet,
} from '@podman-desktop/quadlet-extension-core-api';
import type { RunResult } from '@podman-desktop/api';
import { QuadletExtensionParser } from '/@/utils/parsers/quadlet-extension-parser';
import { basename, isAbsolute } from 'node:path/posix';
import { randomUUID } from 'node:crypto';
import { QuadletServiceTypeParser, ServiceType } from '/@/utils/parsers/quadlet-service-type-parser';

export class QuadletDryRunParser extends Parser<RunResult & { exitCode?: number }, Quadlet[]> {
  // match line such as 'quadlet-generator[11695]: Loading source unit file /home/user/.config/containers/systemd/nginx.image'
  private static readonly STD_ERR_LOAD_PATTERN = /Loading source unit file (.+)/;

  // Stores the parsed services and their content
  private services: Record<string, Quadlet> = {};

  constructor(content: RunResult) {
    super(content);
  }

  protected parseStdout(): Quadlet[] {
    const lines = this.content.stdout.split(/\r?\n/);
    const regex = RegExp(/^---([^\r\n]+\.service)---$/);

    let buffer: string | undefined = undefined;
    let serviceName: string | undefined = undefined;

    const flush = (): void => {
      if (!serviceName || !buffer) {
        return;
      }

      this.services[serviceName] = new QuadletUnitParser(serviceName, buffer).parse();
      serviceName = undefined;
      buffer = undefined;
    };

    for (const line of lines) {
      const match = regex.exec(line);
      if (match) {
        flush();

        serviceName = match[1].trim();
        buffer = undefined;
      } else {
        buffer = buffer ? `${buffer}\n${line}` : line;
      }
    }
    flush();

    this.parsed = true;
    return Object.values(this.services);
  }

  /**
   * @param validQuadlets
   * @protected
   */
  protected parseStderr(validQuadlets: Set<string>): Array<Quadlet> {
    // split stderr by line separator
    const lines = this.content.stderr.split('\n');

    // identify all files that quadlet tried to load
    return lines.reduce((accumulator, line) => {
      const match = QuadletDryRunParser.STD_ERR_LOAD_PATTERN.exec(line);
      // ignore non-matching lines
      if (!match) return accumulator;

      // ensure the path we got is valid
      const path = match[1].trim();
      if (!isAbsolute(path)) {
        throw new Error(
          `Something went wrong while parsing quadlet systemd-generator stderr, line "${line}" do not contain absolute path of quadlet file.`,
        );
      }

      // if the quadlet we got already exist, ignore
      if (validQuadlets.has(path)) return accumulator;

      const type = new QuadletExtensionParser(path).parse();

      // search for every line mentioning the path
      const stderr = lines.filter(line => line.includes(path));

      const serviceLessQuadlet: ServiceLessQuadlet = {
        service: undefined, // do not have corresponding service
        id: randomUUID(),
        path: path,
        state: 'error',
        type: type,
        requires: [], // cannot detect requires
        files: [], // cannot detect resources
        stderr: stderr.length > 0 ? stderr.join('\n') : undefined,
      };

      const [serviceType, result] = new QuadletServiceTypeParser({
        filename: basename(path),
        extension: type.toLowerCase(),
      }).parse();
      switch (serviceType) {
        case ServiceType.SIMPLE:
          accumulator.push(serviceLessQuadlet);
          break;
        case ServiceType.TEMPLATE:
          accumulator.push({
            ...serviceLessQuadlet,
            template: result.template,
            defaultInstance: undefined, // we can't determine in error state
          } as TemplateQuadlet);
          break;
        case ServiceType.TEMPLATE_INSTANCE:
          accumulator.push({
            ...serviceLessQuadlet,
            template: result.template,
            argument: result.argument,
          } as TemplateInstanceQuadlet);
          break;
      }

      return accumulator;
    }, [] as Array<Quadlet>);
  }

  override parse(): Quadlet[] {
    if (this.parsed) {
      throw new Error('Content has already been parsed.');
    }

    /**
     * Parse the stdout for get valid quadlets
     * @remarks valid here means that the quadlet has an associated systemd service name and is properly parsed
     */
    const validQuadlets = this.parseStdout();

    return [...validQuadlets, ...this.parseStderr(new Set(validQuadlets.map(({ path }) => path)))];
  }
}
