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

import { vi, describe, test, expect } from 'vitest';
import { EventEmitter, Disposable } from '@podman-desktop/api';

describe('EventEmitter', () => {
  test('EventEmitter#event should register listener', () => {
    const emitter = new EventEmitter<string>();
    const listener = vi.fn();

    // register listener
    emitter.event(listener);
    // emit
    emitter.fire('potatoes');
    // ensure expected behaviour
    expect(listener).toHaveBeenCalledOnce();
    expect(listener).toHaveBeenCalledWith('potatoes');
  });

  test('EventEmitter#event should provide a disposable', () => {
    const emitter = new EventEmitter<string>();
    const listener = vi.fn();

    // register listener
    const disposable = emitter.event(listener);
    disposable.dispose();
    // emit
    emitter.fire('potatoes');
    // ensure expected behaviour
    expect(listener).not.toHaveBeenCalled();
  });

  test('EventEmitter#dispose should dispose all listeners', () => {
    const emitter = new EventEmitter<string>();
    const listener = vi.fn();

    // register listener
    emitter.event(listener);
    emitter.dispose();
    // emit
    emitter.fire('potatoes');
    // ensure expected behaviour
    expect(listener).not.toHaveBeenCalled();
  });

  test('EventEmitter#event should support multiple listeners', () => {
    const emitter = new EventEmitter<string>();
    const listeners = Array.from({ length: 10 }).map(() => vi.fn());

    // register listeners
    listeners.forEach(listener => emitter.event(listener));

    // emit
    emitter.fire('potatoes');
    // ensure expected behaviour
    listeners.forEach(listener => {
      expect(listener).toHaveBeenCalledOnce();
      expect(listener).toHaveBeenCalledWith('potatoes');
    });
  });
});

describe('Disposable', () => {
  test('Disposable#create should create disposable from function', () => {
    const callback = vi.fn();
    const disposable = Disposable.create(callback);
    disposable.dispose();

    expect(callback).toHaveBeenCalledOnce();
  });
});
