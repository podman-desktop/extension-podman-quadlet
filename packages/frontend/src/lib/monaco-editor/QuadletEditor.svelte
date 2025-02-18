<script lang="ts">
import MonacoEditor from '/@/lib/monaco-editor/MonacoEditor.svelte';
import { quadletAPI } from '/@/api/client';
import type { Glyph } from '/@/lib/monaco-editor/glyph';
import { debounce } from '/@/utils/debounce';

interface Props {
  content: string;
  validate: boolean;
  readOnly?: boolean;
}

let { content = $bindable(), validate, readOnly }: Props = $props();

let glyphs: Glyph[] = $state([]);
let editor: MonacoEditor;
let requestId = 0;

function onValidate(nContent: string): void {
  if (!validate) return;
  const current = ++requestId;

  quadletAPI
    .validate($state.snapshot(nContent))
    .then(checks => {
      glyphs = checks.map(check => ({
        tooltip: check.message,
        classes: 'fa-solid fa-circle-exclamation monaco-glyph',
        regex: check.line,
      }));
    })
    .catch((err: unknown) => {
      if (current === requestId - 1) {
        console.debug('validate error', err);
        glyphs = []; // cleanup
      }
    })
    .finally(() => {
      // force update the decorations
      editor.updateDecorations();
    });
}
</script>

<MonacoEditor
  bind:this={editor}
  class="h-full"
  glyphs={glyphs}
  onChange={debounce(onValidate)}
  readOnly={readOnly}
  noMinimap
  bind:content={content}
  language="ini" />
