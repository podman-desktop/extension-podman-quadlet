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

import type { Terminal } from '@xterm/xterm';

/**
 * xterm.js keeps its selection internally, so the default browser copy
 * shortcuts and context menu do not always pick it up (e.g. in Flatpak).
 * Copy it to the clipboard ourselves.
 */
export async function copySelection(terminal: Pick<Terminal, 'getSelection'>): Promise<boolean> {
  const selection = terminal.getSelection();
  if (!selection) return false;
  try {
    await navigator.clipboard.writeText(selection);
  } catch {
    // the async clipboard API can be denied (e.g. Flatpak webview): use the legacy way
    legacyCopy(selection);
  }
  return true;
}

function legacyCopy(text: string): void {
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();
  try {
    if (!document.execCommand('copy')) console.error('[quadlet] execCommand copy was refused');
  } finally {
    textarea.remove();
  }
}

/**
 * Handler for {@link Terminal.attachCustomKeyEventHandler}
 * @returns false if the event has been handled (xterm must ignore it), true otherwise
 */
export function handleCopyKeyEvent(terminal: Pick<Terminal, 'getSelection'>, event: KeyboardEvent): boolean {
  if (event.type !== 'keydown') return true;

  const key = event.key.toLowerCase();
  const isCopy =
    // Ctrl+Shift+C (terminal style) or Ctrl+Insert
    (event.ctrlKey && event.shiftKey && key === 'c') ||
    (event.ctrlKey && key === 'insert') ||
    // Ctrl+C / Cmd+C only copy when something is selected, otherwise let xterm handle it
    ((event.ctrlKey || event.metaKey) && !event.shiftKey && key === 'c' && terminal.getSelection() !== '');

  if (!isCopy) return true;

  event.preventDefault();
  copySelection(terminal).catch(console.error);
  return false;
}
