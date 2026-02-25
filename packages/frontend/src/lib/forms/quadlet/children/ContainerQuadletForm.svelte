<script lang="ts">
import { type QuadletChildrenFormProps, RESOURCE_ID_QUERY } from '/@/lib/forms/quadlet/quadlet-utils';
import type { SimpleContainerInfo } from '@podman-desktop/quadlet-extension-core-api';
import { containerAPI, podletAPI } from '/@/api/client';
import { router } from 'tinro';
import ContainersSelect from '/@/lib/select/ContainersSelect.svelte';
import { faCode } from '@fortawesome/free-solid-svg-icons/faCode';
import { Button } from '@podman-desktop/ui-svelte';

let {
  loading = $bindable(),
  resourceId: containerId,
  provider,
  onError,
  onChange,
  disabled,
  onGenerated,
  close,
}: QuadletChildrenFormProps = $props();

let containers: SimpleContainerInfo[] | undefined = $state();

// use the query parameter containerId
let selectedContainer: SimpleContainerInfo | undefined = $derived(
  containers?.find(container => container.id === containerId),
);

let generatable = $derived(!!provider && !!containerId && !disabled && !loading);

async function listContainers(): Promise<void> {
  if (!provider) throw new Error('no container provider connection selected');
  loading = true;
  // reset
  containers = undefined;

  try {
    const result = await containerAPI.all($state.snapshot(provider));
    if (provider) {
      containers = result;
    }
  } catch (err: unknown) {
    onError(`Something went wrong while listing containers for provider ${provider.providerId}: ${String(err)}`);
  } finally {
    loading = false;
  }
}

function onContainerChange(value: SimpleContainerInfo | undefined): void {
  if (!value) {
    router.location.query.delete(RESOURCE_ID_QUERY);
    return;
  }

  router.location.query.set(RESOURCE_ID_QUERY, value.id);
  onChange();
}

function generate(): void {
  if (!provider || !containerId) return;

  loading = true;

  podletAPI
    .generateContainer(provider, containerId)
    .then(onGenerated)
    .catch(onError)
    .finally(() => (loading = false));
}

// if we mount the component, and query parameters with all the values defined
// we need to fetch manually the containers
$effect(() => {
  if (
    provider?.status === 'started' &&
    !selectedContainer &&
    containers === undefined &&
    loading === false &&
    !disabled
  ) {
    listContainers().catch(console.error);
  }
});
</script>

<!-- container list -->
<label for="container" class="pt-4 block mb-2 font-bold text-[var(--pd-content-card-header-text)]">Container</label>
<ContainersSelect
  disabled={loading || provider === undefined || disabled}
  onChange={onContainerChange}
  value={selectedContainer}
  containers={containers ?? []} />

<div class="w-full flex flex-row gap-x-2 justify-end pt-4">
  <Button type="secondary" onclick={close} title="cancel">Cancel</Button>
  <Button disabled={!generatable} inProgress={loading} icon={faCode} title="Generate" onclick={generate}
    >Generate</Button>
</div>
