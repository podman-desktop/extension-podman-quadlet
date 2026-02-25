<script lang="ts">
import { type QuadletChildrenFormProps, RESOURCE_ID_QUERY } from '/@/lib/forms/quadlet/quadlet-utils';
import { podAPI, podletAPI } from '/@/api/client';
import { router } from 'tinro';
import PodsSelect from '/@/lib/select/PodsSelect.svelte';
import type { SimplePodInfo } from '@podman-desktop/quadlet-extension-core-api';
import { faCode } from '@fortawesome/free-solid-svg-icons/faCode';
import { Button } from '@podman-desktop/ui-svelte';

let {
  loading = $bindable(),
  provider,
  resourceId: podId,
  onError,
  onChange,
  disabled,
  onGenerated,
}: QuadletChildrenFormProps = $props();

let pods: Array<SimplePodInfo> | undefined = $state();

// use the query parameter containerId
let selectedPod: SimplePodInfo | undefined = $derived(pods?.find(pod => pod.id === podId));

let generatable = $derived(!!provider && !!podId && !disabled && !loading);

async function listPods(): Promise<void> {
  if (!provider) throw new Error('no container provider connection selected');
  loading = true;
  // reset
  pods = [];

  try {
    pods = await podAPI.all($state.snapshot(provider));
  } catch (err: unknown) {
    onError(`Something went wrong while listing pods for provider ${provider.providerId}: ${String(err)}`);
  } finally {
    loading = false;
  }
}

function onPodChange(value: SimplePodInfo | undefined): void {
  if (!value) {
    router.location.query.delete(RESOURCE_ID_QUERY);
    return;
  }

  router.location.query.set(RESOURCE_ID_QUERY, value.id);
  onChange();
}

function generate(): void {
  if (!provider || !podId) return;

  loading = true;

  podletAPI
    .generatePod(provider, podId)
    .then(onGenerated)
    .catch(onError)
    .finally(() => (loading = false));
}

// if we mount the component, and query parameters with all the values defined
// we need to fetch manually the containers
$effect(() => {
  if (provider?.status === 'started' && !selectedPod && pods === undefined && loading === false) {
    listPods().catch(console.error);
  }
});
</script>

<!-- pod list -->
<label for="pod" class="pt-4 block mb-2 font-bold text-[var(--pd-content-card-header-text)]">Pods</label>
<PodsSelect
  disabled={loading || provider === undefined || disabled}
  onChange={onPodChange}
  value={selectedPod}
  pods={pods ?? []} />

<div class="w-full flex flex-row gap-x-2 justify-end pt-4">
  <Button type="secondary" onclick={close} title="cancel">Cancel</Button>
  <Button disabled={!generatable} inProgress={loading} icon={faCode} title="Generate" onclick={generate}
    >Generate</Button>
</div>
