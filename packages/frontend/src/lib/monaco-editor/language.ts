/**********************************************************************
 * Copyright (C) 2026 Red Hat, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * SPDX-License-Identifier: Apache-2.0
 ***********************************************************************/

/**
 * Monaco language ids to use for the file extensions which do not match a language id
 */
const LANGUAGES_BY_EXTENSION: Record<string, string> = {
  yml: 'yaml',
  // environment files (E.g. EnvironmentFile=foo.env) are made of KEY=VALUE lines, like ini files
  env: 'ini',
  // containers.conf modules (ContainersConfModule=foo.conf) use the TOML format, which is close to ini files
  conf: 'ini',
};

/**
 * Get the monaco language id to use to display a file, based on its name
 * @param path the path of the file (E.g. `/home/user/.config/containers/systemd/foo.env`)
 * @returns the language id, `plaintext` for a file without extension
 */
export function getLanguageFromPath(path: string): string {
  const filename = (path.split('/').pop() ?? path).toLowerCase();

  // dotenv files (E.g. .env, .env.local)
  if (filename === '.env' || filename.startsWith('.env.')) return 'ini';

  const index = filename.lastIndexOf('.');
  // file without extension or hidden file (E.g. .containerignore)
  if (index <= 0) return 'plaintext';

  const extension = filename.substring(index + 1);
  return LANGUAGES_BY_EXTENSION[extension] ?? extension;
}
