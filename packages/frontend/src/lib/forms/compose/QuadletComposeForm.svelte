<script lang="ts">
import Stepper from '/@/lib/stepper/Stepper.svelte';
import { Button, EmptyScreen, ErrorMessage, Input } from '@podman-desktop/ui-svelte';
import { faCode } from '@fortawesome/free-solid-svg-icons/faCode';
import { podletAPI, quadletAPI } from '/@/api/client';
import { faTruckPickup } from '@fortawesome/free-solid-svg-icons/faTruckPickup';
import QuadletEditor from '/@/lib/monaco-editor/QuadletEditor.svelte';
import { QuadletType } from '/@shared/src/utils/quadlet-type';
import RadioButtons from '/@/lib/buttons/RadioButtons.svelte';
import type { ProviderContainerConnectionDetailedInfo } from '/@shared/src/models/provider-container-connection-detailed-info';
import { providerConnectionsInfo } from '/@/stores/connections';
import ContainerProviderConnectionSelect from '/@/lib/select/ContainerProviderConnectionSelect.svelte';
import { router } from 'tinro';
import { faCheck } from '@fortawesome/free-solid-svg-icons/faCheck';
import { faWarning } from '@fortawesome/free-solid-svg-icons/faWarning';
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

let quadlet: string | undefined = $state(undefined);
let quadletFilename: string = $state('');

let loaded: boolean = $state(false);
let step: string = $derived(loaded ? 'completed' : quadlet !== undefined ? 'edit' : 'select');

let quadletType: QuadletType.CONTAINER | QuadletType.KUBE | QuadletType.POD = $state(QuadletType.CONTAINER);

let error: string | undefined = $state();

function onError(err: string): void {
  error = err;
}

function onGenerated(value: string): void {
  error = undefined;
  quadlet = value;

  const comment = quadlet.split('\n')[0];
  if (comment.startsWith('#')) {
    const [name] = comment.substring(2).split('.');
    quadletFilename = name;
  }
}

async function generate(): Promise<void> {
  if (!filepath) return;
  loading = true;

  podletAPI
    .compose({
      filepath: $state.snapshot(filepath),
      type: quadletType,
    })
    .then(onGenerated)
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
  if (!quadlet) throw new Error('generation invalid');

  loading = true;
  try {
    await quadletAPI.saveIntoMachine({
      connection: $state.snapshot(selectedContainerProviderConnection),
      name: quadletFilename,
      quadlet: quadlet,
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
  quadlet = undefined;
}

function onQuadletTypeChange(value: string): void {
  switch (value) {
    case QuadletType.CONTAINER:
    case QuadletType.POD:
    case QuadletType.KUBE:
      quadletType = value;
      break;
  }
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

      <label for="container-engine" class="pt-4 block mb-2 font-bold text-[var(--pd-content-card-header-text)]"
        >Quadlet type</label>
      <RadioButtons
        disabled={loading}
        onChange={onQuadletTypeChange}
        value={quadletType}
        options={[
          {
            label: 'container',
            id: QuadletType.CONTAINER,
          },
          {
            label: 'kube',
            id: QuadletType.KUBE,
          },
          {
            label: 'pod',
            id: QuadletType.POD,
          },
        ]} />

      {#if error}
        <ErrorMessage error={error} />
      {/if}

      <div class="w-full flex flex-row gap-x-2 justify-end pt-4">
        <Button type="secondary" on:click={close} title="cancel">Cancel</Button>
        <Button class="" disabled={!filepath} icon={faCode} title="Generate" on:click={generate}>Generate</Button>
      </div>
      <!-- step 2 edit -->
    {:else if step === 'edit' && quadlet !== undefined}
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

      <label for="quadlet-name" class="pt-4 block mb-2 font-bold text-[var(--pd-content-card-header-text)]"
        >Quadlet name</label>
      <Input
        class="grow"
        name="quadlet name"
        placeholder="Quadlet name (E.g. nginx-quadlet)"
        bind:value={quadletFilename}
        id="quadlet-name" />

      <div class="h-[400px] pt-4">
        <QuadletEditor bind:content={quadlet} />
      </div>

      <div class="w-full flex flex-row gap-x-2 justify-end pt-4">
        <Button type="secondary" on:click={resetGenerate} title="Previous">Previous</Button>
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
