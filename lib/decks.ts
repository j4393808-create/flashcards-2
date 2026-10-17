import cardiacCycle from '@/data/decks/cardiac-cycle.json'
import membraneTransport from '@/data/decks/membrane-transport.json'
import type { Deck } from './cloze'

export const decks: Deck[] = [membraneTransport as Deck, cardiacCycle as Deck]

export function getDeck(id: string) {
  return decks.find((deck) => deck.id === id)
}
