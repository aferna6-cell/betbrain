'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { updateDisplayName } from './actions'

export function ProfileForm({ displayName }: { displayName: string }) {
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(formData: FormData) {
    setError(null)
    setSuccess(null)
    setLoading(true)
    const result = await updateDisplayName(formData)
    if (result?.error) {
      setError(result.error)
    }
    if (result?.success) {
      setSuccess(result.success)
    }
    setLoading(false)
  }

  return (
    <form action={handleSubmit} className="flex items-end gap-4">
      <div className="flex-1 space-y-2">
        <Label htmlFor="displayName">Display Name</Label>
        <Input
          id="displayName"
          name="displayName"
          type="text"
          placeholder="Your display name"
          defaultValue={displayName}
        />
        {error && <p className="text-sm text-destructive">{error}</p>}
        {success && <p className="text-sm text-green-500">{success}</p>}
      </div>
      <Button type="submit" disabled={loading}>
        {loading ? 'Saving...' : 'Save'}
      </Button>
    </form>
  )
}
