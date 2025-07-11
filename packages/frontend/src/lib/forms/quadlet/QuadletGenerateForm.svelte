<script lang="ts">
import ContainerProviderConnectionSelect from '/@/lib/select/ContainerProviderConnectionSelect.svelte';
import { Button, ErrorMessage, EmptyScreen, Input } from '@podman-desktop/ui-svelte';
import type { Component } from 'svelte';
import {
  QUADLET_GENERATE_FORMS,
  type QuadletChildrenFormProps,
  type QuadletGenerateFormProps,
  RESOURCE_ID_QUERY,
} from '/@/lib/forms/quadlet/quadlet-utils';
import { QuadletType, type QuadletTypeGenerate } from '/@shared/src/utils/quadlet-type';
import type { ProviderContainerConnectionDetailedInfo } from '/@shared/src/models/provider-container-connection-detailed-info';
import { providerConnectionsInfo } from '/@store/connections';
import { router } from 'tinro';
import RadioButtons from '/@/lib/buttons/RadioButtons.svelte';
import { podletAPI, quadletAPI } from '/@/api/client';
import { faCode } from '@fortawesome/free-solid-svg-icons/faCode';
import { faTruckPickup } from '@fortawesome/free-solid-svg-icons/faTruckPickup';
import Stepper from '/@/lib/stepper/Stepper.svelte';
import { faCheck } from '@fortawesome/free-solid-svg-icons/faCheck';
import QuadletEditor from '/@/lib/monaco-editor/QuadletEditor.svelte';
import Fa from 'svelte-fa';
import { faWarning } from '@fortawesome/free-solid-svg-icons/faWarning';

interface Props extends QuadletGenerateFormProps {
  loading: boolean;
  close: () => void;
}

let {
  loading = $bindable(),
  quadletType = QuadletType.CONTAINER, // default to container
  providerId,
  connection,
  resourceId,
  close,
}: Props = $props();
let ChildForm: Component<QuadletChildrenFormProps> = $derived(
  QUADLET_GENERATE_FORMS[quadletType as QuadletTypeGenerate],
);

// using the query parameters
let selectedContainerProviderConnection: ProviderContainerConnectionDetailedInfo | undefined = $derived(
  $providerConnectionsInfo.find(provider => provider.providerId === providerId && provider.name === connection),
);

function onQuadletTypeChange(value: string): void {
  router.location.query.set('quadletType', value);
  router.location.query.delete(RESOURCE_ID_QUERY); // delete the key
  // reset
  error = undefined;
  quadlet = undefined;
}

function onContainerProviderConnectionChange(value: ProviderContainerConnectionDetailedInfo | undefined): void {
  if (value) {
    router.location.query.set('providerId', value.providerId);
    router.location.query.set('connection', value.name);
    router.location.query.delete(RESOURCE_ID_QUERY); // delete the key
  } else {
    router.location.query.clear();
  }
  // reset
  error = undefined;
  quadlet = undefined;
}

// reset quadlet if any got cleared
$effect(() => {
  if (!providerId || !resourceId || !quadletType) {
    quadlet = undefined;
    error = undefined;
  }
});

let quadlet: string | undefined = $state(undefined);
let quadletFilename: string = $state('');
let loaded: boolean = $state(false);
let validFilename: boolean = $derived.by(() => {
  // split filename by . (E.g. foo.container => ['foo', 'container'])
  const parts = quadletFilename.split('.');
  // support multiple part (E.g. foo.bar.container => ['foo', 'bar', 'container']
  return parts.length >= 2 && parts[0].length > 0 && parts[parts.length - 1] === quadletType.toLowerCase();
});

let step: string = $derived(loaded ? 'completed' : quadlet !== undefined ? 'edit' : 'options');

let error: string | undefined = $state();

function onError(err: string): void {
  error = err;
}

function onGenerated(value: string): void {
  error = undefined;
  quadlet = value;
}

