import 'server-only'
import { cache } from 'react'
import { createClient } from './supabase/server'
import { db } from './supabase/admin'

export type Session = { id: string; email: string; isAdmin: boolean }

export const getSession = cache(async (): Promise<Session | null> => {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await db().from('profiles').select('is_admin').eq('id', user.id).maybeSingle()
  return { id: user.id, email: user.email ?? '', isAdmin: !!data?.is_admin }
})
