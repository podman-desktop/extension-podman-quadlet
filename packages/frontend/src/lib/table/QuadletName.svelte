<script lang="ts">
import type { QuadletInfo } from '/@shared/src/models/quadlet-info';
import { router } from 'tinro';
import { isServiceQuadlet } from '/@shared/src/models/service-quadlet.js';

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
