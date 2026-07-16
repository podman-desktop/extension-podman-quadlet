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
        class={['inline-block w-full h-full', {
          'bg-(--pd-button-primary-bg) text-(--pd-button-primary-text)': selected && !disabled,
          'text-[var(--pd-button-secondary-text)] hover:bg-[var(--pd-button-secondary-hover-bg)]': !selected && !disabled,
          'bg-(--pd-button-disabled) text-(--pd-button-disabled-text) cursor-not-allowed': disabled,
          'cursor-pointer': !disabled,
        }]}
        title={option.label}
        aria-label={option.label}
        aria-current="page">
        {option.label}
      </button>
    </li>
  {/each}
</ul>
