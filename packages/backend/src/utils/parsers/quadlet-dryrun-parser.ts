/**
 * @author axel7083
 */

import { Parser } from './iparser';
import { QuadletUnitParser } from './quadlet-unit-parser';
import type { Quadlet } from '../../models/quadlet';
import type { RunResult } from '@podman-desktop/api';
import { QuadletExtensionParser } from './quadlet-extension-parser';
import { isAbsolute, basename } from 'node:path/posix';
import { randomUUID } from 'node:crypto';
import { QuadletServiceTypeParser, ServiceType } from './quadlet-service-type-parser';

export class QuadletDryRunParser extends Parser<RunResult & { exitCode?: number }, Quadlet[]> {
  // match line such as 'quadlet-generator[11695]: Loading source unit file /home/user/.config/containers/systemd/nginx.image'
  private static readonly STD_ERR_LOAD_PATTERN = /Loading source unit file (.+)/;

  // Stores the parsed services and their content
  private services: Record<string, Quadlet> = {};

  constructor(content: RunResult) {
    super(content);
  }

  protected parseStdout(): Quadlet[] {
    // Regular expression to match the structure of the content
    // eslint-disable-next-line sonarjs/slow-regex
    const serviceRegex = /---(.*?)---\n([\s\S]*?)(?=---|$)/g;
    let match;

    while ((match = serviceRegex.exec(this.content.stdout))) {
      const serviceName = match[1].trim();

      // parse the quadlet unit
      const quadletUnitParser = new QuadletUnitParser(serviceName, match[2].trim());
      this.services[serviceName] = quadletUnitParser.parse();
    }

    this.parsed = true;
    return Object.values(this.services);
  }

  // https://www.freedesktop.org/software/systemd/man/latest/systemd.service.html#Service%20Templates
  protected isTemplate(path: string): boolean {
    const filename = basename(path);

    const separator = filename.lastIndexOf('.');
    if (separator === -1) throw new Error('service name do not have .service extension');
    const [name] = [filename.slice(0, separator), filename.slice(separator + 1)];
    return name.endsWith('@');
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

      // create quadlet in error state
      accumulator.push({
        service: undefined, // do not have corresponding service
        id: randomUUID(),
        path: path,
        state: 'error',
        type: new QuadletExtensionParser(path).parse(),
        requires: [], // cannot detect requires
        isTemplate:
          new QuadletServiceTypeParser({ filename: basename(path), extension: type.toLowerCase() }).parse() ===
          ServiceType.TEMPLATE,
      });

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
