<script lang="ts">
import { Button, Tooltip } from '@podman-desktop/ui-svelte';

interface Props {
  save(): void;
  changed: boolean;
  loading: boolean;
}

let { save, changed, loading }: Props = $props();
</script>

<div
  class="flex flex-row-reverse p-6 bg-transparent fixed bottom-0 right-0 mb-5 pr-10 max-h-20 bg-opacity-90 z-50"
  role="group"
  aria-label="Edit Buttons">
  <Tooltip topLeft tip="Apply the changes">
    <Button type="primary" aria-label="Save" on:click={save} disabled={!changed} inProgress={loading}>Save</Button>
  </Tooltip>
</div>
