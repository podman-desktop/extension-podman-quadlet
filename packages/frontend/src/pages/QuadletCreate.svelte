<script lang="ts">
import { DetailsPage, Button } from '@podman-desktop/ui-svelte';
import { router } from 'tinro';
import Fa from 'svelte-fa';
import { faPen } from '@fortawesome/free-solid-svg-icons/faPen';
import { faFileCirclePlus } from '@fortawesome/free-solid-svg-icons/faFileCirclePlus';
import { onMount } from 'svelte';
import type * as Monaco from 'monaco-editor';
import { MonacoManager } from '/@/lib/monaco-editor/monaco';
import EditableTab from '/@/lib/pagination/EditableTab.svelte';
import MonacoEditors from '/@/lib/monaco-editor/MonacoEditors.svelte';
import { dialogAPI } from '/@/api/client';

interface Props {
  templateId?: string;
  modelId?: string;
}

let { templateId, modelId }: Props = $props();

let models: Array<Monaco.editor.ITextModel> = $state([]);
let filenames: Map<string, string> = $state(new Map());

function close(): void {
  router.goto('/');
}

function getUUID(): string {
  return crypto.randomUUID();
}

onMount(async () => {
  // init models
  const monaco = await MonacoManager.getMonaco();

  // if we don't provide any templateId, let's create a basic file
  if(!templateId) {
    const model = monaco.editor.createModel('', 'ini', monaco.Uri.file(getUUID()));
    filenames.set(model.id, 'example.container');

    models.push(model);

    // Open the new model tab
    navigateToModel(model);
  }
});

function getModelFilename(model: Monaco.editor.ITextModel): string {
  const name = filenames.get(model.id);
  if(!name) {
    console.warn(`missing filename for model ${model.id}`);
    return '<unknown>';
  }
  return name;
}

function onFileDelete(model: Monaco.editor.ITextModel): void {
  // todo
}

function onFileRename(model: Monaco.editor.ITextModel): void {
  // todo
}

async function onNewFileRequest(): Promise<void> {
  const result = await dialogAPI.showInputBox({
    title: 'New File',
  });
  if(!result) return;

  // Try to get the extension to determine the language to use
  let language: string | undefined = undefined;

  // Split with latest apparition of .
  const separator = result.lastIndexOf('.');
  if(separator !== -1) {
    const extension = result.substring(separator);
    switch (extension) {
      case '.container':
      case '.image':
      case '.network':
      case '.kube':
      case '.build':
      case '.volume':
        language = 'ini';
        break;
      case '.yaml':
        language = 'yaml';
        break;
    }
  }

  const monaco = await MonacoManager.getMonaco();
  const nModel = monaco.editor.createModel('', language, monaco.Uri.file(getUUID()));
  filenames.set(nModel.id, result);
  models.push(nModel);

  // Open the new model tab
  navigateToModel(nModel);
}

function navigateToModel(model: Monaco.editor.ITextModel): void {
  router.location.query.set('modelId', model.id);
}
</script>

<DetailsPage
  title="Create"
  onclose={close}
  breadcrumbLeftPart="Quadlets"
  breadcrumbRightPart="Editor"
  breadcrumbTitle="Go back to quadlets page"
  onbreadcrumbClick={close}>
  {#snippet iconSnippet()}
    <Fa icon={faPen} />
  {/snippet}
  {#snippet tabsSnippet()}
    {#each models as model (model.id)}
      <EditableTab
        title={getModelFilename(model)}
        url="/quadlets/create?modelId={model.id}"
        selected={modelId === model.id}
        onDelete={onFileDelete.bind(undefined, model)}
        onEdit={onFileRename.bind(undefined, model)}
      />
    {/each}
    <Button type="secondary" class="!px-2" icon={faFileCirclePlus} title="New file" onclick={onNewFileRequest}/>
  {/snippet}
  {#snippet contentSnippet()}
    <!-- prevent trying to render the monaco editor BEFORE we have models -->
    {#if models.length > 0}
      <MonacoEditors models={models} modelId={modelId} noMinimap />
    {/if}
  {/snippet}
</DetailsPage>