<script lang="ts">
import { onDestroy, onMount } from 'svelte';
import type * as Monaco from 'monaco-editor/esm/vs/editor/editor.api';
import type { HTMLAttributes } from 'svelte/elements';
import { MonacoManager } from '/@/lib/monaco-editor/monaco';

interface Props extends HTMLAttributes<HTMLElement> {
  readOnly?: boolean;
  noMinimap?: boolean;
  models: Array<Monaco.editor.ITextModel>;
  modelId?: string;
}

let {
  readOnly = false,
  noMinimap,
  class: className,
  models: modelsArray,
  modelId,
  ...restProps
}: Props = $props();

let editorInstance: Monaco.editor.IStandaloneCodeEditor | undefined;
let editorContainer: HTMLElement;
let decorationCollection: Monaco.editor.IEditorDecorationsCollection | undefined = $state();

let models: Map<string, Monaco.editor.ITextModel> = $derived(new Map(modelsArray.map(model => [model.id, model])));

$effect(() => {
  // if modelId is undefined or current modelId is already selected
  if (!modelId || !editorInstance || editorInstance.getModel()?.id === modelId) return;

  const request = models.get(modelId);
  if (!request) return;
  editorInstance.setModel(request);
});

onMount(async () => {
  const monaco = await MonacoManager.getMonaco();

  let model: Monaco.editor.ITextModel | undefined;
  if (modelId) {
    model = models.get(modelId);
  }

  editorInstance = monaco.editor.create(editorContainer, {
    model,
    automaticLayout: true,
    scrollBeyondLastLine: false,
    readOnly: readOnly,
    theme: MonacoManager.getThemeName(),
    minimap: {
      enabled: !noMinimap,
    },
  });
});

onDestroy(() => {
  decorationCollection?.clear();
  editorInstance?.dispose();
});
</script>

<div class="h-full w-full {className}" {...restProps} bind:this={editorContainer}></div>
