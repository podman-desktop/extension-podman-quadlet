<script lang="ts">
import Label from '/@/lib/label/Label.svelte';
import type { ProviderContainerConnectionIdentifierInfo } from '/@shared/src/models/provider-container-connection-identifier-info';
import { providerConnectionsInfo } from '/@store/connections';
import type { ProviderContainerConnectionDetailedInfo } from '/@shared/src/models/provider-container-connection-detailed-info';
import { generateColor } from '/@/utils/colors';

interface Props {
  object: ProviderContainerConnectionIdentifierInfo;
}

let { object }: Props = $props();

let details: ProviderContainerConnectionDetailedInfo | undefined = $derived(
  $providerConnectionsInfo.find(
    connection => connection.providerId === object.providerId && connection.name === object.name,
  ),
);
let name: string = $derived(`${object.name}${details?.vmType ? ` (${details.vmType})` : ''}`);

let color: string = $derived.by(() => {
  return generateColor(object.name);
});
</script>

<Label tip={name} name={name} capitalize>
  <div aria-label="connection info circle" style="background-color: {color}" class="w-2 h-2 rounded-full"></div>
</Label>
