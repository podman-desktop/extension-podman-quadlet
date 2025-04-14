import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';

self.MonacoEnvironment = {
  getWorker(_: unknown): Worker {
    return new editorWorker();
  },
};

console.log(self.MonacoEnvironment);
