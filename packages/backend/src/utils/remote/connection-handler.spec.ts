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
import { vi, test, expect, beforeEach, afterEach } from 'vitest';
import { ConnectionHandler } from './connection-handler';

class ConnectionHandlerImpl extends ConnectionHandler {
  #counter: number = 0;

  get counter(): number {
    return this.#counter;
  }

  override async connect(): Promise<boolean> {
    this.#counter += 1;
    return true;
  }

  public override handleReconnect(): void {
    super.handleReconnect();
  }
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

test('handle reconnect should call counter', async () => {
  const handler = new ConnectionHandlerImpl();

  handler.handleReconnect();

  // advance time
  await vi.advanceTimersByTimeAsync(50_000);

  await vi.waitFor(() => {
    expect(handler.counter).toBeGreaterThan(0);
  });
});

test('dispose should abort reconnect', async () => {
  const handler = new ConnectionHandlerImpl();

  handler.handleReconnect();

  handler.dispose();

  // advance time
  await vi.advanceTimersByTimeAsync(50_000);

  await vi.waitFor(() => {
    expect(handler.counter).toEqual(0);
  });
});

test('once disposed expect no reconnect', async () => {
  const handler = new ConnectionHandlerImpl();

  handler.handleReconnect();

  // advance time
  await vi.advanceTimersByTimeAsync(50_000);

  await vi.waitFor(() => {
    expect(handler.counter).toEqual(1);
  });

  // dispose
  handler.dispose();

  // try to reconnect
  handler.handleReconnect();

  // advance time
  await vi.advanceTimersByTimeAsync(50_000);

  // we should not have any reconnect done
  await vi.waitFor(() => {
    expect(handler.counter).toEqual(1);
  });
});
