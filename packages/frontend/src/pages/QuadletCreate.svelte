<script lang="ts">
import { DetailsPage, Button } from '@podman-desktop/ui-svelte';
import { router } from 'tinro';
import { faFileCirclePlus } from '@fortawesome/free-solid-svg-icons/faFileCirclePlus';
import { onMount } from 'svelte';
import type * as Monaco from 'monaco-editor';
import { MonacoManager } from '/@/lib/monaco-editor/monaco';
import EditableTab from '/@/lib/pagination/EditableTab.svelte';
import MonacoEditors from '/@/lib/monaco-editor/MonacoEditors.svelte';
import { dialogAPI, quadletAPI } from '/@/api/client';
import { faTruckPickup } from '@fortawesome/free-solid-svg-icons/faTruckPickup';
import EditorOverlay from '/@/lib/forms/EditorOverlay.svelte';
import { TextModelStorage } from '/@/utils/text-model-storage';
import ContainerProviderConnectionSelect from '/@/lib/select/ContainerProviderConnectionSelect.svelte';
import type { ProviderContainerConnectionDetailedInfo } from '/@shared/src/models/provider-container-connection-detailed-info';
import { providerConnectionsInfo } from '/@store/connections';
import ProgressBar from '/@/lib/progress/ProgressBar.svelte';
import { findLanguage } from '/@/utils/language-utils';

interface Props {
  modelId?: string;
}

let { modelId }: Props = $props();

let loading: boolean = $state(false);
let containerProviderConnection: ProviderContainerConnectionDetailedInfo | undefined = $state(undefined);

// Map filename => Monaco model
let files: TextModelStorage = new TextModelStorage();

function close(): void {
  router.goto('/');
}

onMount(async () => {
  try {
    loading = true;
    // init models
    const monaco = await MonacoManager.getMonaco();

    // restore if any
    files.restore(monaco);

    if (files.size === 0) {
      const model = monaco.editor.createModel('# Hello', 'ini');
      files.set('example.container', model);
    }

    // Open the new model tab
    if (files.size > 0) {
      navigateToModel(Array.from(files.values())[0]);
    }
  } finally {
    loading = false;
  }
});

function getModelFilename(model: Monaco.editor.ITextModel): string {
  return files.getName(model);
}

function disposeModel(model: Monaco.editor.ITextModel, redirect = true): void {
  const filename = getModelFilename(model);

  // delete entry
  files.delete(filename);
  model.dispose();

  if (redirect && modelId === model.id) {
    if (files.size === 0) {
      router.location.query.delete('modelId');
    } else {
      navigateToModel(Array.from(files.values())[0]);
    }
  }
}

async function onFileDelete(model: Monaco.editor.ITextModel): Promise<void> {
  // ask user confirmation
  const result = await dialogAPI.showWarningMessage(
    `Are you sure you want to delete ${getModelFilename(model)}?`,
    'Cancel',
    'Confirm',
  );

  if (result !== 'Confirm') return;

  disposeModel(model);
}

async function onFileRename(model: Monaco.editor.ITextModel): Promise<void> {
  const filename = getModelFilename(model);
  const result = await dialogAPI.showInputBox({
    title: `Rename ${filename}`,
    value: filename,
  });
  if (!result || filename === result) return;

  // ensure no file names are duplicated
  if (files.has(result)) {
    await dialogAPI.showInformationMessage(`You cannot have multiple files named the same`, 'OK');
    return;
  }

  files.rename(filename, result);
}

async function onNewFileRequest(): Promise<void> {
  const result = await dialogAPI.showInputBox({
    title: 'New File',
  });
  if (!result) return;

  // ensure no file names are duplicated
  if (files.has(result)) {
    await dialogAPI.showInformationMessage(`You cannot have multiple files named the same`, 'OK');
    return;
  }

  // Try to get the extension to determine the language to use
  let language: string | undefined = findLanguage(result);

  const monaco = await MonacoManager.getMonaco();
  const nModel = monaco.editor.createModel('', language);
  files.set(result, nModel);

  // Open the new model tab
  navigateToModel(nModel);
}

function navigateToModel(model: Monaco.editor.ITextModel): void {
  router.location.query.set('modelId', model.id);
}

async function loadIntoMachine(): Promise<void> {
  if (!containerProviderConnection) return;

  loading = true;
  try {
    await quadletAPI.writeIntoMachine({
      connection: $state.snapshot(containerProviderConnection),
      files: Array.from(files.entries()).map(([filename, model]) => ({
        filename: filename,
        content: model.getValue(),
      })),
    });
    //
    router.goto('/');
    localStorage.clear();
    files.clear();
  } catch (err: unknown) {
    console.error(err);
  } finally {
    loading = false;
  }
}
</script>

<DetailsPage
  title="Create"
  onclose={close}
  breadcrumbLeftPart="Quadlets"
  breadcrumbRightPart="Editor"
  breadcrumbTitle="Go back to quadlets page"
  onbreadcrumbClick={close}>
  <!-- ACTIONS -->
  {#snippet actionsSnippet()}
    <div class="w-[250px]">
      <ContainerProviderConnectionSelect
        bind:value={containerProviderConnection}
        containerProviderConnections={$providerConnectionsInfo} />
    </div>
  {/snippet}
  <!-- TABS -->
  {#snippet tabsSnippet()}
    {#each files as [filename, model] (filename)}
      <EditableTab
        title={getModelFilename(model)}
        url="/quadlets/create?modelId={model.id}"
        selected={modelId === model.id}
        onDelete={onFileDelete.bind(undefined, model)}
        onEdit={onFileRename.bind(undefined, model)} />
    {/each}
    <Button type="secondary" class="!px-2" icon={faFileCirclePlus} title="New file" onclick={onNewFileRequest} />
  {/snippet}
  <!-- BODY -->
  {#snippet contentSnippet()}
    <!-- loading indicator -->
    <div class="h-0.5">
      <!-- avoid flickering -->
      {#if loading}
        <ProgressBar class="w-full h-0.5" width="w-full" height="h-0.5" />
      {/if}
    </div>

    <!-- overlay -->
    <EditorOverlay
      actions={[
        {
          id: 'load-into-machine',
          label: 'Load Into Machine',
          tooltip: 'Load files into machine',
          icon: faTruckPickup,
        },
      ]}
      onclick={loadIntoMachine}
      disabled={loading || files.size === 0 || !containerProviderConnection}
      loading={loading} />
    <!-- prevent trying to render the monaco editor BEFORE we have models -->
    {#if files.size > 0}
      <MonacoEditors models={Array.from(files.values())} modelId={modelId} noMinimap />
    {/if}
  {/snippet}
</DetailsPage>
