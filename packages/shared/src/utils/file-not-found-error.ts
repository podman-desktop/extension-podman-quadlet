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
 * Message of the error thrown when a file does not exist on a connection.
 * Errors are serialized as plain messages between the backend and the frontend,
 * so the message is what allows to identify them on both sides.
 */
export const FILE_NOT_FOUND_ERROR_MESSAGE = 'File not found';

/**
 * Create the known error to throw when a file does not exist
 * @param path the path of the missing file
 */
export function createFileNotFoundError(path: string): Error {
  return new Error(`${FILE_NOT_FOUND_ERROR_MESSAGE}: ${path}`);
}

/**
 * Determine if the given value is the known file not found error
 * @remarks the value can be an Error (backend) or a string (frontend, after serialization)
 */
export function isFileNotFoundError(err: unknown): boolean {
  const message = err instanceof Error ? err.message : err;
  return typeof message === 'string' && message.startsWith(FILE_NOT_FOUND_ERROR_MESSAGE);
}
