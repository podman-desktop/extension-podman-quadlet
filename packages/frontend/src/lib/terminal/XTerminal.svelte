<script lang="ts">
import '@xterm/xterm/css/xterm.css';
import { FitAddon } from '@xterm/addon-fit';
import { SerializeAddon } from '@xterm/addon-serialize';
import { Terminal } from '@xterm/xterm';

import { onDestroy, onMount } from 'svelte';
import type { Readable, Unsubscriber } from 'svelte/store';
import { copySelection, handleCopyKeyEvent } from '/@/lib/terminal/terminal-copy';
import { getTerminalTheme } from '/@/lib/terminal/terminal-theme';

let terminalXtermDiv: HTMLDivElement;
let serializeAddon: SerializeAddon;
let shellTerminal: Terminal;
let resizeObserver: ResizeObserver;

interface Props {
  store: Readable<string>;
  readonly?: boolean;
}

let { store, readonly }: Props = $props();

function writeMultilineString(xterm: Terminal, data: string, colorPrefix: string): void {
  if (data?.includes?.('\n')) {
    const toWrite = data.split('\n');
    for (const s of toWrite) {
      xterm.write(colorPrefix + s + '\n\r');
    }
  } else {
    xterm.write(colorPrefix + data + '\r');
  }
}

async function refreshTerminal(): Promise<void> {
  // missing element, return
  if (!terminalXtermDiv) {
    return;
  }
  shellTerminal = new Terminal({
    theme: getTerminalTheme(),
    disableStdin: readonly,
    // keep the current selection on right click (macOS would replace it with the word under the cursor), we copy it
    rightClickSelectsWord: false,
  });

  const fitAddon = new FitAddon();
  serializeAddon = new SerializeAddon();
  shellTerminal.loadAddon(fitAddon);
  shellTerminal.loadAddon(serializeAddon);

  shellTerminal.open(terminalXtermDiv);

  // xterm keeps its selection internally: make sure it can be copied (keyboard shortcuts and right click)
  shellTerminal.attachCustomKeyEventHandler(event => handleCopyKeyEvent(shellTerminal, event));

  // Resize the terminal each time we change the div size
  resizeObserver = new ResizeObserver(() => {
    fitAddon?.fit();
  });
  resizeObserver.observe(terminalXtermDiv);

  fitAddon.fit();
}

let storeUnsubscriber: Unsubscriber;
onMount(async () => {
  await refreshTerminal();

  storeUnsubscriber = store.subscribe(value => {
    shellTerminal.clear();
    writeMultilineString(shellTerminal, value, '');
  });
});

onDestroy(() => {
  // unsubscribe to update
  storeUnsubscriber();
  serializeAddon?.dispose();
  shellTerminal?.dispose();
  // Cleanup the observer on destroy
  resizeObserver?.unobserve(terminalXtermDiv);
});
</script>

<div
  role="presentation"
  class="h-full p-[5px] pr-0 bg-[var(--pd-terminal-background)]"
  bind:this={terminalXtermDiv}
  oncontextmenu={(event): void => {
    // only override the context menu when there is something to copy
    if (!shellTerminal?.hasSelection()) return;
    event.preventDefault();
    copySelection(shellTerminal).catch(console.error);
  }}>
</div>
