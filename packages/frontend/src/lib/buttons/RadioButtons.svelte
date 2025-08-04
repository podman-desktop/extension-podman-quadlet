<script lang="ts">
interface Radio {
  id: string;
  label: string;
}

interface Props {
  options: Radio[];
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  label?: string;
}

let { options, value, onChange, disabled, label }: Props = $props();

function onclick(id: string): void {
  if (disabled) return;
  onChange(id);
}
</script>

<ul
  role="radiogroup"
  aria-label={label}
  class:border-[var(--pd-button-primary-bg)]={!disabled}
  class:border-[var(--pd-button-disabled)]={disabled}
  class="text-sm text-center shadow-sm border-[1px] flex overflow-hidden rounded-[4px] h-[32px]">
  {#each options as option (option.id)}
    {@const selected = value === option.id}
    <li class="w-full">
      <button
        role="radio"
        aria-checked={selected}
        onclick={onclick.bind(undefined, option.id)}
        class:bg-[var(--pd-button-primary-bg)]={selected && !disabled}
        class:bg-[var(--pd-button-disabled)]={disabled}
        class:text-[var(--pd-button-text)]={selected && !disabled}
        class:text-[var(--pd-button-disabled-text)]={disabled}
        class:text-[var(--pd-button-secondary)]={!disabled}
        class:hover:text-[var(--pd-button-text)]={!disabled}
        class:hover:bg-[var(--pd-button-secondary-hover)]={!disabled}
        class:cursor-not-allowed={disabled}
        class="inline-block w-full h-full"
        title={option.label}
        aria-label={option.label}
        aria-current="page">
        {option.label}
      </button>
    </li>
  {/each}
</ul>
