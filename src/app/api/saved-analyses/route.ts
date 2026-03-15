import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  withAuthenticatedRoute,
  badRequest,
  routeErrorResponse,
} from '@/lib/api/route-handler'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/types'

type SavedAnalysisRow = Database['public']['Tables']['saved_analyses']['Row']
type SavedAnalysisInsert =
  Database['public']['Tables']['saved_analyses']['Insert']
type AiInsightRow = Database['public']['Tables']['ai_insights']['Row']

// Join result type for GET handler (PostgREST resolves joins at runtime from DB FKs)
type SavedWithInsight = SavedAnalysisRow & {
  ai_insights: Pick<
    AiInsightRow,
    | 'id'
    | 'external_game_id'
    | 'sport'
    | 'summary'
    | 'key_factors'
    | 'value_assessment'
    | 'risk_level'
    | 'confidence'
    | 'disclaimer'
    | 'expires_at'
    | 'created_at'
  > | null
}

// Supabase's createServerClient type inference resolves saved_analyses to `never`.
// Explicit cast to SupabaseClient<Database> fixes the inference.
function typedClient(supabase: Awaited<ReturnType<typeof createClient>>) {
  return supabase as unknown as SupabaseClient<Database>
}

export async function GET(request: Request) {
  return withAuthenticatedRoute(
    request,
    'list-saved-analyses',
    async ({ user }) => {
      const supabase = typedClient(await createClient())

      const { data, error } = await supabase
        .from('saved_analyses')
        .select(
          `
          id,
          user_id,
          insight_id,
          notes,
          created_at,
          ai_insights (
            id,
            external_game_id,
            sport,
            summary,
            key_factors,
            value_assessment,
            risk_level,
            confidence,
            disclaimer,
            expires_at,
            created_at
          )
        `
        )
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) {
        return routeErrorResponse('list-saved-analyses', error)
      }

      // PostgREST join resolves via DB foreign keys; cast to typed result
      const typed = data as unknown as SavedWithInsight[]

      return NextResponse.json({
        savedAnalyses: typed ?? [],
        total: typed?.length ?? 0,
      })
    }
  )
}

export async function POST(request: Request) {
  return withAuthenticatedRoute(
    request,
    'save-analysis',
    async ({ user }) => {
      let body: { insightId?: string; notes?: string }
      try {
        body = await request.json()
      } catch {
        return badRequest('Invalid JSON body')
      }

      const { insightId, notes } = body

      if (!insightId || typeof insightId !== 'string') {
        return badRequest('insightId is required')
      }

      const supabase = typedClient(await createClient())

      // Verify the insight exists
      const { data: insight, error: insightError } = await supabase
        .from('ai_insights')
        .select('id')
        .eq('id', insightId)
        .single()

      if (insightError || !insight) {
        return NextResponse.json(
          { error: 'Analysis not found' },
          { status: 404 }
        )
      }

      // Check if already saved to avoid duplicates
      const { data: existing } = await supabase
        .from('saved_analyses')
        .select('id')
        .eq('user_id', user.id)
        .eq('insight_id', insightId)
        .single()

      if (existing) {
        return NextResponse.json(
          { error: 'Analysis already saved' },
          { status: 409 }
        )
      }

      const insertRow: SavedAnalysisInsert = {
        user_id: user.id,
        insight_id: insightId,
        notes: notes ?? null,
      }

      const { data: saved, error: insertError } = await supabase
        .from('saved_analyses')
        .insert(insertRow)
        .select()
        .single()

      if (insertError) {
        return routeErrorResponse('save-analysis', insertError)
      }

      return NextResponse.json(saved, { status: 201 })
    }
  )
}

export async function PATCH(request: Request) {
  return withAuthenticatedRoute(
    request,
    'update-saved-analysis',
    async ({ user }) => {
      const url = new URL(request.url)
      const id = url.searchParams.get('id')

      if (!id) {
        return badRequest('id query parameter is required')
      }

      let body: { notes?: string | null }
      try {
        body = await request.json()
      } catch {
        return badRequest('Invalid JSON body')
      }

      const supabase = typedClient(await createClient())

      // Verify ownership
      const { data: record, error: lookupError } = await supabase
        .from('saved_analyses')
        .select('id, user_id')
        .eq('id', id)
        .single()

      if (lookupError || !record) {
        return NextResponse.json(
          { error: 'Saved analysis not found' },
          { status: 404 }
        )
      }

      if (record.user_id !== user.id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }

      const { data: updated, error: updateError } = await supabase
        .from('saved_analyses')
        .update({ notes: body.notes ?? null })
        .eq('id', id)
        .select()
        .single()

      if (updateError) {
        return routeErrorResponse('update-saved-analysis', updateError)
      }

      return NextResponse.json(updated)
    }
  )
}

export async function DELETE(request: Request) {
  return withAuthenticatedRoute(
    request,
    'delete-saved-analysis',
    async ({ user }) => {
      const url = new URL(request.url)
      const id = url.searchParams.get('id')

      if (!id) {
        return badRequest('id query parameter is required')
      }

      const supabase = typedClient(await createClient())

      // Verify ownership before deleting
      const { data: record, error: lookupError } = await supabase
        .from('saved_analyses')
        .select('id, user_id')
        .eq('id', id)
        .single()

      if (lookupError || !record) {
        return NextResponse.json(
          { error: 'Saved analysis not found' },
          { status: 404 }
        )
      }

      if (record.user_id !== user.id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }

      const { error: deleteError } = await supabase
        .from('saved_analyses')
        .delete()
        .eq('id', id)

      if (deleteError) {
        return routeErrorResponse('delete-saved-analysis', deleteError)
      }

      return NextResponse.json({ success: true })
    }
  )
}
