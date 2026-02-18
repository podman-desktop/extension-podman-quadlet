<script lang="ts">
import Select from '/@/lib/select/Select.svelte';
import type { SimpleNetworkInfo } from '@podman-desktop/quadlet-extension-core-api';

interface Props {
  value: SimpleNetworkInfo | undefined;
  onChange?: (value: SimpleNetworkInfo | undefined) => void;
  networks: SimpleNetworkInfo[];
  disabled?: boolean;
}

let { value = $bindable(), networks, onChange, disabled }: Props = $props();

/**
 * Provide mandatory `label` and `value` to Select component
 */
let selected: (SimpleNetworkInfo & { label: string; value: string }) | undefined = $derived.by(() => {
  if (value) {
    return { ...value, label: value.name, value: value.id };
  }
  return undefined;
});

function handleOnChange(nValue: SimpleNetworkInfo | undefined): void {
  value = nValue;
  onChange?.(value);
}
</script>

<Select
  label="Select Network"
  name="select-network"
  disabled={disabled}
  value={selected}
  onchange={handleOnChange}
  placeholder="Select Network to use"
  items={networks.map(network => ({
    ...network,
    value: network.id,
    label: network.name,
  }))}>
</Select>
