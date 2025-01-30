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
  class="text-sm text-center rounded-lg shadow-sm bg-[var(--pd-action-button-bg)] flex overflow-hidden">
  {#each options as option (option.id)}
    {@const selected = value === option.id}
    <li class="w-full">
      <button
        role="radio"
        aria-checked={selected}
        onclick={onclick.bind(undefined, option.id)}
        class:bg-[var(--pd-button-primary-bg)]={selected && !disabled}
        class:bg-[var(--pd-button-disabled)]={disabled}
        class:cursor-not-allowed={disabled}
        class="inline-block py-2 w-full bg-gray-100"
        title={option.label}
        aria-label={option.label}
        aria-current="page">
        {option.label}
      </button>
    </li>
  {/each}
</ul>
