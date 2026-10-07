import type { Handoff } from '../types'

// The handoff from the marker's heading on, and its next-step line; null when no heading carries the marker.
export function parseHandoff(answer: string, marker: string, nextLabel: string): Handoff | null {
  const lines = answer.split('\n')
  const at = lines.findIndex(l => l.trimStart().startsWith('#') && l.includes(marker))
  if (at < 0) return null
  const card = lines.slice(at).join('\n').trim()
  const line = card.split('\n').find(l => l.includes(nextLabel)) ?? ''
  const after = line.slice(line.indexOf(nextLabel) + nextLabel.length)
  const next = after.replace(/^[*_\s]*:?[*_\s]*:?\s*/, '').trim()
  return { card, next }
}

export function carryOver(h: Handoff, nextLabel: string): string {
  return `Continuing from the last session. Its handoff:\n\n${h.card}\n\n${nextLabel}: ${h.next || '(see handoff)'}`
}
