import 'server-only'
import { cookies } from 'next/headers'
import { db } from './supabase/admin'

export const ACCESS_COOKIE = 'fc_access'

export type Access = { allPaid: boolean; deckIds: Set<string> }

export async function getAccess(): Promise<Access> {
  const token = (await cookies()).get(ACCESS_COOKIE)?.value
  const access: Access = { allPaid: false, deckIds: new Set() }
  if (!token) return access

  const { data } = await db()
    .from('access_codes')
    .select('all_paid, deck_ids')
    .eq('redeemed_token', token)
    .eq('revoked', false)
  for (const row of data ?? []) {
    if (row.all_paid) access.allPaid = true
    for (const id of row.deck_ids as string[]) access.deckIds.add(id)
  }
  return access
}

export function canOpen(deck: { id: string; isFree: boolean }, access: Access) {
  return deck.isFree || access.allPaid || access.deckIds.has(deck.id)
}
