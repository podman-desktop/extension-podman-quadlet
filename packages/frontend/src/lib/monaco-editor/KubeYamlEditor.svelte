<script lang="ts">
import MonacoEditor from '/@/lib/monaco-editor/MonacoEditor.svelte';
import { quadletAPI } from '/@/api/client';
import { onMount } from 'svelte';
import type { QuadletInfo } from '/@shared/src/models/quadlet-info';
import type { QuadletType } from '/@shared/src/utils/quadlet-type';
import { ErrorMessage, Button } from '@podman-desktop/ui-svelte';
import { faRotateRight } from '@fortawesome/free-solid-svg-icons/faRotateRight';
import EditorOverlay from '/@/lib/forms/EditorOverlay.svelte';

interface Props {
  quadlet: QuadletInfo & { type: QuadletType.KUBE };
  loading: boolean;
}

let { quadlet, loading = $bindable() }: Props = $props();

let originalContent: string | undefined = $state(undefined);
let kubeContent: string | undefined = $state(undefined);
let error: string | undefined = $state(undefined);
let kubeChanged: boolean = $derived(originalContent !== kubeContent);

let yamlPath: string | undefined = $state(undefined);

async function pull(): Promise<void> {
  loading = true;
  try {
    const result = await quadletAPI.getKubeYAML(quadlet.connection, quadlet.id);
    originalContent = result.content;
    yamlPath = result.path;

    kubeContent = originalContent;
    error = undefined;
  } catch (err: unknown) {
    console.error(err);
    error = `Something went wrong: ${String(err)}`;
  } finally {
    loading = false;
  }
}

async function saveKube(): Promise<void> {
  if (!yamlPath || !kubeContent) return;

  loading = true;
  try {
    await quadletAPI.writeIntoMachine({
      connection: quadlet.connection,
      files: [
        {
          content: kubeContent,
          filename: yamlPath,
        },
      ],
      // prevent reloading systemd
      skipSystemdDaemonReload: true,
    });
    // apply to original content
    originalContent = kubeContent;
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
  kubeContent = content;
}
</script>

<div class="flex py-2 h-[40px] gap-x-2">
  <span class="block w-auto text-sm font-medium whitespace-nowrap leading-6 text-[var(--pd-content-text)] pl-2 pr-2">
    <Button icon={faRotateRight} padding="px-2" disabled={loading} title="Reload file" on:click={pull}>Reload</Button>
  </span>
  <span
    aria-label="kube path"
    class="block w-auto text-sm font-medium whitespace-nowrap leading-6 text-[var(--pd-content-text)] pl-2 pr-2">
    {quadlet.path}
  </span>
</div>
{#if error}
  <ErrorMessage error={error} />
{/if}
{#if !loading && kubeContent && !error}
  <EditorOverlay save={saveKube} loading={loading} changed={kubeChanged} />
  <MonacoEditor class="h-full" content={kubeContent} onChange={onchange} language="yaml" />
{/if}
