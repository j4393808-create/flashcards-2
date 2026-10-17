import 'server-only'
import { createHmac, timingSafeEqual } from 'node:crypto'
import { cookies } from 'next/headers'

export const ADMIN_COOKIE = 'fc_admin'

export function adminSessionValue() {
  const password = process.env.ADMIN_PASSWORD
  if (!password) return null
  return createHmac('sha256', password).update('flashcards-admin-session').digest('hex')
}

export function safeEqual(a: string, b: string) {
  const left = Buffer.from(a)
  const right = Buffer.from(b)
  return left.length === right.length && timingSafeEqual(left, right)
}

export async function isAdmin() {
  const expected = adminSessionValue()
  const actual = (await cookies()).get(ADMIN_COOKIE)?.value
  return !!expected && !!actual && safeEqual(actual, expected)
}

export async function requireAdmin() {
  if (!(await isAdmin())) throw new Error('Unauthorized')
}
