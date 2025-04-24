<script lang="ts">
import TemplateCard from '/@/lib/templates/TemplateCard.svelte';
import type { Template } from '/@shared/src/models/template';
import { onMount } from 'svelte';
import { quadletAPI } from '/@/api/client';

interface Props {
  onImport: (template: Template) => void;
}

let { onImport }: Props = $props();

let templates: Array<Template> = $state([]);

onMount(async () => {
  templates = await quadletAPI.templates();
});
</script>

<div role="list" aria-label="templates" class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mt-4">
  {#each templates as template (template.name)}
    <TemplateCard template={template} onImport={onImport.bind(undefined, template)} />
  {/each}
</div>

