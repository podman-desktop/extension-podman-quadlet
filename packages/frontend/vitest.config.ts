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
import { defineProject } from 'vitest/config';
import { join } from 'node:path';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { svelteTesting } from '@testing-library/svelte/vite';

const PACKAGE_ROOT = __dirname;
const WORKSPACE_ROOT = join(PACKAGE_ROOT, '..', '..');

export default defineProject({
  root: PACKAGE_ROOT,
  resolve: {
    alias: {
      '/@/': join(PACKAGE_ROOT, 'src') + '/',
      '/@store/': join(PACKAGE_ROOT, 'src', 'stores') + '/',
      '/@shared/': join(PACKAGE_ROOT, '../shared') + '/',
    },
  },
  plugins: [svelte({ hot: !process.env.VITEST }), svelteTesting()],
  test: {
    include: ['src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    globals: true,
    environment: 'jsdom',
    alias: [
      { find: '@testing-library/svelte', replacement: '@testing-library/svelte/svelte5' },
      {
        find: /^monaco-editor$/,
        replacement: `${WORKSPACE_ROOT}/node_modules/monaco-editor/esm/vs/editor/editor.api`,
      },
    ],
    deps: {
      inline: [],
    },
    setupFiles: ['./vite.tests.setup.ts'],
  },
});
