import type { Metadata } from 'next'
import { NotificationPage } from '@/components/notification-center'
import { NotificationPreferencesPanel } from '@/components/notification-preferences'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'

export const metadata: Metadata = {
  title: 'Notifications — BetBrain',
  description: 'Activity feed of picks, alerts, signals, and warnings.',
}

export default function NotificationsRoute() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Notifications</h1>
        <p className="text-sm text-muted-foreground">
          Your activity feed — picks resolved, alerts triggered, signals detected.
        </p>
      </div>

      <Tabs defaultValue="feed">
        <TabsList>
          <TabsTrigger value="feed">Feed</TabsTrigger>
          <TabsTrigger value="preferences">Preferences</TabsTrigger>
        </TabsList>

        <TabsContent value="feed">
          <NotificationPage />
        </TabsContent>

        <TabsContent value="preferences" className="mt-4">
          <NotificationPreferencesPanel />
        </TabsContent>
      </Tabs>
    </div>
  )
}
