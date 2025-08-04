<script lang="ts">
import { FormPage } from '@podman-desktop/ui-svelte';
import { router } from 'tinro';
import { faCode } from '@fortawesome/free-solid-svg-icons/faCode';
import ProgressBar from '/@/lib/progress/ProgressBar.svelte';
import Fa from 'svelte-fa';
import QuadletComposeForm from '/@/lib/forms/compose/QuadletComposeForm.svelte';

interface Props {
  filepath?: string;
  providerId?: string;
  connection?: string;
}

let { ...restProps }: Props = $props();

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
  onbreadcrumbClick={close}>
  {#snippet icon()}
    <div class="rounded-full w-8 h-8 flex items-center justify-center">
      <Fa size="1.125x" class="text-[var(--pd-content-header-icon)]" icon={faCode} />
    </div>
  {/snippet}
  {#snippet content()}
    <div class="flex flex-col w-full">
      <!-- loading indicator -->
      <div class="h-0.5">
        <!-- avoid flickering -->
        {#if loading}
          <ProgressBar class="w-full h-0.5" width="w-full" height="h-0.5" />
        {/if}
      </div>

      <QuadletComposeForm bind:loading={loading} {...restProps} />
    </div>
  {/snippet}
</FormPage>
