<script lang="ts">
import { StatusIcon } from '@podman-desktop/ui-svelte';
import type { QuadletInfo } from '/@shared/src/models/quadlet-info';
import { router } from 'tinro';
import FileLinesIcon from './FileLinesIcon.svelte';

interface Props {
  object: QuadletInfo;
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

<button onclick={openDetails.bind(undefined, object)}>
  <StatusIcon status={status} icon={FileLinesIcon} />
</button>
