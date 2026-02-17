<script lang="ts">
import { type QuadletChildrenFormProps, RESOURCE_ID_QUERY } from '/@/lib/forms/quadlet/quadlet-utils';
import { networkAPI } from '/@/api/client';
import { router } from 'tinro';
import NetworksSelect from '/@/lib/select/NetworksSelect.svelte';
import type { SimpleNetworkInfo } from '@podman-desktop/quadlet-extension-core-api';

let {
  loading = $bindable(),
  provider,
  resourceId: networkId,
  onError,
  onChange,
  disabled,
}: QuadletChildrenFormProps = $props();

let networks: Array<SimpleNetworkInfo> | undefined = $state();

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
