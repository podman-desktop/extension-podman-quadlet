<script lang="ts">
import type { QuadletInfo } from '/@shared/src/models/quadlet-info';
import { quadletsInfo } from '/@store/quadlets';
import { DetailsPage, Tab } from '@podman-desktop/ui-svelte';
import { router } from 'tinro';
import Route from '/@/lib/Route.svelte';
import { onMount, onDestroy } from 'svelte';
import { loggerAPI, quadletAPI, rpcBrowser } from '/@/api/client';
import ProgressBar from '/@/lib/progress/ProgressBar.svelte';
import MonacoEditor from '/@/lib/monaco-editor/MonacoEditor.svelte';
import QuadletActions from '/@/lib/table/QuadletActions.svelte';
import QuadletStatus from '/@/lib/QuadletStatus.svelte';
import { LoggerStore } from '/@store/logger-store';
import XTerminal from '/@/lib/terminal/XTerminal.svelte';

interface Props {
  id: string;
  providerId: string;
  connection: string;
}

let { id, providerId, connection }: Props = $props();

let loading: boolean = $state(true);
let quadletSource: string | undefined = $state(undefined);

// found matching quadlets
let quadlet: QuadletInfo | undefined = $derived(
  $quadletsInfo.find(
    quadlet =>
      quadlet.id === id && quadlet.connection.name === connection && quadlet.connection.providerId === providerId,
  ),
);

export function close(): void {
  router.goto('/');
}

$effect(() => {
  // redirect to quadlet list if ni quadlet info is found
  if (!quadlet) router.goto('/');
});

onMount(async () => {
  try {
    quadletSource = await quadletAPI.read(
      {
        name: connection,
        providerId: providerId,
      },
      id,
    );
  } catch (err: unknown) {
    console.error(err);
  } finally {
    loading = false;
  }

  // create logger
  createLogger().catch(console.error);
});

let logger: LoggerStore | undefined = $state();

async function createLogger(): Promise<void> {
  if (!quadlet) throw new Error('Quadlets not found');

  const loggerId = await quadletAPI.createLogger({
    quadletId: quadlet.id,
    connection: {
      providerId: providerId,
      name: connection,
    },
  });

  // creating logger subscriber
  logger = new LoggerStore({
    loggerId: loggerId,
    rpcBrowser: rpcBrowser,
    loggerAPI: loggerAPI,
  });
  return logger.init();
}

onDestroy(() => {
  logger?.dispose();
  logger = undefined;
});
</script>

{#if quadlet}
  <DetailsPage
    title={quadlet.id}
    onclose={close}
    breadcrumbLeftPart="Quadlets"
    breadcrumbRightPart={quadlet.id}
    breadcrumbTitle="Go back to quadlets page"
    onbreadcrumbClick={close}>
    <svelte:fragment slot="actions">
      <QuadletActions object={quadlet} />
    </svelte:fragment>
    <svelte:fragment slot="tabs">
      <!-- generated tab -->
      <Tab
        title="Generated"
        url="/quadlets/{providerId}/{connection}/{id}"
        selected={$router.path === `/quadlets/${providerId}/${connection}/${id}`} />
      <!-- source tab -->
      <Tab
        title="Source"
        url="/quadlets/{providerId}/{connection}/{id}/source"
        selected={$router.path === `/quadlets/${providerId}/${connection}/${id}/source`} />
      {#if logger}
        <!-- journalctl tab -->
        <Tab
          title="Logs"
          url="/quadlets/{providerId}/{connection}/{id}/logs"
          selected={$router.path === `/quadlets/${providerId}/${connection}/${id}/logs`} />
      {/if}
    </svelte:fragment>
    <svelte:fragment slot="icon">
      <QuadletStatus object={quadlet} />
    </svelte:fragment>
    <svelte:fragment slot="content">
      <div class="flex flex-col w-full h-full min-h-0">
        <!-- loading indicator -->
        <div class="h-0.5">
          <!-- avoid flickering -->
          {#if loading}
            <ProgressBar class="w-full h-0.5" width="w-full" height="h-0.5" />
          {/if}
        </div>

        <!-- quadlet -dryrun output -->
        <Route path="/">
          <div class="flex py-2 h-[40px]">
            <span
              class="block w-auto text-sm font-medium whitespace-nowrap leading-6 text-[var(--pd-content-text)] pl-2 pr-2">
              quadlet generated service
            </span>
          </div>
          <!-- monaco editor is multiplying the build time by too much -->
          <!-- <MonacoEditor readOnly content={quadlet.content} language="ini" /> -->
          <MonacoEditor class="h-full" readOnly content={quadlet.content} language="ini" />
        </Route>

        <!-- content of the path -->
        <Route path="/source">
          <div class="flex py-2 h-[40px]">
            <span
              class="block w-auto text-sm font-medium whitespace-nowrap leading-6 text-[var(--pd-content-text)] pl-2 pr-2">
              {quadlet.path}
            </span>
          </div>
          <MonacoEditor class="h-full" readOnly content={quadletSource ?? '<unknown>'} language="ini" />
        </Route>

        <!-- quadlet -dryrun output -->
        <Route path="/logs">
          <div class="flex py-2 h-[40px]">
            <span
              class="block w-auto text-sm font-medium whitespace-nowrap leading-6 text-[var(--pd-content-text)] pl-2 pr-2">
              journalctl --user --follow --unit={quadlet.id}
            </span>
          </div>
          {#if logger}
            <XTerminal store={logger} />
          {/if}
        </Route>
      </div>
    </svelte:fragment>
  </DetailsPage>
{/if}
