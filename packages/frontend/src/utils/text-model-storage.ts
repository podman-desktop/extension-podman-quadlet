/**********************************************************************
 * Copyright (C) 2025 Red Hat, Inc.
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
import { SvelteMap } from 'svelte/reactivity';
import type * as Monaco from 'monaco-editor/esm/vs/editor/editor.api';

export const KEY_PREFIX = 'text-model-storage-';

export class TextModelStorage extends SvelteMap<string, Monaco.editor.ITextModel> {
  private readonly listeners: Map<string, Monaco.IDisposable> = new Map();

  protected getKey(filename: string): string {
    return `${KEY_PREFIX}${filename}`;
  }

  delete(filename: string): boolean {
    // delete from local storage
    localStorage.removeItem(this.getKey(filename));

    // dispose listeners
    this.listeners.get(filename)?.dispose();
    this.listeners.delete(filename);

    // call super class
    return super.delete(filename);
  }

  set(filename: string, value: Monaco.editor.ITextModel): this {
    console.log(`[TextModelStorage] set ${filename}`);

    // when adding a text model, let's add an event to capture update
    this.listeners.set(
      filename,
      value.onDidChangeContent(
        this.updateLocalStorage.bind(this, filename, value),
      ),
    );
    // call once to create the entry inside the local storage
    this.updateLocalStorage(filename, value);

    return super.set(filename, value);
  }

  protected updateLocalStorage(filename: string, model: Monaco.editor.ITextModel): void {
    console.log(`[TextModelStorage] updateLocalStorage ${filename}`);
    const pathKey = this.getKey(filename);
    localStorage.setItem(pathKey, model.getValue());
  }

  getName(model: Monaco.editor.ITextModel): string {
    const filename = this.entries().find(([, { id }]) => id === model.id)?.[0];
    if(!filename) throw new Error(`cannot found corresponding filename for model with id ${model.id}`);
    return filename;
  }

  rename(from: string, to: string): void {
    // check fromKey has corresponding models
    const fromRaw = this.get(from);
    if(!fromRaw) throw new Error(`cannot rename file ${from}: not found`);

    // delete existing mapping
    this.delete(from);

    // create new mapping
    this.set(to, fromRaw);
  }

  restore(monaco: typeof Monaco): void {
    for (const [key, content] of Object.entries(localStorage)) {
      if(!key.startsWith(KEY_PREFIX)) continue;
      const model = monaco.editor.createModel(content, 'ini');
      this.set(key.substring(KEY_PREFIX.length), model);
    }
  }
}
