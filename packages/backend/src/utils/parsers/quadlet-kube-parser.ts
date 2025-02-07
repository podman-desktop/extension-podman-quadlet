/**
 * @author axel7083
 */

import { Parser } from './iparser';
import { parse } from 'js-ini';

export interface XKube {
  yaml: string;
}

/**
 * Utility class to extract the Yaml property of the generated systemd unit.
 * The quadlet must be of type Kube.
 */
export class QuadletKubeParser extends Parser<string, XKube> {
  constructor(content: string) {
    super(content);
  }

  protected toXKube(kube: Record<string, string>): XKube {
    if (!('Yaml' in kube)) throw new Error('missing Yaml in systemd unit section');

    return {
      yaml: kube['Yaml'],
    };
  }

  override parse(): XKube {
    const raw = parse(this.content, {
      comment: ['#', ';'],
    });
    const unit = this.toXKube(raw['X-Kube'] as Record<string, string>);

    return {
      yaml: unit.yaml,
    };
  }
}
