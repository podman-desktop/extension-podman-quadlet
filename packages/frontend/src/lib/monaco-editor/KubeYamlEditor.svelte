<script lang="ts">
import MonacoEditor from '/@/lib/monaco-editor/MonacoEditor.svelte';
import { quadletAPI } from '/@/api/client';
import { onMount } from 'svelte';
import type { QuadletInfo } from '/@shared/src/models/quadlet-info';
import type { QuadletType } from '/@shared/src/utils/quadlet-type';
import { ErrorMessage, Button } from '@podman-desktop/ui-svelte';
import { faRotateRight } from '@fortawesome/free-solid-svg-icons/faRotateRight';

interface Props {
  quadlet: QuadletInfo & { type: QuadletType.KUBE };
  loading: boolean;
}

let { quadlet, loading = $bindable() }: Props = $props();

let content: string | undefined = $state(undefined);
let error: string | undefined = $state(undefined);

async function pull(): Promise<void> {
  loading = true;
  try {
    content = await quadletAPI.getKubeYAML(quadlet.connection, quadlet.id);
    error = undefined;
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
</script>

<div class="flex py-2 h-[40px]">
  <span class="block w-auto text-sm font-medium whitespace-nowrap leading-6 text-[var(--pd-content-text)] pl-2 pr-2">
    <Button icon={faRotateRight} padding="px-2" disabled={loading} title="reload file" on:click={pull}>Reload</Button>
  </span>
</div>
{#if error}
  <ErrorMessage error={error} />
{/if}
{#if !loading && content && !error}
  <MonacoEditor class="h-full" readOnly={true} bind:content={content} language="yaml" />
{/if}
