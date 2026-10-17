'use server'

import { randomBytes } from 'node:crypto'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { ACCESS_COOKIE } from '@/lib/access'
import { db } from '@/lib/supabase/admin'

export type RedeemState = { ok: boolean; message: string } | null

const normalizeCode = (raw: string) => raw.toUpperCase().replace(/[^A-Z0-9]/g, '')

export async function redeemCode(_prev: RedeemState, formData: FormData): Promise<RedeemState> {
  const raw = normalizeCode(String(formData.get('code') ?? ''))
  if (raw.length !== 12) return { ok: false, message: 'Invalid or already used code.' }
  const code = raw.match(/.{4}/g)!.join('-')

  const jar = await cookies()
  let token = jar.get(ACCESS_COOKIE)?.value
  if (!token || !/^[a-f0-9]{48}$/.test(token)) token = randomBytes(24).toString('hex')

  const { data: claimed } = await db()
    .from('access_codes')
    .update({ redeemed_token: token, redeemed_at: new Date().toISOString() })
    .eq('code', code)
    .eq('revoked', false)
    .is('redeemed_token', null)
    .select('code')

  if (!claimed?.length) {
    const { data: existing } = await db()
      .from('access_codes')
      .select('code')
      .eq('code', code)
      .eq('revoked', false)
      .eq('redeemed_token', token)
      .maybeSingle()
    if (!existing) return { ok: false, message: 'Invalid or already used code.' }
  }

  jar.set(ACCESS_COOKIE, token, {
    httpOnly: true,
    secure: true,
    sameSite: 'none',
    path: '/',
    maxAge: 60 * 60 * 24 * 365 * 5,
  })
  revalidatePath('/', 'layout')
  return { ok: true, message: 'Code activated. Your content is unlocked on this device.' }
}
