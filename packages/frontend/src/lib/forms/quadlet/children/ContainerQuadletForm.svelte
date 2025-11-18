<script lang="ts">
import { type QuadletChildrenFormProps, RESOURCE_ID_QUERY } from '/@/lib/forms/quadlet/quadlet-utils';
import type { SimpleContainerInfo } from '/@shared/src/models/simple-container-info';
import { containerAPI } from '/@/api/client';
import { router } from 'tinro';
import ContainersSelect from '/@/lib/select/ContainersSelect.svelte';
import { Checkbox } from '@podman-desktop/ui-svelte';
import type { ContainerGenerateOptions } from '/@shared/src/models/quadlet-generate-options';
import { QuadletType } from '/@shared/src/utils/quadlet-type';

let {
  loading = $bindable(),
  resourceId: containerId,
  provider,
  onError,
  onChange,
  disabled,
}: QuadletChildrenFormProps = $props();

let containers: SimpleContainerInfo[] | undefined = $state();

const QUERY_WANTED_BY = 'container:wanted-by';
function getContainerGenerateOptions(): ContainerGenerateOptions {
  let wantedBy: string | undefined = undefined;
  if (router.location.query.get(QUERY_WANTED_BY)) {
    wantedBy = String(router.location.query.get(QUERY_WANTED_BY));
  }

  return {
    type: QuadletType.CONTAINER,
    wantedBy: wantedBy,
  };
}

let options: ContainerGenerateOptions = $state(getContainerGenerateOptions());

// use the query parameter containerId
let selectedContainer: SimpleContainerInfo | undefined = $derived(
  containers?.find(container => container.id === containerId),
);

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
  onChange(options);
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

function onStartOnBootChange(checked: boolean): void {
  options.wantedBy = checked ? 'default.target' : undefined;
  if (options.wantedBy) {
    router.location.query.set(QUERY_WANTED_BY, options.wantedBy);
  } else {
    router.location.query.delete(QUERY_WANTED_BY);
  }
  onChange(options);
}
</script>

<!-- container list -->
<label for="container" class="pt-4 block mb-2 font-bold text-[var(--pd-content-card-header-text)]">Container</label>
<ContainersSelect
  disabled={loading || provider === undefined || disabled}
  onChange={onContainerChange}
  value={selectedContainer}
  containers={containers ?? []} />

<div class="pt-4">
  <div class="text-base font-bold text-(--pd-content-card-header-text)">Options</div>
  <Checkbox
    class="mx-1 my-auto"
    title="Start on boot"
    disabled={loading || provider === undefined || disabled}
    checked={options.wantedBy === 'default.target'}
    onclick={onStartOnBootChange}>
    <div>Start on boot</div>
  </Checkbox>
</div>
