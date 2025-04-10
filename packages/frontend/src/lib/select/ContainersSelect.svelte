<script lang="ts">
import Select from '/@/lib/select/Select.svelte';
import type { SimpleContainerInfo } from '/@shared/src/models/simple-container-info';

interface Props {
  value: SimpleContainerInfo | undefined;
  onChange?: (value: SimpleContainerInfo | undefined) => void;
  containers: SimpleContainerInfo[];
  disabled?: boolean;
}

let { value = $bindable(), containers, onChange, disabled }: Props = $props();

/**
 * Handy mechanism to provide the mandatory property `label` and `value` to the Select component
 */
let selected: (SimpleContainerInfo & { label: string; value: string }) | undefined = $derived.by(() => {
  if (value) {
    return { ...value, label: value.name, value: value.name };
  }
  return undefined;
});

function handleOnChange(nValue: SimpleContainerInfo | undefined): void {
  value = nValue;
  onChange?.(value);
}

function getContainerStatusColor(item: SimpleContainerInfo): string {
  switch (item.state) {
    case 'running':
      return 'bg-[var(--pd-status-running)]';
    default:
      return 'bg-[var(--pd-status-stopped)]';
  }
}
</script>

<Select
  label="Select Container"
  name="select-container"
  disabled={disabled}
  value={selected}
  onchange={handleOnChange}
  placeholder="Select container to use"
  items={containers.map(container => ({
    ...container,
    value: container.name,
    label: container.name,
  }))}>
  <div slot="item" let:item>
    <div class="flex items-center">
      <div class="flex w-2 h-2 me-2 rounded-full {getContainerStatusColor(item)}"></div>
      <div class="grow">
        <span>{item.name.substring(1)}</span>
      </div>
    </div>
  </div>
</Select>