async function generate(): Promise<void> {
  if (!selectedContainerProviderConnection || !resourceId) return;
  loading = true;

  podletAPI
    .generate({
      connection: $state.snapshot(selectedContainerProviderConnection),
      resourceId: $state.snapshot(resourceId),
      type: quadletType as QuadletTypeGenerate,
    })
    .then(onGenerated)
    .catch((err: unknown) => {
      onError(
        `Something went wrong while generating quadlet for provider ${selectedContainerProviderConnection.providerId}: ${String(err)}`,
      );
    })
    .finally(() => {
      loading = false;
    });
}

async function saveIntoMachine(): Promise<void> {
  if (!selectedContainerProviderConnection) throw new Error('no container provider connection selected');
  if (!quadlet) throw new Error('generation invalid');
  loading = true;
  try {
    await quadletAPI.writeIntoMachine({
      connection: $state.snapshot(selectedContainerProviderConnection),
      files: [
        {
          filename: quadletFilename,
          content: quadlet,
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
  quadlet = undefined;
}
</script>

<!-- form -->
<div class="bg-[var(--pd-content-card-bg)] m-5 space-y-6 px-8 sm:pb-6 xl:pb-8 rounded-lg h-fit">
  <div class="w-full">
    <Stepper
      value={step}
      steps={[
        {
          label: 'Options',
          id: 'options',
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

    <!-- step 1 -->
    {#if step === 'options'}
      <!-- all forms share the container provider connection selection -->
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

      <label for="container-engine" class="pt-4 block mb-2 font-bold text-[var(--pd-content-card-header-text)]"
        >Quadlet type</label>
      <RadioButtons
        label="Quadlet type"
        disabled={loading || selectedContainerProviderConnection?.status !== 'started'}
        onChange={onQuadletTypeChange}
        value={quadletType}
        options={[
          {
            label: 'container',
            id: QuadletType.CONTAINER,
          },
          {
            label: 'image',
            id: QuadletType.IMAGE,
          },
        ]} />

      <!-- each form is individual -->
      {#key selectedContainerProviderConnection}
        <ChildForm
          onChange={resetGenerate}
          onError={onError}
          bind:loading={loading}
          provider={selectedContainerProviderConnection}
          resourceId={resourceId}
          disabled={selectedContainerProviderConnection?.status !== 'started'} />
      {/key}
      {#if error}
        <ErrorMessage error={error} />
      {/if}

      <div class="w-full flex flex-row gap-x-2 justify-end pt-4">
        <Button type="secondary" on:click={close} title="cancel">Cancel</Button>
        <Button
          disabled={!!error || selectedContainerProviderConnection?.status !== 'started' || !resourceId || loading}
          inProgress={loading}
          icon={faCode}
          title="Generate"
          on:click={generate}>Generate</Button>
      </div>

      <!-- step 2 edit -->
    {:else if step === 'edit' && quadlet !== undefined}
      <label for="quadlet-filename" class="pt-4 block mb-2 font-bold text-[var(--pd-content-card-header-text)]"
        >Quadlet filename</label>
      <Input
        class="grow"
        name="quadlet filename"
        placeholder="Quadlet filename (E.g. foo.{quadletType.toLowerCase()})"
        bind:value={quadletFilename}
        id="quadlet-filename" />
      {#if quadletFilename.length > 0 && !validFilename}
        <ErrorMessage error="Quadlet filename should be <name>.{quadletType.toLowerCase()}" />
      {/if}

      <div class="h-[400px] pt-4">
        <QuadletEditor bind:content={quadlet} />
      </div>
      {#if error}
        <ErrorMessage error={error} />
      {/if}
      <div class="w-full flex flex-row gap-x-2 justify-end pt-4">
        <Button type="secondary" on:click={resetGenerate} title="Previous">Previous</Button>
        <Button
          disabled={quadletFilename.length === 0 || loading || !validFilename}
          inProgress={loading}
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
