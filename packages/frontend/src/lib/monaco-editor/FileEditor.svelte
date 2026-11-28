<script lang="ts">
import MonacoEditor from '/@/lib/monaco-editor/MonacoEditor.svelte';
import { quadletAPI } from '/@/api/client';
import { onMount } from 'svelte';
import { Button, ErrorMessage } from '@podman-desktop/ui-svelte';
import { faRotateRight } from '@fortawesome/free-solid-svg-icons/faRotateRight';
import EditorOverlay from '/@/lib/forms/EditorOverlay.svelte';
import { isFileNotFoundError } from '@podman-desktop/quadlet-extension-core-api';
import type { ProviderContainerConnectionIdentifierInfo } from '@podman-desktop/quadlet-extension-core-api';
import { getLanguageFromPath } from '/@/lib/monaco-editor/language';

interface Props {
  connection: ProviderContainerConnectionIdentifierInfo;
  path: string;
  loading: boolean;
}

let { path, connection, loading = $bindable() }: Props = $props();

let originalContent: string | undefined = $state(undefined);
let currentContent: string | undefined = $state(undefined);

let language: string = $derived(getLanguageFromPath(path));

let error: string | undefined = $state(undefined);
// true when the file does not exist yet, it will be created on save
let isNew: boolean = $state(false);
let contentChanged: boolean = $derived(originalContent !== currentContent);

async function pull(): Promise<void> {
  loading = true;
  try {
    originalContent = await quadletAPI.readIntoMachine({
      path: path,
      connection: $state.snapshot(connection),
    });

    currentContent = originalContent;
    error = undefined;
    isNew = false;
  } catch (err: unknown) {
    console.error(err);
    if (isFileNotFoundError(err)) {
      // like an editor opening a file which does not exist yet: start from an empty content
      originalContent = undefined;
      currentContent = '';
      error = undefined;
      isNew = true;
    } else {
      error = `Something went wrong: ${String(err)}`;
    }
  } finally {
    loading = false;
  }
}

async function saveKube(): Promise<void> {
  if (!path || currentContent === undefined) return;

  loading = true;
  try {
    await quadletAPI.writeIntoMachine({
      connection: connection,
      files: [
        {
          content: currentContent,
          filename: path,
        },
      ],
      // prevent reloading systemd
      skipSystemdDaemonReload: true,
    });
    // apply to original content
    originalContent = currentContent;
    error = undefined;
    await pull(); // reload
  } catch (err: unknown) {
    console.error(err);
    error = `Something went wrong: ${String(err)}`;
  } finally {
    loading = false;
  }
}

onMount(() => {
  pull().catch(console.error);
});

function onchange(content: string): void {
  currentContent = content;
}
</script>

<div class="flex py-2 h-[40px] gap-x-2">
  <span class="block w-auto text-sm font-medium whitespace-nowrap leading-6 text-[var(--pd-content-text)] pl-2 pr-2">
    <Button icon={faRotateRight} padding="px-2" disabled={loading} title="Reload file" on:click={pull}>Reload</Button>
  </span>
  <span
    aria-label="file path"
    class="block w-auto text-sm font-medium whitespace-nowrap leading-6 text-[var(--pd-content-text)] pl-2 pr-2">
    {path}
  </span>
</div>
{#if error}
  <ErrorMessage error={error} />
{/if}
{#if isNew && !error}
  <div aria-label="new file notice" class="px-4 pb-2 text-sm text-[var(--pd-content-text)]">
    This file does not exist yet, it will be created when you save.
  </div>
{/if}
{#if !loading && currentContent !== undefined && !error}
  <EditorOverlay save={saveKube} loading={loading} changed={contentChanged} />
  <MonacoEditor class="h-full" content={currentContent} onChange={onchange} language={language} />
{/if}
