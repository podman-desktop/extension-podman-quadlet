<script lang="ts">
import Select from '/@/lib/select/Select.svelte';
import type { SimplePodInfo } from '/@shared/src/models/simple-pod-info';
import ContainerStateIndicator from '/@/lib/utils/ContainerStateIndicator.svelte';

interface Props {
  value: SimplePodInfo | undefined;
  onChange?: (value: SimplePodInfo | undefined) => void;
  pods: SimplePodInfo[];
  disabled?: boolean;
}

let { value = $bindable(), pods, onChange, disabled }: Props = $props();

/**
 * Handy mechanism to provide the mandatory property `label` and `value` to the Select component
 */
let selected: (SimplePodInfo & { label: string; value: string }) | undefined = $derived.by(() => {
  if (value) {
    return { ...value, label: value.name, value: value.name };
  }
  return undefined;
});

function handleOnChange(nValue: SimplePodInfo | undefined): void {
  value = nValue;
  onChange?.(value);
}
</script>

<Select
  label="Select Pod"
  name="select-pod"
  disabled={disabled}
  value={selected}
  onchange={handleOnChange}
  placeholder="Select Pod to use"
  items={pods.map(pod => ({
    ...pod,
    value: pod.name,
    label: pod.name,
  }))}>
  <div slot="item" let:item>
    <div class="flex flex-row items-center">
      <span class="grow">{item.name}</span>
      <div class="flex flex-row gap-x-1">
        {#each item.containers as container (container.id)}
          <ContainerStateIndicator state={container.state} />
        {/each}
      </div>
    </div>
  </div>
</Select>
