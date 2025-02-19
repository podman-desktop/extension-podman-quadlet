<script lang="ts">
import { Button, Table, TableColumn, TableRow, NavPage, TableSimpleColumn } from '@podman-desktop/ui-svelte';
import type { QuadletInfo } from '/@shared/src/models/quadlet-info';
import QuadletStatus from '../lib/table/QuadletStatus.svelte';
import { dialogAPI, quadletAPI } from '../api/client';
import QuadletActions from '../lib/table/QuadletActions.svelte';
import { faArrowsRotate } from '@fortawesome/free-solid-svg-icons/faArrowsRotate';
import { quadletsInfo } from '/@store/quadlets';
import { router } from 'tinro';
import ContainerProviderConnectionSelect from '/@/lib/select/ContainerProviderConnectionSelect.svelte';
import { providerConnectionsInfo } from '/@store/connections';
import type { ProviderContainerConnectionDetailedInfo } from '/@shared/src/models/provider-container-connection-detailed-info';
import { faCode } from '@fortawesome/free-solid-svg-icons/faCode';
import MachineBadge from '/@/lib/table/MachineBadge.svelte';
import type { ProviderContainerConnectionIdentifierInfo } from '/@shared/src/models/provider-container-connection-identifier-info';
import EmptyQuadletList from '/@/lib/empty-screen/EmptyQuadletList.svelte';
import { faTrash } from '@fortawesome/free-solid-svg-icons';
import { get } from 'svelte/store';

const columns = [
  new TableColumn<QuadletInfo>('Status', {
    width: '70px',
    renderer: QuadletStatus,
    align: 'center',
    comparator: (a, b): number => a.state.localeCompare(b.state),
  }),
  new TableColumn<QuadletInfo, string>('Service name', {
    renderer: TableSimpleColumn,
    align: 'left',
    width: '200px',
    renderMapping: (quadletsInfo: QuadletInfo): string => quadletsInfo.id,
    comparator: (a, b): number => a.id.localeCompare(b.id),
  }),
  new TableColumn<QuadletInfo, ProviderContainerConnectionIdentifierInfo>('Environment', {
    renderer: MachineBadge,
    renderMapping: (quadletsInfo: QuadletInfo): ProviderContainerConnectionIdentifierInfo => quadletsInfo.connection,
    comparator: (a, b): number => a.connection.name.localeCompare(b.connection.name),
    overflow: true,
    width: '250px',
  }),
  new TableColumn<QuadletInfo, string>('Path', {
    renderer: TableSimpleColumn,
    align: 'left',
    width: '1fr',
    renderMapping: (quadletsInfo: QuadletInfo): string => quadletsInfo.path,
  }),
  new TableColumn<QuadletInfo>('Actions', { align: 'right', width: '120px', renderer: QuadletActions }),
];
const row = new TableRow<QuadletInfo>({ selectable: (_service): boolean => true });

let loading: boolean = $state(false);
// considered disable if there is no connection running or loading
let disabled: boolean = $derived(loading || !$providerConnectionsInfo.some(({ status }) => status === 'started'));

async function refreshQuadlets(): Promise<void> {
  loading = true;
  try {
    await quadletAPI.refresh();
  } finally {
    loading = false;
  }
}

// undefined mean all
let containerProviderConnection: ProviderContainerConnectionDetailedInfo | undefined = $state(undefined);
let searchTerm: string = $state('');
let selectedItemsNumber: number = $state(0);

let data: (QuadletInfo & { selected?: boolean })[] = $derived(
  $quadletsInfo.filter(quadlet => {
    let match = true;
    if (containerProviderConnection) {
      match =
        quadlet.connection.providerId === containerProviderConnection.providerId &&
        quadlet.connection.name === containerProviderConnection.name;
    }

    if (match && searchTerm.length > 0) {
      match = quadlet.id.includes(searchTerm);
    }

    return match;
  }, [] as QuadletInfo[]),
);

let empty: boolean = $derived(data.length === 0);

function navigateToGenerate(): void {
  router.goto('/quadlets/generate');
}

async function deleteSelected(): Promise<void> {
  const result = await dialogAPI.showWarningMessage(
    `Are you sure you want to delete ${selectedItemsNumber} quadlet${selectedItemsNumber > 1 ? 's' : ''}?`,
    'Confirm',
    'Cancel',
  );
  if (result !== 'Confirm') return;

  // 1. Get all the connections object
  const connections: ProviderContainerConnectionIdentifierInfo[] = get(providerConnectionsInfo);

  // 2. group quadlet by connections
  const items: Map<ProviderContainerConnectionIdentifierInfo, QuadletInfo[]> = data.reduce((accumulator, current) => {
    if (!current.selected) return accumulator;

    // Found matching connection object
    const connection = connections.find(
      connection =>
        current.connection.providerId === connection.providerId && current.connection.name === connection.name,
    );
    if (!connection) throw new Error(`cannot found connection for quadlet ${current.id}`);

    accumulator.set(connection, [...(accumulator.get(connection) ?? []), current]);
    return accumulator;
  }, new Map<ProviderContainerConnectionIdentifierInfo, QuadletInfo[]>());

  //  Let's delete everything (parallel vs iteration?)
  await Promise.all(
    Array.from(items.entries()).map(([connection, quadlets]) =>
      quadletAPI.remove(connection, ...quadlets.map(quadlet => quadlet.id)),
    ),
  );
}
</script>

<NavPage title="Podman Quadlets" searchEnabled={true} bind:searchTerm={searchTerm}>
  <svelte:fragment slot="additional-actions">
    <Button icon={faCode} disabled={disabled} title="Generate Quadlet" on:click={navigateToGenerate}
      >Generate Quadlet</Button>
    <Button
      icon={faArrowsRotate}
      inProgress={loading}
      disabled={disabled}
      title="Refresh Quadlets"
      on:click={refreshQuadlets}>Refresh</Button>
  </svelte:fragment>
  <svelte:fragment slot="bottom-additional-actions">
    <div class="w-full flex justify-between">
      <div class="flex flex-row items-center space-x-2">
        {#if selectedItemsNumber > 0}
          <Button
            on:click={deleteSelected}
            title="Delete {selectedItemsNumber} selected items"
            inProgress={loading}
            icon={faTrash} />
          <span>On {selectedItemsNumber} selected items.</span>
        {/if}
      </div>
      <div class="w-[250px]">
        <ContainerProviderConnectionSelect
          bind:value={containerProviderConnection}
          containerProviderConnections={$providerConnectionsInfo} />
      </div>
    </div>
  </svelte:fragment>
  <svelte:fragment slot="content">
    {#if !empty}
      <Table
        kind="quadlets"
        data={data}
        columns={columns}
        row={row}
        bind:selectedItemsNumber={selectedItemsNumber}
        defaultSortColumn="Environment" />
    {:else}
      <EmptyQuadletList
        connection={containerProviderConnection}
        refreshQuadlets={refreshQuadlets}
        loading={loading}
        disabled={disabled} />
    {/if}
  </svelte:fragment>
</NavPage>
