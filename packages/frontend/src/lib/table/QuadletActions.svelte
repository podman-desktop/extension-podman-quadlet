<script lang="ts">
import type { QuadletInfo } from '@quadlet/core-api';
import ListItemButtonIcon from '/@/lib/buttons/ListItemButtonIcon.svelte';
import { faStop } from '@fortawesome/free-solid-svg-icons/faStop';
import { faPlay } from '@fortawesome/free-solid-svg-icons/faPlay';
import { faRotateRight } from '@fortawesome/free-solid-svg-icons/faRotateRight';
import { dialogAPI, quadletAPI } from '/@/api/client';
import { faTrash } from '@fortawesome/free-solid-svg-icons';
import { isTemplateQuadlet } from '@quadlet/core-api';

interface Props {
  object: QuadletInfo;
}

let { object }: Props = $props();

let deleting: boolean = $derived(object.state === 'deleting');
let loading: boolean = $state(false);
let startable: boolean = $derived(isTemplateQuadlet(object) ? !!object.defaultInstance : true);

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

async function restart(): Promise<void> {
  loading = true;
  try {
    await quadletAPI.restart(object.connection, object.id);
  } finally {
    loading = false;
  }
}

async function remove(): Promise<void> {
  const result = await dialogAPI.showWarningMessage(
    `Are you sure you want to delete ${object.path}?`,
    'Confirm',
    'Cancel',
  );
  if (result !== 'Confirm') return;

  loading = true;
  try {
    await quadletAPI.remove(object.connection, object.id);
  } finally {
    loading = false;
  }
}
</script>

{#if object.state === 'active'}
  <ListItemButtonIcon icon={faRotateRight} onClick={restart} title="Restart quadlet" enabled={!loading && !deleting} />
  <ListItemButtonIcon icon={faStop} onClick={stop} title="Stop quadlet" enabled={!loading && !deleting} />
{:else if startable}
  <ListItemButtonIcon icon={faPlay} onClick={start} title="Start quadlet" enabled={!loading && !deleting} />
{/if}
<ListItemButtonIcon
  icon={faTrash}
  onClick={remove}
  title="Remove quadlet"
  inProgress={deleting}
  enabled={!loading && !deleting} />
