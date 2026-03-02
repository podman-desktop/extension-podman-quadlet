<script lang="ts">
import { type QuadletChildrenFormProps, RESOURCE_ID_QUERY } from '/@/lib/forms/quadlet/quadlet-utils';
import type { SimpleImageInfo } from '@podman-desktop/quadlet-extension-core-api';
import { imageAPI, podletAPI } from '/@/api/client';
import { router } from 'tinro';
import ImagesSelect from '/@/lib/select/ImagesSelect.svelte';
import { faCode } from '@fortawesome/free-solid-svg-icons/faCode';
import { Button } from '@podman-desktop/ui-svelte';

let {
  loading = $bindable(),
  resourceId: imageId,
  provider,
  onError,
  onChange,
  disabled,
  onGenerated,
}: QuadletChildrenFormProps = $props();

let images: SimpleImageInfo[] | undefined = $state();

// use the query parameter containerId
let selectedImage: SimpleImageInfo | undefined = $derived(images?.find(image => image.id === imageId));

let generatable = $derived(!!provider && !!imageId && !disabled && !loading);

async function listImages(): Promise<void> {
  if (!provider) throw new Error('no container provider connection selected');
  loading = true;
  // reset
  images = [];

  try {
    images = await imageAPI.all($state.snapshot(provider));
  } catch (err: unknown) {
    onError(`Something went wrong while listing images for provider ${provider.providerId}: ${String(err)}`);
  } finally {
    loading = false;
  }
}

function onImageChange(value: SimpleImageInfo | undefined): void {
  if (!value) {
    router.location.query.delete(RESOURCE_ID_QUERY);
    return;
  }

  router.location.query.set(RESOURCE_ID_QUERY, value.id);
  onChange();
}

function generate(): void {
  if (!provider || !imageId) return;

  loading = true;

  podletAPI
    .generateImage(provider, imageId)
    .then(onGenerated)
    .catch(onError)
    .finally(() => (loading = false));
}

// if we mount the component, and query parameters with all the values defined
// we need to fetch manually the containers
$effect(() => {
  if (provider?.status === 'started' && !selectedImage && images === undefined && loading === false) {
    listImages().catch(console.error);
  }
});
</script>

<!-- image list -->
<label for="image" class="pt-4 block mb-2 font-bold text-[var(--pd-content-card-header-text)]">Image</label>
<ImagesSelect
  disabled={loading || provider === undefined || disabled}
  onChange={onImageChange}
  value={selectedImage}
  images={images ?? []} />

<div class="w-full flex flex-row gap-x-2 justify-end pt-4">
  <Button type="secondary" onclick={close} title="cancel">Cancel</Button>
  <Button disabled={!generatable} inProgress={loading} icon={faCode} title="Generate" onclick={generate}
    >Generate</Button>
</div>
