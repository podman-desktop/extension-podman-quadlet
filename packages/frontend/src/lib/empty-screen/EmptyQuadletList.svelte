<script lang="ts">
import type { ProviderContainerConnectionDetailedInfo } from '/@shared/src/models/provider-container-connection-detailed-info';
import { faArrowsRotate } from '@fortawesome/free-solid-svg-icons/faArrowsRotate';
import { Button, EmptyScreen } from '@podman-desktop/ui-svelte';
import { providerConnectionsInfo } from '/@store/connections';
import { synchronisation } from '/@store/synchronisation';

interface Props {
  connection?: ProviderContainerConnectionDetailedInfo;
  loading?: boolean;
  // actions
  refreshQuadlets: () => void;
}

let { connection, loading, refreshQuadlets }: Props = $props();

let runningConnection: number = $derived(
  $providerConnectionsInfo.reduce((accumulator, connection) => {
    if (connection.status === 'started') return ++accumulator;
    return accumulator;
  }, 0),
);

let outOfSync: boolean = $derived.by(() => {
  // if no connection selected check we have existing synchronisation
  if (!connection) return $synchronisation.length === 0 && $providerConnectionsInfo.length > 0;

  // if connection is not started we cannot sync
  if (connection.status !== 'started') return false;

  // if connection is started let's check for previous synchronisation
  return !$synchronisation.find(provider => provider.connection === connection);
});

let message: string = $derived.by(() => {
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

  return 'No Quadlet found on the system';
});
</script>

<EmptyScreen icon={faArrowsRotate} title={'No Quadlets'} message={message}>
  {#if outOfSync}
    <div class="flex flex-col">
      <Button
        icon={faArrowsRotate}
        inProgress={loading}
        disabled={loading}
        title="Refresh Quadlets"
        on:click={refreshQuadlets}>Refresh</Button>
    </div>
  {/if}
</EmptyScreen>
