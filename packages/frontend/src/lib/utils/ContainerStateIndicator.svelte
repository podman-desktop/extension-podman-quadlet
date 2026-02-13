<script lang="ts">
interface Props {
  state: string;
}

const { state } = $props();

let background: string = $derived.by(() => {
  switch (state) {
    case 'running':
      return 'var(--pd-status-running)';
    default:
      return 'var(--pd-status-stopped)';
  }
});
</script>

<div style="background-color: {background}" class="flex w-2 h-2 me-2 rounded-full"></div>
