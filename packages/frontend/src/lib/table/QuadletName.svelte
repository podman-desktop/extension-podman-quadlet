<script lang="ts">
import type { QuadletInfo } from '@podman-desktop/quadlet-extension-core-api';
import { router } from 'tinro';
import { isServiceQuadlet } from '@podman-desktop/quadlet-extension-core-api';

interface Props {
  object: QuadletInfo;
}

let { object }: Props = $props();

let name = $derived(isServiceQuadlet(object) ? object.service : object.path);

function openDetails(quadlet: QuadletInfo): void {
  return router.goto(`/quadlets/${quadlet.connection.providerId}/${quadlet.connection.name}/${quadlet.id}`);
}
</script>

<button
  title={name}
  class="hover:cursor-pointer w-full overflow-hidden text-ellipsis"
  aria-label="quadlet name"
  onclick={openDetails.bind(undefined, object)}>
  {name}
</button>
