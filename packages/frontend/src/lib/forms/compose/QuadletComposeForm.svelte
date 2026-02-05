<script lang="ts">
import Stepper from '/@/lib/stepper/Stepper.svelte';
import { Button, EmptyScreen, ErrorMessage, Input } from '@podman-desktop/ui-svelte';
import { faCode } from '@fortawesome/free-solid-svg-icons/faCode';
import { podletAPI, quadletAPI } from '/@/api/client';
import { faTruckPickup } from '@fortawesome/free-solid-svg-icons/faTruckPickup';
import { QuadletType } from '@podman-desktop/quadlet-extension-core-api';
import type { ProviderContainerConnectionDetailedInfo } from '@podman-desktop/quadlet-extension-core-api';
import { providerConnectionsInfo } from '/@/stores/connections';
import ContainerProviderConnectionSelect from '/@/lib/select/ContainerProviderConnectionSelect.svelte';
import { router } from 'tinro';
import { faCheck } from '@fortawesome/free-solid-svg-icons/faCheck';
import { faWarning } from '@fortawesome/free-solid-svg-icons/faWarning';
import MonacoEditor from '/@/lib/monaco-editor/MonacoEditor.svelte';
import Fa from 'svelte-fa';
import QuadletEditor from '/@/lib/monaco-editor/QuadletEditor.svelte';

interface Props {
  filepath?: string;
  loading: boolean;
  providerId?: string;
  connection?: string;
}

let { loading = $bindable(), providerId, connection, filepath }: Props = $props();

// using the query parameters
let selectedContainerProviderConnection: ProviderContainerConnectionDetailedInfo | undefined = $derived(
  $providerConnectionsInfo.find(provider => provider.providerId === providerId && provider.name === connection),
);

$effect(() => {
  if (!selectedContainerProviderConnection && $providerConnectionsInfo.length > 0) {
    onContainerProviderConnectionChange($providerConnectionsInfo[0]);
  }
});

const DEFAULT_KUBE_QUADLET = `
[Unit]
Description=A kubernetes yaml based service

[Kube]
Yaml=<<filename>>
`;

let kubeYAML: string = $state('');
let quadlet: string = $state('');

// user define filename
let kubeFilename: string = $state('');
let quadletFilename: string = $state('');

// Current step
type Steps = 'edit-kube' | 'edit-quadlet' | 'select' | 'completed';
let step: Steps = $state('select');

// potential error
let error: string | undefined = $state();
function onError(err: string): void {
  error = err;
}

async function generateYAML(): Promise<void> {
  if (!filepath) return;
  loading = true;

  podletAPI
    .compose({
      filepath: $state.snapshot(filepath),
      type: QuadletType.KUBE, // only one supported for now
    })
    .then(yaml => {
      kubeYAML = yaml;
      step = 'edit-kube';
    })
    .catch((err: unknown) => {
      onError(`Something went wrong while generating compose quadlet for provider: ${String(err)}`);
    })
    .finally(() => {
      loading = false;
    });
}

function onContainerProviderConnectionChange(value: ProviderContainerConnectionDetailedInfo | undefined): void {
  if (value) {
    router.location.query.set('providerId', value.providerId);
    router.location.query.set('connection', value.name);
  } else {
    router.location.query.delete('providerId');
    router.location.query.delete('connection');
  }
}

async function saveIntoMachine(): Promise<void> {
  if (!selectedContainerProviderConnection) throw new Error('no container provider connection selected');
  if (!kubeYAML) throw new Error('generation invalid');
  if (!quadlet) throw new Error('cannot write into machine: quadlet content is undefined');

  if (!quadletFilename.endsWith('.kube')) {
    error = 'The Quadlet filename must end with .kube';
    return;
  }

  error = undefined;
  loading = true;
  try {
    await quadletAPI.writeIntoMachine({
      connection: $state.snapshot(selectedContainerProviderConnection),
      files: [
        // the YAML
        {
          filename: kubeFilename,
          content: kubeYAML,
        },
        // the Quadlet
        {
          content: quadlet,
          filename: quadletFilename,
        },
      ],
    });
    // goto completion step
    step = 'completed';
  } catch (err: unknown) {
    onError(`Something went wrong while adding quadlet to machine: ${String(err)}`);
  } finally {
    loading = false;
  }
}

function close(): void {
  router.goto('/');
}

function next(): void {
  // reset error
  error = undefined;

  switch (step) {
    case 'edit-kube':
      // ensure the filename are matching
      if (!kubeFilename.endsWith('.yaml')) {
        error = 'The YAML filename must end with .yaml';
        return;
      }

      quadlet = DEFAULT_KUBE_QUADLET.replace('<<filename>>', kubeFilename);
      step = 'edit-quadlet';
      break;
    case 'edit-quadlet':
      break;
    case 'select':
      break;
    case 'completed':
      break;
  }
}

