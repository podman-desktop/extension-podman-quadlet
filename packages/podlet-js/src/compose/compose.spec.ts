import { test, expect, describe } from 'vitest';
import { readdir, readFile, access } from 'node:fs/promises';
import { join } from 'node:path';
import { Compose } from './compose';

const assetsDir = join(__dirname, './tests');

describe('compose', async () => {
  const folders = await readdir(assetsDir);

  test.each(folders)('should generate correct output for %s', async (folder) => {
    const folderPath = join(assetsDir, folder);
    const composeYaml = join(folderPath, 'compose.yaml');
    const expectYaml = join(folderPath, 'expect.yaml');

    await Promise.all([composeYaml, expectYaml].map(async (file) => {
      await access(file);
    }));

    const [ composeRaw, expectRaw ] = await Promise.all([
      readFile(composeYaml, 'utf-8'),
      readFile(expectYaml, 'utf-8'),
    ]);

    const compose = Compose.fromString(composeRaw);
    expect(compose.toKubePlay()).toStrictEqual(expectRaw);
  });

});

test('compose', () => {
  expect(true).toBeTruthy();
});
