<script lang="ts">
import type { QuadletInfo } from '/@shared/src/models/quadlet-info';
import ListItemButtonIcon from '/@/lib/buttons/ListItemButtonIcon.svelte';
import { faStop } from '@fortawesome/free-solid-svg-icons/faStop';
import { faPlay } from '@fortawesome/free-solid-svg-icons/faPlay';
import { dialogAPI, quadletAPI } from '/@/api/client';
import { faTrash } from '@fortawesome/free-solid-svg-icons';

interface Props {
  object: QuadletInfo;
}

let { object }: Props = $props();

let deleting: boolean = $derived(object.state === 'deleting');
let loading: boolean = $state(false);

async function start(): Promise<void> {
  loading = true;
  try {
    await quadletAPI.start(object.connection, object.id);
  } finally {
    loading = false;
  }
}

async function stop(): Promise<void> {
  loading = true;
  try {
    await quadletAPI.stop(object.connection, object.id);
  } finally {
    loading = false;
  }
}

async function remove(): Promise<void> {
  const result = await dialogAPI.showWarningMessage(`Are you sure you want to delete ${object.id}?`, 'No', 'Yes');
  if (result !== 'Yes') return;

  loading = true;
  try {
    await quadletAPI.remove(object.connection, object.id);
  } finally {
    loading = false;
  }
}
</script>

{#if object.state === 'active'}
  <ListItemButtonIcon icon={faStop} onClick={stop} title="Stop quadlet" enabled={!loading && !deleting} />
{:else}
  <ListItemButtonIcon icon={faPlay} onClick={start} title="Start quadlet" enabled={!loading && !deleting} />
{/if}
<ListItemButtonIcon
  icon={faTrash}
  onClick={remove}
  title="Remove quadlet"
  inProgress={deleting}
  enabled={!loading && !deleting} />
