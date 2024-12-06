<script lang="ts">
import { onDestroy, onMount } from 'svelte';
import type * as Monaco from 'monaco-editor/esm/vs/editor/editor.api';
import './monaco';
import type { HTMLAttributes } from 'svelte/elements';

interface Props extends HTMLAttributes<HTMLElement> {
  content: string;
  language: string;
  readOnly?: boolean;
}

let { content = $bindable(), language, readOnly = false, class: className, ...restProps }: Props = $props();

// solution from https://github.com/vitejs/vite/discussions/1791#discussioncomment-9281911

let editor: Monaco.editor.IStandaloneCodeEditor;
let editorContainer: HTMLElement;

function getTerminalBg(): string {
  const app = document.getElementById('app');
  if (!app) throw new Error('cannot found app element');
  const style = window.getComputedStyle(app);

  let color = style.getPropertyValue('--pd-terminal-background').trim();

  // convert to 6 char RGB value since some things don't support 3 char format
  if (color?.length < 6) {
    color = color
      .split('')
      .map(c => {
        return c === '#' ? c : c + c;
      })
      .join('');
  }
  return color;
}

onMount(async () => {
  const terminalBg = getTerminalBg();
  const isDarkTheme: boolean = terminalBg === '#000000';

  import('monaco-editor/esm/vs/editor/editor.api').then(monaco => {
    // define custom theme
    monaco.editor.defineTheme('podmanDesktopTheme', {
      base: isDarkTheme ? 'vs-dark' : 'vs',
      inherit: true,
      rules: [{ token: 'custom-color', background: terminalBg }],
      colors: {
        'editor.background': terminalBg,
        // make the --vscode-focusBorder transparent
        focusBorder: '#00000000',
      },
    });

    editor = monaco.editor.create(editorContainer, {
      value: content,
      language: language,
      automaticLayout: true,
      scrollBeyondLastLine: false,
      readOnly: readOnly,
      theme: 'podmanDesktopTheme',
    });

    editor.onDidChangeModelContent(() => {
      content = editor.getValue();
    });
  });
});

onDestroy(() => {
  editor?.dispose();
});
</script>

<div class="h-full w-full {className}" {...restProps} bind:this={editorContainer}></div>
