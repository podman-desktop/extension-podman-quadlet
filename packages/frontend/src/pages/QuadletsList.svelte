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
import QuadletName from '/@/lib/table/QuadletName.svelte';
import { isTemplateQuadlet } from '/@shared/src/models/template-quadlet';
import { isTemplateInstanceQuadlet } from '/@shared/src/models/template-instance-quadlet';

type SelectableQuadletInfo = QuadletInfo & { selected?: boolean };

const columns = [
  new TableColumn<QuadletInfo>('Status', {
    width: '70px',
    renderer: QuadletStatus,
    align: 'center',
    comparator: (a, b): number => a.state.localeCompare(b.state),
  }),
  new TableColumn<QuadletInfo>('Service name', {
    renderer: QuadletName,
    align: 'left',
    width: '200px',
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

const row = new TableRow<SelectableQuadletInfo>({
  selectable: (_service): boolean => true,
  // for template quadlets return template instance
  children: (quadlet: QuadletInfo): Array<QuadletInfo> => {
    if (isTemplateQuadlet(quadlet)) {
      return templateInstances.get(getTemplateKey(quadlet)) ?? [];
    }
    return [];
  },
});

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

const SELECTED_PROVIDER_KEY = 'quadlets.selectedContainerProvider';

// Track the initial value after restoration to detect user changes
let initialProviderAfterRestore: ProviderContainerConnectionDetailedInfo | undefined = $state(undefined);
let hasCompletedRestore = $state(false);

// Apply stored selection when provider list becomes available (reactive to `$providerConnectionsInfo`).
$effect(() => {
  // Always read the providers to ensure this effect reacts to changes
  const providers = $providerConnectionsInfo;

  // Skip if we've already completed restoration (to avoid overriding user selection)
  if (hasCompletedRestore) return;

  // If there's a stored selection, try to apply it; only then fall back to first started provider.
  const raw = localStorage.getItem(SELECTED_PROVIDER_KEY);
  if (!raw) {
    // No stored preference, mark as completed so we start persisting future user changes
    initialProviderAfterRestore = containerProviderConnection;
    hasCompletedRestore = true;
    return;
  }

  try {
    const stored = JSON.parse(raw) as { providerId: string; name: string };
    const found = providers.find(
      p => p.providerId === stored.providerId && p.name === stored.name,
    );
    if (found) {
      containerProviderConnection = found;
      initialProviderAfterRestore = found;
      hasCompletedRestore = true; // successfully restored
      return;
    }
  } catch {
    // ignore parse errors
  }

  // stored item existed but didn't match; fallback to first started provider if available
  const fallback = providers.find(p => p.status === 'started');
  if (fallback) {
    containerProviderConnection = fallback;
    initialProviderAfterRestore = fallback;
    hasCompletedRestore = true; // fallback applied
  }
  // If no fallback found yet, wait for providers to populate (don't mark as completed)
});

// Persist selection to localStorage (but only after restoration is complete AND value has changed)
$effect(() => {
  if (!hasCompletedRestore) return;

  // Only persist if the value has changed from the initial restored value
  if (containerProviderConnection === initialProviderAfterRestore) return;

  if (containerProviderConnection) {
    try {
      localStorage.setItem(
        SELECTED_PROVIDER_KEY,
        JSON.stringify({ providerId: containerProviderConnection.providerId, name: containerProviderConnection.name }),
      );
    } catch {}
  } else {
    try {
      localStorage.removeItem(SELECTED_PROVIDER_KEY);
    } catch {}
  }

  // Update the baseline so subsequent changes are also persisted
  initialProviderAfterRestore = containerProviderConnection;
})

/**
 * A template name may appear in multiple container connections.
 * To be able to uniquely identify it, we should create a key based on the connection and the template name
 * @param template
 * @param connection
 */
function getTemplateKey({
  template,
  connection,
}: {
  template: string;
  connection: ProviderContainerConnectionIdentifierInfo;
}): string {
  return `${connection.providerId}-${connection.name}:${template}`;
}

// keep a reference of existing templates
let templates: Set<string> = $derived(
  $quadletsInfo.reduce((accumulator, quadlet) => {
    if (isTemplateQuadlet(quadlet)) {
      accumulator.add(getTemplateKey(quadlet));
    }
    return accumulator;
  }, new Set<string>()),
);

// templateName => quadlet instances
let templateInstances: Map<string, Array<QuadletInfo>> = $derived.by(() => {
  return Map.groupBy(
    $quadletsInfo.filter(quadlet => isTemplateInstanceQuadlet(quadlet)),
    getTemplateKey,
  );
});

let data: Array<SelectableQuadletInfo> = $derived(
  $quadletsInfo.filter(quadlet => {
    // do not display template instances
    // special case: if a template instance does not have a parent, we show it
    if (isTemplateInstanceQuadlet(quadlet) && templates.has(getTemplateKey(quadlet))) {
      return false;
    }

    let match = true;

    // filter base on container provider connection
    if (containerProviderConnection) {
      match =
        quadlet.connection.providerId === containerProviderConnection.providerId &&
        quadlet.connection.name === containerProviderConnection.name;
    }

    if (match && searchTerm.length > 0) {
      match = quadlet.path.toLowerCase().includes(searchTerm.toLowerCase()) ?? false;
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

function getQuadletInfoKey({ id }: QuadletInfo): string {
  return id;
}
</script>

<NavPage title="Podman Quadlets" searchEnabled={true} bind:searchTerm={searchTerm}>
  {#snippet additionalActions()}
    <Button icon={faCode} disabled={disabled} title="Generate Quadlet" on:click={navigateToGenerate}
      >Generate Quadlet</Button>
    <Button
      icon={faArrowsRotate}
      inProgress={loading}
      disabled={disabled}
      title="Refresh Quadlets"
      on:click={refreshQuadlets}>Refresh</Button>
  {/snippet}
  {#snippet bottomAdditionalActions()}
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
  {/snippet}
  {#snippet content()}
    {#if !empty}
      <Table
        kind="quadlets"
        data={data}
        columns={columns}
        row={row}
        bind:selectedItemsNumber={selectedItemsNumber}
        key={getQuadletInfoKey}
        defaultSortColumn="Environment" />
    {:else}
      <EmptyQuadletList
        connection={containerProviderConnection}
        refreshQuadlets={refreshQuadlets}
        loading={loading}
        disabled={disabled} />
    {/if}
  {/snippet}
</NavPage>
