import * as monaco from 'monaco-editor';
import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';

self.MonacoEnvironment = {
  getWorker(_: unknown): Worker {
    return new editorWorker();
  },
};

monaco.languages.typescript?.typescriptDefaults?.setEagerModelSync(true);