<script lang="ts">
import { type QuadletChildrenFormProps, RESOURCE_ID_QUERY } from '/@/lib/forms/quadlet/quadlet-utils';
import { networkAPI, podletAPI } from '/@/api/client';
import { router } from 'tinro';
import NetworksSelect from '/@/lib/select/NetworksSelect.svelte';
import type { SimpleNetworkInfo } from '@podman-desktop/quadlet-extension-core-api';
import { faCode } from '@fortawesome/free-solid-svg-icons/faCode';
import { Button } from '@podman-desktop/ui-svelte';

let {
  loading = $bindable(),
  provider,
  resourceId: networkId,
  onError,
  onChange,
  disabled,
  onGenerated,
  close,
}: QuadletChildrenFormProps = $props();

let networks: Array<SimpleNetworkInfo> | undefined = $state();

let generatable = $derived(!!provider && !!networkId && !disabled && !loading);

// use the query parameter resourceId
let selectedNetwork: SimpleNetworkInfo | undefined = $derived(networks?.find(n => n.id === networkId));

async function listNetworks(): Promise<void> {
  if (!provider) throw new Error('no container provider connection selected');
  loading = true;
  // reset
  networks = [];

  try {
    networks = await networkAPI.all($state.snapshot(provider));
  } catch (err: unknown) {
    onError(`Something went wrong while listing networks for provider ${provider.providerId}: ${String(err)}`);
  } finally {
    loading = false;
  }
}

function onNetworkChange(value: SimpleNetworkInfo | undefined): void {
  if (!value) {
    router.location.query.delete(RESOURCE_ID_QUERY);
    return;
  }

  router.location.query.set(RESOURCE_ID_QUERY, value.id);
  onChange();
}

function generate(): void {
  if (!provider || !networkId) return;

  loading = true;

  podletAPI
    .generateNetwork(provider, networkId)
    .then(onGenerated)
    .catch(onError)
    .finally(() => (loading = false));
}

// if we mount the component, and query parameters with all the values defined
// we need to fetch manually the networks
$effect(() => {
  if (provider?.status === 'started' && !selectedNetwork && networks === undefined && loading === false) {
    listNetworks().catch(console.error);
  }
});
</script>

<!-- network list -->
<label for="network" class="pt-4 block mb-2 font-bold text-[var(--pd-content-card-header-text)]">Networks</label>
<NetworksSelect
  disabled={loading || provider === undefined || disabled}
  onChange={onNetworkChange}
  value={selectedNetwork}
  networks={networks ?? []} />

<div class="w-full flex flex-row gap-x-2 justify-end pt-4">
  <Button type="secondary" onclick={close} title="cancel">Cancel</Button>
  <Button disabled={!generatable} inProgress={loading} icon={faCode} title="Generate" onclick={generate}
    >Generate</Button>
</div>
