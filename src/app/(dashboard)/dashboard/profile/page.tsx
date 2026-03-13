import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { ProfileForm } from './profile-form'
import type { Database } from '@/lib/supabase/types'

type Profile = Database['public']['Tables']['profiles']['Row']

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data } = await supabase
    .from('profiles')
    .select('*')
    .single()
  const profile = data as Profile | null

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Profile</h1>
        <p className="mt-1 text-muted-foreground">
          Manage your account settings
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Account Information</CardTitle>
            <CardDescription>Your account details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Email</p>
              <p className="font-medium">{user?.email}</p>
            </div>
            <Separator />
            <div>
              <p className="text-sm text-muted-foreground">Member since</p>
              <p className="font-medium">
                {profile?.created_at
                  ? new Date(profile.created_at).toLocaleDateString('en-US', {
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric',
                    })
                  : '\u2014'}
              </p>
            </div>
            <Separator />
            <div>
              <p className="text-sm text-muted-foreground">User ID</p>
              <p className="font-mono text-xs text-muted-foreground">{user?.id}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Subscription</CardTitle>
            <CardDescription>Your current plan</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Plan</p>
              <p className="text-2xl font-bold capitalize">
                {profile?.subscription_tier ?? 'Free'}
              </p>
            </div>
            <Separator />
            <div>
              <p className="text-sm text-muted-foreground">Daily analyses used</p>
              <p className="font-medium">
                {profile?.analyses_today ?? 0} / {profile?.subscription_tier === 'pro' ? 'Unlimited' : '3'}
              </p>
            </div>
            {profile?.subscription_tier === 'free' && (
              <p className="text-sm text-muted-foreground">
                Upgrade to Pro for unlimited analyses, all leagues, and alerts.
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Display Name</CardTitle>
            <CardDescription>Update your display name</CardDescription>
          </CardHeader>
          <CardContent>
            <ProfileForm displayName={profile?.display_name ?? ''} />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
