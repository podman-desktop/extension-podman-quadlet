<script lang="ts">
import type { Template } from '/packages/shared/src/models/Template';
import Fa from 'svelte-fa';
import { faFileImport } from '@fortawesome/free-solid-svg-icons/faFileImport';

interface Props {
  template: Template;
  onImport: () => void;
}

let { template, onImport }: Props = $props();
</script>

<div class="no-underline">
  <div
    class="bg-[var(--pd-content-card-bg)] hover:bg-[var(--pd-content-card-hover-bg)] grow p-4 rounded-md flex-nowrap flex flex-col"
    role="region"
    aria-label={template.name}>
    <!-- body -->
    <div class="flex flex-col">
      <div class="flex flex-row text-base">
        <!-- left column -->
        <div class="flex flex-col grow">
          <span class="text-[var(--pd-content-card-header-text)]" aria-label="{template.name}">{template.name}</span>
          <span class="text-sm text-[var(--pd-content-card-text)]" aria-label="description">{template.description}</span>
        </div>

        <div class="flex flex-col">
          <!-- Import -->
          <button
            onclick={onImport}
            class="justify-center relative rounded-xs text-[var(--pd-button-secondary)] hover:text-[var(--pd-button-text)] text-center cursor-pointer flex flex-row">
            <div class="flex flex-row items-center text-[var(--pd-link)]">
              <Fa class="mr-2" icon={faFileImport} />
              <span> Import </span>
            </div>
          </button>
        </div>
      </div>

      <!-- files -->
      <div class="flex flex-col gap-2 py-2">
        <span class="text-[var(--pd-content-card-header-text)]">Files</span>
        <!-- List of files -->
        <div class="flex flex-row">
          <div
            class="flex flex-col bg-[var(--pd-label-bg)] text-[var(--pd-label-text)] max-w-full rounded-md p-2 mb-2 w-full h-min text-sm text-nowrap">
            {#each template.files as file (file.name)}
              <span>{file.name}</span>
            {/each}
          </div>
        </div>
      </div>
    </div>
  </div>
</div>
