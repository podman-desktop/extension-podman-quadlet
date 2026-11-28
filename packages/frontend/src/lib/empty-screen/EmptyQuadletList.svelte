<script lang="ts">
import type { ProviderContainerConnectionDetailedInfo } from '@podman-desktop/quadlet-extension-core-api';
import { faArrowsRotate } from '@fortawesome/free-solid-svg-icons/faArrowsRotate';
import { Button, EmptyScreen } from '@podman-desktop/ui-svelte';
import { providerConnectionsInfo } from '/@store/connections';
import { synchronisation } from '/@store/synchronisation';
import { routingAPI } from '/@/api/client';

interface Props {
  connection?: ProviderContainerConnectionDetailedInfo;
  loading?: boolean;
  disabled?: boolean;
  // actions
  refreshQuadlets: () => void;
}

let { connection, loading, disabled, refreshQuadlets }: Props = $props();

// Podman Desktop does not register any podman connection when podman is not installed (or without any podman machine)
let noPodmanConnection: boolean = $derived($providerConnectionsInfo.length === 0);

let runningConnection: number = $derived(
  $providerConnectionsInfo.reduce((accumulator, connection) => {
    if (connection.status === 'started') {
      accumulator++;
    }
    return accumulator;
  }, 0),
);

let outOfSync: boolean = $derived.by(() => {
  // if no connection selected check we have existing synchronisation
  if (!connection) return $synchronisation.length === 0 && $providerConnectionsInfo.length > 0;

  // if connection is not started we cannot sync
  if (connection.status !== 'started') return false;

  // if connection is started let's check for previous synchronisation
  return !$synchronisation.find(
    provider =>
      provider.connection.providerId === connection.providerId && provider.connection.name === connection.name,
  );
});

let title: string = $derived(noPodmanConnection ? 'Podman is required' : 'No Quadlets');

let message: string = $derived.by(() => {
  if (noPodmanConnection) {
    return 'Quadlets are managed through Podman, but no Podman connection could be found. Go to Resources to install Podman or set up a Podman machine.';
  }

  if (runningConnection === 0) {
    return 'No running connection could be found';
  }

  if (outOfSync) {
    return 'Extension is out of sync';
  }

  // if selected connection but not started
  if (connection && connection.status !== 'started') {
    return `machine ${connection.name} is not running`;
  }

  return 'No Quadlets found on your system';
});

function navigateToResources(): void {
  routingAPI.navigateToResources().catch(console.error);
}
</script>

<EmptyScreen icon={faArrowsRotate} title={title} message={message}>
  {#if noPodmanConnection}
    <div class="flex flex-col">
      <Button type="link" title="Go to Resources" on:click={navigateToResources}>Go to Resources</Button>
    </div>
  {:else if outOfSync}
    <div class="flex flex-col">
      <Button
        icon={faArrowsRotate}
        inProgress={loading}
        disabled={disabled}
        title="Refresh Quadlets"
        on:click={refreshQuadlets}>
        Refresh
      </Button>
    </div>
  {/if}
</EmptyScreen>
