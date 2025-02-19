<script lang="ts">
import { onDestroy, onMount } from 'svelte';
import type * as Monaco from 'monaco-editor/esm/vs/editor/editor.api';
import { Range } from 'monaco-editor';
import './monaco';
import type { HTMLAttributes } from 'svelte/elements';
import type { Glyph } from './glyph';

interface Props extends HTMLAttributes<HTMLElement> {
  content: string;
  language: string;
  readOnly?: boolean;
  noMinimap?: boolean;
  glyphs?: Glyph[];
  onChange?: (content: string) => void;
}

let {
  content = $bindable(),
  language,
  readOnly = false,
  glyphs = [],
  onChange,
  noMinimap,
  class: className,
  ...restProps
}: Props = $props();

let editorInstance: Monaco.editor.IStandaloneCodeEditor;
let editorContainer: HTMLElement;
let decorationCollection: Monaco.editor.IEditorDecorationsCollection | undefined = $state();

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

export function updateDecorations(): void {
  if (!editorInstance?.getModel()) return;

  const model = editorInstance.getModel();
  if (!model) return;

  const decorations: Monaco.editor.IModelDeltaDecoration[] = [];

  const lines = model.getLinesContent();

  glyphs.forEach(({ regex, classes, tooltip }) => {
    const matcher = new RegExp(regex);
    lines.forEach((lineContent, index) => {
      if (lineContent === regex || matcher.test(lineContent)) {
        const lineNumber = index + 1; // Line starts at index + 1 in Monaco
        decorations.push({
          range: new Range(lineNumber, 1, lineNumber, 1),
          options: {
            isWholeLine: true,
            marginClassName: classes,
            glyphMarginHoverMessage: {
              value: tooltip,
            },
          },
        });
      }
    });
  });

  if (!decorationCollection) {
    decorationCollection = editorInstance.createDecorationsCollection(decorations);
  } else {
    // replacing
    decorationCollection.set(decorations);
  }
}

onMount(async () => {
  const terminalBg = getTerminalBg();
  const isDarkTheme: boolean = terminalBg === '#000000';

  // solution from https://github.com/vitejs/vite/discussions/1791#discussioncomment-9281911
  import('monaco-editor/esm/vs/editor/editor.api')
    .then(monaco => {
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

      editorInstance = monaco.editor.create(editorContainer, {
        value: content,
        language: language,
        automaticLayout: true,
        scrollBeyondLastLine: false,
        readOnly: readOnly,
        theme: 'podmanDesktopTheme',
        glyphMargin: true, // Enable glyph margin
        minimap: {
          enabled: !noMinimap,
        },
      });

      editorInstance.onDidChangeModelContent(() => {
        content = editorInstance.getValue();
        updateDecorations();
        onChange?.(content);
      });

      // Initial decoration setup
      updateDecorations();
    })
    .catch(console.error);
});

onDestroy(() => {
  decorationCollection?.clear();
  editorInstance?.dispose();
});
</script>

<div class="h-full w-full {className}" {...restProps} bind:this={editorContainer}></div>
