<script lang="ts">
  import Stepper from '/@/lib/stepper/Stepper.svelte';
  import { Button, EmptyScreen, ErrorMessage, Input } from '@podman-desktop/ui-svelte';
  import { faCode } from '@fortawesome/free-solid-svg-icons/faCode';
  import { podletAPI, quadletAPI } from '/@/api/client';
  import { faTruckPickup } from '@fortawesome/free-solid-svg-icons/faTruckPickup';
  import { QuadletType } from '/@shared/src/utils/quadlet-type';
  import type {
    ProviderContainerConnectionDetailedInfo,
  } from '/@shared/src/models/provider-container-connection-detailed-info';
  import { providerConnectionsInfo } from '/@/stores/connections';
  import ContainerProviderConnectionSelect from '/@/lib/select/ContainerProviderConnectionSelect.svelte';
  import { router } from 'tinro';
  import { faCheck } from '@fortawesome/free-solid-svg-icons/faCheck';
  import { faWarning } from '@fortawesome/free-solid-svg-icons/faWarning';
  import MonacoEditor from '/@/lib/monaco-editor/MonacoEditor.svelte';
  import Fa from 'svelte-fa';

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

const DEFAULT_KUBE_QUADLET = `
[Unit]
Description=A kubernetes yaml based service

[Kube]
Yaml=<<filename>>
`;

let kubeYAML: string | undefined = $state(undefined);
let filename: string = $state('');

let loaded: boolean = $state(false);
let step: string = $derived(loaded ? 'completed' : kubeYAML !== undefined ? 'edit' : 'select');

let error: string | undefined = $state();

function onError(err: string): void {
  error = err;
}

async function generate(): Promise<void> {
  if (!filepath) return;
  loading = true;

  podletAPI
    .compose({
      filepath: $state.snapshot(filepath),
      type: QuadletType.KUBE, // only one supported for now
    })
    .then((yaml) => {
      kubeYAML = yaml;
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

  if(!filename.endsWith('.yaml')) {
    error = 'The filename must end with .yaml';
    return;
  }

  loading = true;
  try {
    await quadletAPI.writeIntoMachine({
      connection: $state.snapshot(selectedContainerProviderConnection),
      files: [
        // the YAML
        {
          filename: filename,
          content: kubeYAML,
        },
        // the Quadlet
        {
          content: DEFAULT_KUBE_QUADLET.replace('<<filename>>', filename),
          filename: filename.substring(0, filename.length - 5) + '.kube',
        },
      ],
    });
    loaded = true;
  } catch (err: unknown) {
    onError(`Something went wrong while adding quadlet to machine: ${String(err)}`);
  } finally {
    loading = false;
  }
}

function resetGenerate(): void {
  error = undefined;
  filename = '';
  kubeYAML = undefined;
}

function close(): void {
  router.goto('/');
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
          label: 'Edit',
          id: 'edit',
        },
        {
          label: 'Completed',
          id: 'completed',
        },
      ]} />

    {#if step === 'select'}
      <label for="compose-file" class="pt-4 block mb-2 font-bold text-[var(--pd-content-card-header-text)]"
        >Compose file</label>
      <Input readonly value={filepath} />

      {#if error}
        <ErrorMessage error={error} />
      {/if}

      <div class="w-full flex flex-row gap-x-2 justify-end pt-4">
        <Button type="secondary" on:click={close} title="cancel">Cancel</Button>
        <Button class="" disabled={!filepath} icon={faCode} title="Generate" on:click={generate}>Generate</Button>
      </div>

      <!-- step 2 edit -->
    {:else if step === 'edit' && kubeYAML !== undefined}
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

      <label for="kube-filename" class="pt-4 block mb-2 font-bold text-[var(--pd-content-card-header-text)]"
        >Kube filename</label>
      <Input
        class="grow"
        name="kube file name"
        placeholder="Kube filename (E.g. nginx.yaml)"
        bind:value={filename}
        id="kube-filename" />

      <div class="h-[400px] pt-4">
        <MonacoEditor class="h-full" readOnly={false} noMinimap bind:content={kubeYAML} language="yaml" />
      </div>

      <div class="w-full flex flex-row gap-x-2 justify-end pt-4">
        <Button type="secondary" on:click={resetGenerate} title="Previous">Previous</Button>
        <Button
          disabled={filename.length === 0 || selectedContainerProviderConnection?.status !== 'started'}
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
