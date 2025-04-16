<script lang="ts">
import { FormPage } from '@podman-desktop/ui-svelte';
import type { Template } from '/@shared/src/models/template';
import { router } from 'tinro';
import TemplateGrid from '/@/lib/templates/TemplateGrid.svelte';
import { loadIntoLocalStorage } from '/@/utils/templates';

function close(): void {
  router.goto('/');
}

function onImportTemplate(template: Template): void {
  loadIntoLocalStorage(template);
  router.goto('/quadlets/create');
}
</script>

<FormPage
  title="Quadlet Templates"
  onclose={close}
  breadcrumbLeftPart="Quadlets"
  breadcrumbRightPart="Templates"
  breadcrumbTitle="Go back to quadlets page"
  onbreadcrumbClick={close}>
  {#snippet content()}
    <div class="mx-5">
      <TemplateGrid onImport={onImportTemplate.bind(undefined)}/>
    </div>
  {/snippet}
</FormPage>
