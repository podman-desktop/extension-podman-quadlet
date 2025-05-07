<script lang="ts">
/* eslint-disable sonarjs/no-use-of-empty-return-value */
import { faPen } from '@fortawesome/free-solid-svg-icons/faPen';
import { faFile } from '@fortawesome/free-solid-svg-icons/faFile';
import Fa from 'svelte-fa';
import { faTrash } from '@fortawesome/free-solid-svg-icons/faTrash';
import type { IconDefinition } from '@fortawesome/free-solid-svg-icons';

interface Props {
  selected: boolean;
  url: string;
  title: string;
  onEdit: () => void;
  onDelete: () => void;
}

let { url, selected, title, onEdit, onDelete }: Props = $props();

interface BtnProps {
  icon: IconDefinition;
  title: string;
  onclick: () => void;
}
</script>

{#snippet btn({ icon, title, onclick }: BtnProps)}
  <button
    role="tab"
    class="cursor-pointer hover:bg-[var(--pd-link-hover-bg)] w-4 h-4 rounded-full items-center justify-center flex"
    title={title}
    onclick={onclick}>
    <Fa size="xs" icon={icon} />
  </button>
{/snippet}

<div
  role="tablist"
  class="pb-1 border-b-[3px] whitespace-nowrap hover:cursor-pointer focus:outline-[var(--pd-tab-highlight)] px-4 flex gap-x-3 items-center"
  class:border-[var(--pd-tab-highlight)]={selected}
  class:border-transparent={!selected}
  class:hover:border-[var(--pd-tab-hover)]={!selected}>
  <Fa size="sm" icon={faFile} />
  <a
    href={url}
    class="text-[var(--pd-tab-text)] no-underline"
    class:text-[var(--pd-tab-text-highlight)]={selected}
    aria-controls="open-tabs-list-{title.toLowerCase()}-panel"
    id="open-tabs-list-{title.toLowerCase()}-link">
    {title}
  </a>
  {@render btn({ icon: faPen, title: 'Rename', onclick: onEdit })}
  {@render btn({ icon: faTrash, title: 'Remove', onclick: onDelete })}
</div>
