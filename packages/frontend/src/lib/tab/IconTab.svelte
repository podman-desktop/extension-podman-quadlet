<script lang="ts">
import type { IconDefinition } from '@fortawesome/free-solid-svg-icons';
import Fa from 'svelte-fa';

interface Props {
  selected: boolean;
  url: string;
  title: string;
  icon: IconDefinition;
}
let { selected, url, title, icon }: Props = $props();
</script>

<div
  class="pb-1 border-b-[3px] whitespace-nowrap hover:cursor-pointer focus:outline-[var(--pd-tab-highlight)]"
  class:border-[var(--pd-tab-highlight)]={selected}
  class:border-transparent={!selected}
  class:hover:border-[var(--pd-tab-hover)]={!selected}>
  <a
    href={url}
    class="px-4 text-[var(--pd-tab-text)] no-underline flex flex-row gap-x-1 items-center"
    class:text-[var(--pd-tab-text-highlight)]={selected}
    aria-controls="open-tabs-list-{title.toLowerCase()}-panel"
    id="open-tabs-list-{title.toLowerCase()}-link">
    <Fa class="h-4 w-4" icon={icon} />
    {title}
  </a>
</div>
