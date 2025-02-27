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
import QuadletStatus from '/@/lib/table/QuadletStatus.svelte';
import { LoggerStore } from '/@store/logger-store';
import XTerminal from '/@/lib/terminal/XTerminal.svelte';
import EditorOverlay from '/@/lib/forms/EditorOverlay.svelte';
import { QuadletType } from '/@shared/src/utils/quadlet-type';
import KubeYamlEditor from '/@/lib/monaco-editor/KubeYamlEditor.svelte';
import { isKubeQuadlet } from '/@/utils/quadlet';

interface Props {
  id: string;
  providerId: string;
  connection: string;
}

let { id, providerId, connection }: Props = $props();

let loading: boolean = $state(true);
let quadletSource: string | undefined = $state(undefined);
let originalSource: string | undefined = $state(undefined);
let changed: boolean = $derived(quadletSource !== originalSource);

let loggerId: string | undefined = $state(undefined);

// found matching quadlets
let quadlet: QuadletInfo | undefined = $derived(
  $quadletsInfo.find(
    quadlet =>
      quadlet.id === id && quadlet.connection.name === connection && quadlet.connection.providerId === providerId,
  ),
);
// the title is either the systemd service name or if undefined the last part of the path (E.g. /foo/bar.container => bar.container)
let title: string = $derived(quadlet?.service ?? quadlet?.path.split('/').pop() ?? 'none');

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
    // copy the original
    originalSource = quadletSource;
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

  loggerId = await quadletAPI.createQuadletLogger({
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
  // dispose logger => will kill the process, we don't want to keep it alive if we leave the page
  if (loggerId) {
    quadletAPI.disposeLogger(loggerId).catch(console.error);
  }
});

async function save(): Promise<void> {
  if (!quadlet || !quadletSource || !connection || !providerId) return;

  loading = true;
  try {
    await quadletAPI.updateIntoMachine({
      connection: { providerId: providerId, name: connection },
      quadlet: quadletSource,
      path: quadlet.path,
    });
    // we should be good to consider we updated it
    originalSource = quadletSource;
  } catch (err: unknown) {
    console.error(err);
  } finally {
    loading = false;
  }
}

function onchange(content: string): void {
  quadletSource = content;
}
</script>

{#if quadlet}
  <DetailsPage
    title={title}
    onclose={close}
    breadcrumbLeftPart="Quadlets"
    breadcrumbRightPart={title}
    breadcrumbTitle="Go back to quadlets page"
    onbreadcrumbClick={close}>
    <svelte:fragment slot="actions">
      <QuadletActions object={quadlet} />
    </svelte:fragment>
    <svelte:fragment slot="tabs">
      <!-- source tab -->
      <Tab
        title="Source"
        url="/quadlets/{providerId}/{connection}/{id}"
        selected={$router.path === `/quadlets/${providerId}/${connection}/${id}`} />
      <!-- systemd-service tab -->
      <Tab
        title="Systemd Service"
        url="/quadlets/{providerId}/{connection}/{id}/systemd-service"
        selected={$router.path === `/quadlets/${providerId}/${connection}/${id}/systemd-service`} />
      <!-- kube yaml tab -->
      {#if quadlet.type === QuadletType.KUBE}
        <Tab
          title="kube yaml"
          url="/quadlets/{providerId}/{connection}/{id}/yaml"
          selected={$router.path === `/quadlets/${providerId}/${connection}/${id}/yaml`} />
      {/if}
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

        <!-- content of the path -->
        <Route path="/">
          {#if quadletSource}
            <div class="flex py-2 h-[40px]">
              <span
                class="block w-auto text-sm font-medium whitespace-nowrap leading-6 text-[var(--pd-content-text)] pl-2 pr-2">
                {quadlet.path}
              </span>
            </div>
            <EditorOverlay save={save} loading={loading} changed={changed} />
            <MonacoEditor class="h-full" onChange={onchange} content={quadletSource} language="ini" />
          {/if}
        </Route>

        <!-- quadlet -dryrun output -->
        <Route path="/systemd-service">
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

        <Route path="/yaml">
          {#if isKubeQuadlet(quadlet)}
            <KubeYamlEditor quadlet={quadlet} bind:loading={loading} />
          {/if}
        </Route>

        <!-- quadlet -dryrun output -->
        <Route path="/logs">
          <div class="flex py-2 h-[40px]">
            <span
              role="banner"
              aria-label="journactl command"
              class="block w-auto text-sm font-medium whitespace-nowrap leading-6 text-[var(--pd-content-text)] pl-2 pr-2">
              journalctl --user --follow --unit={quadlet.service}
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
