<script lang="ts">
  import { getCanvasContext } from '$lib/components/canvas/canvas.state.svelte';
  import type { SidebarTab } from '$lib/components/canvas/canvas.state.svelte';
  import { display } from '$lib/utils/display.svelte';
  import PhoneticSection from './PhoneticSection.svelte';
  import GrammarSection from './GrammarSection.svelte';
  import GlossarySection from './GlossarySection.svelte';

  const state = getCanvasContext();

  const tabs: { id: SidebarTab; label: string }[] = [
    { id: 'glossary', label: 'Glossary' },
    { id: 'grammar', label: 'Grammar' },
    { id: 'phonetic', label: 'Phonetic' }
  ];
</script>

<aside class="deep-context-sidebar" class:open={state.sidebarOpen} aria-hidden={!state.sidebarOpen}>
  <header class="sidebar-header">
    <div class="tablist" role="tablist" aria-label="Token detail sections">
      {#each tabs as tab (tab.id)}
        <button
          type="button"
          role="tab"
          class="tab-btn"
          class:active={state.activeSidebarTab === tab.id}
          aria-selected={state.activeSidebarTab === tab.id}
          onclick={() => state.setSidebarTab(tab.id)}
        >
          {tab.label}
        </button>
      {/each}
    </div>
    <button type="button" class="close-btn" aria-label="Close sidebar" onclick={() => state.closeSidebar()}>
      &times;
    </button>
  </header>

  {#if state.selectedToken}
    <div class="selected-token-info">
      <span class="token-value">{state.selectedToken.value}</span>
      {#if display.romanizationVisible}
        <span class="token-romanization">{state.selectedToken.romanization}</span>
      {/if}
      <span class="token-gloss">{state.selectedToken.gloss}</span>
    </div>
  {/if}

  <div class="sidebar-content">
    {#if state.activeSidebarTab === 'grammar'}
      <GrammarSection />
    {:else if state.activeSidebarTab === 'phonetic'}
      <PhoneticSection />
    {:else}
      <GlossarySection />
    {/if}
  </div>
</aside>

<style>
  .deep-context-sidebar {
    position: absolute;
    top: 0;
    right: 0;
    bottom: 0;
    width: var(--sidebar-width-desktop);
    background: var(--sidebar-bg);
    border-left: 1px solid var(--sidebar-border);
    display: flex;
    flex-direction: column;
    z-index: 40;
    box-shadow: var(--shadow-node);
    transform: translateX(100%);
    transition: transform 300ms cubic-bezier(0.32, 0.72, 0, 1);
  }

  .deep-context-sidebar.open {
    transform: translateX(0);
  }

  .sidebar-header {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: space-between;
    border-bottom: 1px solid var(--color-edge);
    padding: 0 0.5rem 0 1rem;
  }

  .tablist {
    display: flex;
    gap: 1rem;
  }

  .tab-btn {
    background: none;
    border: none;
    cursor: pointer;
    padding: 0.875rem 0;
    font-size: 0.8125rem;
    color: var(--color-text-secondary);
    border-bottom: 2px solid transparent;
    transition: color 150ms ease, border-color 150ms ease;
  }

  .tab-btn:hover {
    color: var(--color-text-primary);
  }

  .tab-btn.active {
    color: var(--color-accent-primary);
    border-bottom-color: var(--color-accent-primary);
  }

  .close-btn {
    background: none;
    border: none;
    cursor: pointer;
    color: var(--color-text-secondary);
    font-size: 1.25rem;
    line-height: 1;
    padding: 0.5rem;
    transition: color 150ms ease;
  }

  .close-btn:hover {
    color: var(--color-text-primary);
  }

  .selected-token-info {
    flex-shrink: 0;
    display: flex;
    align-items: baseline;
    gap: 0.5rem;
    padding: 0.75rem 1.25rem 0;
  }

  .token-value {
    font-size: 1rem;
    font-weight: 600;
    color: var(--color-text-primary);
  }

  .token-romanization {
    font-size: 0.8125rem;
    font-style: italic;
    color: var(--color-text-secondary);
  }

  .token-gloss {
    font-size: 0.8125rem;
    color: var(--color-text-muted);
  }

  .sidebar-content {
    flex: 1;
    overflow-y: auto;
  }
</style>
