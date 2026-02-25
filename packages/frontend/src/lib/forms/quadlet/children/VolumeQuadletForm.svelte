<script lang="ts">
import { type QuadletChildrenFormProps, RESOURCE_ID_QUERY } from '/@/lib/forms/quadlet/quadlet-utils';
import { podletAPI, volumeAPI } from '/@/api/client';
import { router } from 'tinro';
import VolumesSelect from '/@/lib/select/VolumesSelect.svelte';
import type { SimpleVolumeInfo } from '@podman-desktop/quadlet-extension-core-api';
import { faCode } from '@fortawesome/free-solid-svg-icons/faCode';
import { Button } from '@podman-desktop/ui-svelte';

let {
  loading = $bindable(),
  provider,
  resourceId: volumeName,
  onError,
  onChange,
  disabled,
  onGenerated,
}: QuadletChildrenFormProps = $props();

let volumes: Array<SimpleVolumeInfo> | undefined = $state();

// use the query parameter volumeName
let selectedVolume: SimpleVolumeInfo | undefined = $derived(volumes?.find(v => v.name === volumeName));

let generatable = $derived(!!provider && !!volumeName && !disabled && !loading);

async function listVolumes(): Promise<void> {
  if (!provider) throw new Error('no container provider connection selected');
  loading = true;
  // reset
  volumes = [];

  try {
    volumes = await volumeAPI.all($state.snapshot(provider));
  } catch (err: unknown) {
    onError(`Something went wrong while listing volumes for provider ${provider.providerId}: ${String(err)}`);
  } finally {
    loading = false;
  }
}

function onVolumeChange(value: SimpleVolumeInfo | undefined): void {
  if (!value) {
    router.location.query.delete(RESOURCE_ID_QUERY);
    return;
  }

  router.location.query.set(RESOURCE_ID_QUERY, value.name);
  onChange();
}

function generate(): void {
  if (!provider || !volumeName) return;

  loading = true;

  podletAPI
    .generateVolume(provider, volumeName)
    .then(onGenerated)
    .catch(onError)
    .finally(() => (loading = false));
}

// if we mount the component, and query parameters with all the values defined
// we need to fetch manually the volumes
$effect(() => {
  if (provider?.status === 'started' && !selectedVolume && volumes === undefined && loading === false) {
    listVolumes().catch(console.error);
  }
});
</script>

<!-- volume list -->
<label for="volume" class="pt-4 block mb-2 font-bold text-[var(--pd-content-card-header-text)]">Volumes</label>
<VolumesSelect
  disabled={loading || provider === undefined || disabled}
  onChange={onVolumeChange}
  value={selectedVolume}
  volumes={volumes ?? []} />

<div class="w-full flex flex-row gap-x-2 justify-end pt-4">
  <Button type="secondary" onclick={close} title="cancel">Cancel</Button>
  <Button disabled={!generatable} inProgress={loading} icon={faCode} title="Generate" onclick={generate}
    >Generate</Button>
</div>
