<script lang="ts">
import { FormPage } from '@podman-desktop/ui-svelte';
import Fa from 'svelte-fa';
import ProgressBar from '/@/lib/progress/ProgressBar.svelte';
import { router } from 'tinro';
import QuadletGenerateForm from '/@/lib/forms/quadlet/QuadletGenerateForm.svelte';
import { faCode } from '@fortawesome/free-solid-svg-icons/faCode';
import type { QuadletGenerateFormProps } from '/@/lib/forms/quadlet/quadlet-utils';

// We get the query parameters from the parent
let props: QuadletGenerateFormProps = $props();

let loading: boolean = $state(false);

function close(): void {
  router.goto('/');
}
</script>

<FormPage
  title="Generate Quadlet"
  onclose={close}
  breadcrumbLeftPart="Quadlets"
  breadcrumbRightPart="Generate"
  breadcrumbTitle="Go back to quadlets page"
  onbreadcrumbClick={close}>
  <svelte:fragment slot="icon">
    <div class="rounded-full w-8 h-8 flex items-center justify-center">
      <Fa size="1.125x" class="text-[var(--pd-content-header-icon)]" icon={faCode} />
    </div>
  </svelte:fragment>
  <svelte:fragment slot="content">
    <div class="flex flex-col w-full">
      <!-- loading indicator -->
      <div class="h-0.5">
        <!-- avoid flickering -->
        {#if loading}
          <ProgressBar class="w-full h-0.5" width="w-full" height="h-0.5" />
        {/if}
      </div>

      <QuadletGenerateForm close={close} {...props} bind:loading={loading} />
    </div>
  </svelte:fragment>
</FormPage>
