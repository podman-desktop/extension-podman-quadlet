<script lang="ts">
import type { QuadletChildrenFormProps } from '/@/lib/forms/quadlet/quadlet-utils';

let { provider }: QuadletChildrenFormProps = $props();
</script>

<span>Volume quadlet form ({provider?.providerId})</span>
