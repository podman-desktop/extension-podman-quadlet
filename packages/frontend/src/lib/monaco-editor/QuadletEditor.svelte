<script lang="ts">
import MonacoEditor from '/@/lib/monaco-editor/MonacoEditor.svelte';

interface Props {
  content: string;
  readOnly?: boolean;
}

let { content = $bindable(), readOnly }: Props = $props();
</script>

<MonacoEditor
  class="h-full"
  readOnly={readOnly}
  noMinimap
  bind:content={content}
  language="ini" />
