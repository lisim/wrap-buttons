import type { Handoff } from '../types'

// The handoff from the marker on, and its next-step line; null when the reply has no marker.
export function parseHandoff(answer: string, marker: string, nextLabel: string): Handoff | null {
  const at = answer.indexOf(marker)
  if (at < 0) return null
  const card = answer.slice(answer.lastIndexOf('\n', at) + 1).trim()
  const line = card.split('\n').find(l => l.includes(nextLabel)) ?? ''
  const after = line.slice(line.indexOf(nextLabel) + nextLabel.length)
  const next = after.replace(/^[*_\s]*:?[*_\s]*:?\s*/, '').trim()
  return { card, next }
}

export function carryOver(h: Handoff, nextLabel: string): string {
  return `Continuing from the last session. Its handoff:\n\n${h.card}\n\n${nextLabel}: ${h.next || '(see handoff)'}`
}
