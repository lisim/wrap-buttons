export type Handoff = { card: string; next: string }

declare module 'claude-code' {
  interface PluginState {
    'wrap-buttons': { handoff: Handoff | null; setupBand: boolean }
  }
}
