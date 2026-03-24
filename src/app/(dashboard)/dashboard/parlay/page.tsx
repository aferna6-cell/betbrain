import type { Metadata } from 'next'
import { getAllOdds } from '@/lib/sports/odds'
import { ParlayBuilderForm } from '@/components/parlay-builder'
import { ParlayOptimizerPanel } from '@/components/parlay-optimizer'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Parlay Builder — BetBrain',
  description: 'Build a parlay and get AI analysis of combined probability vs payout odds.',
}

export default async function ParlayPage() {
  const oddsMap = await getAllOdds()
  const allGames = Array.from(oddsMap.values()).flatMap((r) => r.games)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Parlay Builder</h1>
        <p className="mt-1 text-muted-foreground">
          Build parlays manually or let the optimizer find the best combinations
          from today&apos;s games.
        </p>
      </div>

      <Tabs defaultValue="optimizer">
        <TabsList>
          <TabsTrigger value="optimizer">Optimizer</TabsTrigger>
          <TabsTrigger value="manual">Manual Builder</TabsTrigger>
        </TabsList>

        <TabsContent value="optimizer">
          <div className="space-y-4">
            <div className="bg-muted/20 rounded-lg p-3 text-sm text-muted-foreground">
              Select picks from today&apos;s games and the optimizer will find the best parlay
              combinations based on EV, correlation risk, and payout potential.
            </div>
            <ParlayOptimizerPanel games={allGames} />
          </div>
        </TabsContent>

        <TabsContent value="manual">
          <ParlayBuilderForm />
        </TabsContent>
      </Tabs>
    </div>
  )
}
