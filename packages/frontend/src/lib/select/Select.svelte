<script lang="ts" generics="T extends { label: string; value: string }">
import Select from 'svelte-select';
import type { Snippet } from 'svelte';

interface Props {
  disabled?: boolean;
  value?: T;
  items: T[];
  placeholder?: string;
  label?: string;
  name?: string;
  onchange?: (value: T | undefined) => void;
  clearable?: boolean;
  item?: Snippet<[{ item: T }]>;
}

let {
  disabled = false,
  items = [],
  item: itemSnippet,
  value = $bindable(),
  placeholder,
  label,
  name,
  onchange,
  clearable = true,
}: Props = $props();

function handleOnChange(item: T): void {
  value = item;
  onchange?.(value);
}

function handleOnClear(): void {
  value = undefined;
  onchange?.(value);
}
</script>

{#snippet item({ item }: { item: { label: string; value: string } })}
  <div>{item.label}</div>
{/snippet}

<Select
  inputAttributes={{ 'aria-label': label }}
  name={name}
  disabled={disabled}
  value={value}
  onclear={handleOnClear}
  onchange={handleOnChange}
  --item-color="var(--pd-dropdown-item-text)"
  --item-is-active-color="var(--pd-dropdown-item-text)"
  --item-hover-color="var(--pd-dropdown-item-hover-text)"
  --item-active-background="var(--pd-input-field-hover-stroke)"
  --item-is-active-bg="var(--pd-input-field-hover-stroke)"
  --background="var(--pd-dropdown-bg)"
  --list-background="var(--pd-dropdown-bg)"
  --item-hover-bg="var(--pd-dropdown-item-hover-bg)"
  --border="1px solid var(--pd-input-field-stroke)"
  --disabled-border-color="var(--pd-button-disabled)"
  --border-hover={!disabled ? '1px solid var(--pd-input-field-hover-stroke)' : '1px solid var(--pd-button-disabled)'}
  --placeholderOpacity="1"
  --disabled-placeholder-color="var(--pd-button-disabled)"
  --disabled-placeholder-opacity="0.5"
  --placeholderColor="var(--pd-dropdown-item-text)"
  --list-border="1px solid var(--pd-input-field-stroke)"
  --border-focused="1px solid var(--pd-input-field-hover-stroke)"
  --selected-item-padding="0 0 0 0"
  --list-z-index="99"
  --font-size="12px"
  --height="32px"
  --max-height="32px"
  placeholder={placeholder}
  clearable={clearable}
  class="!bg-[var(--pd-content-bg)] !text-[var(--pd-content-card-text)]"
  items={items}
  showChevron={!disabled}
  item={(itemSnippet ?? item) as Snippet<[{ item: Record<string, unknown> }]>} />
