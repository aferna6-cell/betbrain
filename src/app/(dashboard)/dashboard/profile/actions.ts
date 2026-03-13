'use server'

import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/lib/supabase/types'

type ProfileUpdate = Database['public']['Tables']['profiles']['Update']

export async function updateDisplayName(formData: FormData) {
  const supabase = await createClient()
  const displayName = formData.get('displayName') as string

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Not authenticated.' }
  }

  const update: ProfileUpdate = { display_name: displayName || null }
  const { error } = await supabase
    .from('profiles')
    .update(update as never)
    .eq('id', user.id)

  if (error) {
    return { error: error.message }
  }

  return { success: 'Display name updated.' }
}
