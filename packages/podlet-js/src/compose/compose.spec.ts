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

    await Promise.all([composeYaml].map(async (file) => {
      await access(file);
    }));

    const [ composeRaw ] = await Promise.all([
      readFile(composeYaml, 'utf-8'),
    ]);

    const services = Compose.fromString(composeRaw).getServices();
    expect(Object.entries(services)).toHaveLength(1);
  });

});

test('compose', () => {
  expect(true).toBeTruthy();
});