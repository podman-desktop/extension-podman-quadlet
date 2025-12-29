<script lang="ts">
import type { QuadletInfo } from '/@shared/src/models/quadlet-info';
import { quadletsInfo } from '/@store/quadlets';
import { DetailsPage, Tab, ErrorMessage } from '@podman-desktop/ui-svelte';
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
import { isServiceQuadlet } from '/@shared/src/models/service-quadlet';
import { isTemplateQuadlet } from '/@shared/src/models/template-quadlet.js';
import IconTab from '/@/lib/tab/IconTab.svelte';
import { faPaperclip } from '@fortawesome/free-solid-svg-icons/faPaperclip';
import FileEditor from '/@/lib/monaco-editor/FileEditor.svelte';

interface Props {
  id: string;
  providerId: string;
  connection: string;
}

let { id, providerId, connection }: Props = $props();

let loading: boolean = $state(true);
let quadletSource: string | undefined = $state(undefined);
let originalSource: string | undefined = $state(undefined);
let quadletSourceError: string | undefined = $state(undefined);
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
let title: string = $derived.by(() => {
  if (!quadlet) {
    return 'none';
  }

  if (isServiceQuadlet(quadlet)) {
    return quadlet.service;
  }

  return quadlet.path.split('/').pop() ?? 'none';
});

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
    quadletSourceError = undefined;
  } catch (err: unknown) {
    console.error(err);
    quadletSourceError = String(err);
  } finally {
    loading = false;
  }

  // create logger
  createLogger().catch(console.error);
});

let logger: LoggerStore | undefined = $state();

async function createLogger(): Promise<void> {
  if (!quadlet) throw new Error('Quadlets not found');
  if (isTemplateQuadlet(quadlet) && !quadlet.defaultInstance) throw new Error('Cannot create logger for a template');

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
    await quadletAPI.writeIntoMachine({
      connection: { providerId: providerId, name: connection },
      files: [
        {
          filename: quadlet.path,
          content: quadletSource,
        },
      ],
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
    onbreadcrumbClick={close}>
    {#snippet actionsSnippet()}
      <QuadletActions object={quadlet} />
    {/snippet}
    {#snippet tabsSnippet()}
      <!-- source tab -->
      <Tab
        title="Source"
        url="/quadlets/{providerId}/{connection}/{id}"
        selected={$router.path === `/quadlets/${providerId}/${connection}/${id}`} />
      <!-- systemd-service tab -->
      {#if isServiceQuadlet(quadlet)}
        <Tab
          title="Systemd Service"
          url="/quadlets/{providerId}/{connection}/{id}/systemd-service"
          selected={$router.path === `/quadlets/${providerId}/${connection}/${id}/systemd-service`} />
      {/if}
      {#if logger}
        <!-- journalctl tab -->
        <Tab
          title="Logs"
          url="/quadlets/{providerId}/{connection}/{id}/logs"
          selected={$router.path === `/quadlets/${providerId}/${connection}/${id}/logs`} />
      {/if}
      {#each quadlet.resources as file (file.path)}
        {@const fileId = encodeURIComponent(file.path)}
        <IconTab
          title={file.name}
          url="/quadlets/{providerId}/{connection}/{id}/file/{fileId}"
          icon={faPaperclip}
          selected={$router.path === `/quadlets/${providerId}/${connection}/${id}/file/${fileId}`} />
      {/each}
    {/snippet}
    {#snippet iconSnippet()}
      <QuadletStatus object={quadlet} />
    {/snippet}
    {#snippet contentSnippet()}
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
          <div class="flex py-2 h-[40px]">
            <span
              class="block w-auto text-sm font-medium whitespace-nowrap leading-6 text-[var(--pd-content-text)] pl-2 pr-2">
              {quadlet.path}
            </span>
            {#if quadletSourceError}
              <ErrorMessage error={quadletSourceError} />
            {/if}
          </div>
          {#if quadletSource}
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
          {#if isServiceQuadlet(quadlet)}
            <MonacoEditor class="h-full" readOnly content={quadlet.content} language="ini" />
          {/if}
        </Route>

        <Route path="/file/:fileId" let:meta>
          {#key meta.params.fileId}
            <FileEditor
              connection={quadlet.connection}
              bind:loading={loading}
              path={decodeURIComponent(meta.params.fileId)} />
          {/key}
        </Route>

        <!-- quadlet -dryrun output -->
        <Route path="/logs">
          {#if isServiceQuadlet(quadlet)}
            <div class="flex py-2 h-[40px]">
              <span
                role="banner"
                aria-label="journactl command"
                class="block w-auto text-sm font-medium whitespace-nowrap leading-6 text-[var(--pd-content-text)] pl-2 pr-2">
                journalctl --user --follow --unit={quadlet.service}
              </span>
            </div>
          {/if}
          {#if logger}
            <XTerminal store={logger} />
          {/if}
        </Route>
      </div>
    {/snippet}
  </DetailsPage>
{/if}
