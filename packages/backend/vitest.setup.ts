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

import { vi } from 'vitest';
import type { Event, EventEmitter, Disposable } from '@podman-desktop/api';

/**
 * Mock the {@link EventEmitter} class logic
 */
class EventEmitterMock<T> implements EventEmitter<T> {
  #set: Set<(t: T) => void> = new Set();

  get event(): Event<T> {
    return listener => {
      this.#set.add(listener);
      return {
        dispose: (): void => {
          this.#set.delete(listener);
        },
      };
    };
  }

  fire(data: T): void {
    this.#set.forEach(listener => listener(data));
  }

  dispose(): void {
    this.#set.clear();
  }
}

vi.mock('@podman-desktop/api', () => ({
  EventEmitter: EventEmitterMock,
  ProgressLocation: {
    TASK_WIDGET: 2,
  },
  Disposable: {
    create: (fn: () => void): Disposable => ({ dispose: fn }),
  },
  CancellationTokenSource: vi.fn(),
  Uri: {
    joinPath: vi.fn(),
  },
}));
