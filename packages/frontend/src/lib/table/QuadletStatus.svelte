<script lang="ts">
import { StatusIcon } from '@podman-desktop/ui-svelte';
import type { QuadletInfo } from '/@shared/src/models/quadlet-info';
import { faFileLines } from '@fortawesome/free-solid-svg-icons';
import Fa from 'svelte-fa';
import { router } from 'tinro';
import { faLink } from '@fortawesome/free-solid-svg-icons/faLink';

interface Props {
  object: QuadletInfo | (QuadletInfo & { parent: string });
}

let { object }: Props = $props();

let status: string = $derived.by(() => {
  switch (object.state) {
    case 'active':
      return 'RUNNING';
    case 'deleting':
      return 'DELETING';
    case 'error':
      return 'DEGRADED';
    case 'unknown':
    case 'inactive':
      return '';
  }
});

function openDetails(quadlet: QuadletInfo): void {
  return router.goto(`/quadlets/${quadlet.connection.providerId}/${quadlet.connection.name}/${quadlet.id}`);
}
</script>

{#snippet icon()}
  <Fa size="1.125x" icon={'parent' in object ? faLink : faFileLines} />
{/snippet}

<button onclick={openDetails.bind(undefined, object)}>
  <StatusIcon status={status} icon={icon} />
</button>
