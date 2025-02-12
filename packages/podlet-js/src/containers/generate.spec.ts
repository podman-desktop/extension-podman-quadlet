import { readdir, readFile, access } from 'node:fs/promises';
import { join } from 'node:path';
import { test, expect, describe } from 'vitest';
import { Generate } from './generate';

const assetsDir = join(__dirname, './tests');

describe('generate', async () => {
  const folders = await readdir(assetsDir);

  test.each(folders)('should generate correct output for %s', async (folder) => {
    const folderPath = join(assetsDir, folder);
    const containerPath = join(folderPath, 'container-inspect.json');
    const imagePath = join(folderPath, 'image-inspect.json');
    const expectedPath = join(folderPath, 'expect.ini');

    await Promise.all([containerPath, imagePath, expectedPath].map(async (file) => {
      await access(file);
    }));

    const [container, image, expected] = await Promise.all([
      readFile(containerPath, 'utf-8'),
      readFile(imagePath, 'utf-8'),
      readFile(expectedPath, 'utf-8'),
    ]);

    const result = new Generate({
      container:JSON.parse(container),
      image: JSON.parse(image),
    }).generate();
    expect(result.trim()).toBe(expected.trim());
  });
});
