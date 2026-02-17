<script lang="ts">
import Select from '/@/lib/select/Select.svelte';
import type { SimpleVolumeInfo } from '@podman-desktop/quadlet-extension-core-api';

interface Props {
  value: SimpleVolumeInfo | undefined;
  onChange?: (value: SimpleVolumeInfo | undefined) => void;
  volumes: SimpleVolumeInfo[];
  disabled?: boolean;
}

let { value = $bindable(), volumes, onChange, disabled }: Props = $props();

/**
 * Handy mechanism to provide the mandatory property `label` and `value` to the Select component
 */
let selected: (SimpleVolumeInfo & { label: string; value: string }) | undefined = $derived.by(() => {
  if (value) {
    return { ...value, label: value.name, value: value.name };
  }
  return undefined;
});

function handleOnChange(nValue: SimpleVolumeInfo | undefined): void {
  value = nValue;
  onChange?.(value);
}
</script>

<Select
  label="Select Volume"
  name="select-volume"
  disabled={disabled}
  value={selected}
  onchange={handleOnChange}
  placeholder="Select Volume to use"
  items={volumes.map(volume => ({
    ...volume,
    value: volume.name,
    label: volume.name,
  }))}>
</Select>
