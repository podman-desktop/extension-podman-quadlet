<script lang="ts">
import { Button, Tooltip } from '@podman-desktop/ui-svelte';
import type { IconDefinition } from '@fortawesome/free-solid-svg-icons';

interface Props {
  actions: Array<{ id: string; label: string; tooltip: string; icon?: IconDefinition }>;
  onclick: (actionId: string) => void;
  disabled?: boolean;
  loading?: boolean;
}

let { actions, disabled, loading, onclick }: Props = $props();
</script>

<div
  class="flex flex-row-reverse p-6 bg-transparent fixed bottom-0 right-0 mb-5 pr-10 max-h-20 bg-opacity-90 z-50"
  role="group"
  aria-label="Edit Buttons">
  {#each actions as action (action.id)}
    <Tooltip topLeft tip={action.tooltip}>
      <Button
        type="primary"
        aria-label={action.label}
        icon={action.icon}
        on:click={onclick.bind(undefined, action.id)}
        disabled={disabled}
        inProgress={loading}>{action.label}</Button>
    </Tooltip>
  {/each}
</div>