function back(): void {
  // reset error
  error = undefined;

  switch (step) {
    case 'edit-kube':
      kubeYAML = '';
      step = 'select';
      break;
    case 'edit-quadlet':
      quadlet = '';
      step = 'edit-kube';
      break;
    case 'completed':
      step = 'edit-quadlet';
      break;
  }
}
</script>

<!-- form -->
<div class="bg-[var(--pd-content-card-bg)] m-5 space-y-6 px-8 sm:pb-6 xl:pb-8 rounded-lg h-fit">
  <div class="w-full">
    <Stepper
      value={step}
      steps={[
        {
          label: 'Select',
          id: 'select',
        },
        {
          label: 'Edit YAML',
          id: 'edit-kube',
        },
        {
          label: 'Edit Quadlet',
          id: 'edit-quadlet',
        },
        {
          label: 'Completed',
          id: 'completed',
        },
      ]} />

    <!-- SELECT FILE (readonly, kinda lie) -->
    {#if step === 'select'}
      <label for="compose-file" class="pt-4 block mb-2 font-bold text-[var(--pd-content-card-header-text)]"
        >Compose file</label>
      <Input id="compose-file" name="Compose file" readonly value={filepath} />

      {#if error}
        <ErrorMessage error={error} />
      {/if}

      <div class="w-full flex flex-row gap-x-2 justify-end pt-4">
        <Button type="secondary" on:click={close} title="cancel">Cancel</Button>
        <Button class="" disabled={!filepath} icon={faCode} title="Generate" on:click={generateYAML}>Generate</Button>
      </div>

      <!-- EDIT KUBE YAML -->
    {:else if step === 'edit-kube'}
      <label for="kube-filename" class="pt-4 block mb-2 font-bold text-[var(--pd-content-card-header-text)]"
        >Kube filename</label>
      <Input
        class="grow"
        name="kube file name"
        placeholder="Kube filename (E.g. nginx.yaml)"
        bind:value={kubeFilename}
        id="kube-filename" />

      <div class="h-[400px] pt-4">
        <MonacoEditor class="h-full" readOnly={false} noMinimap bind:content={kubeYAML} language="yaml" />
      </div>

      {#if error}
        <ErrorMessage error={error} />
      {/if}

      <div class="w-full flex flex-row gap-x-2 justify-end pt-4">
        <Button type="secondary" on:click={back} title="Previous">Previous</Button>
        <Button disabled={kubeFilename.length === 0} on:click={next} title="Next">Next</Button>
      </div>

      <!-- EDIT QUADLET -->
    {:else if step === 'edit-quadlet'}
      <!-- select the container engine -->
      <label for="container-engine" class="pt-4 block mb-2 font-bold text-[var(--pd-content-card-header-text)]"
        >Container engine</label>
      <ContainerProviderConnectionSelect
        disabled={loading}
        onChange={onContainerProviderConnectionChange}
        value={selectedContainerProviderConnection}
        containerProviderConnections={$providerConnectionsInfo} />
      {#if selectedContainerProviderConnection && selectedContainerProviderConnection.status !== 'started'}
        <div class="text-gray-800 text-sm flex items-center">
          <Fa class="mr-2" icon={faWarning} />
          <span role="alert">The container engine is not started</span>
        </div>
      {/if}

      <label for="quadlet-filename" class="pt-4 block mb-2 font-bold text-[var(--pd-content-card-header-text)]"
        >Quadlet filename</label>
      <Input
        class="grow"
        name="quadlet filename"
        placeholder="Quadlet filename (E.g. nginx.kube)"
        bind:value={quadletFilename}
        id="quadlet-filename" />

      <div class="h-[400px] pt-4">
        <QuadletEditor readOnly={false} bind:content={quadlet} />
      </div>

      {#if error}
        <ErrorMessage error={error} />
      {/if}

      <div class="w-full flex flex-row gap-x-2 justify-end pt-4">
        <Button type="secondary" on:click={back} title="Previous">Previous</Button>
        <Button
          disabled={quadletFilename.length === 0 || selectedContainerProviderConnection?.status !== 'started'}
          icon={faTruckPickup}
          on:click={saveIntoMachine}
          title="Load into machine">Load into machine</Button>
      </div>
    {:else if step === 'completed'}
      <EmptyScreen icon={faCheck} title="Completed" message="The quadlet has been loaded.">
        <Button title="Go to quadlet list" on:click={close}>Go to quadlet list</Button>
      </EmptyScreen>
    {/if}
  </div>
</div>
