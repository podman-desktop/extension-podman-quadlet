<script lang="ts">
import { StatusIcon } from '@podman-desktop/ui-svelte';
import type { QuadletInfo } from '@quadlet/core-api';
import { router } from 'tinro';
import FileLinesIcon from './FileLinesIcon.svelte';
import FileCodeIcon from './FileCodeIcon.svelte';
import type { Component } from 'svelte';
import { isTemplateQuadlet } from '@quadlet/core-api';

interface Props {
  object: QuadletInfo;
}

let { object }: Props = $props();

let icon: Component = $derived(isTemplateQuadlet(object) ? FileCodeIcon : FileLinesIcon);

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
  <StatusIcon status={status} icon={icon} />
</button>
