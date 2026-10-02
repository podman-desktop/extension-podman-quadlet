import editorWorker from 'monaco-editor/editor/editor.worker?worker';

self.MonacoEnvironment = {
  getWorker(_: unknown): Worker {
    return new editorWorker();
  },
};
