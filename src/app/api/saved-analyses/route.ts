import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  withAuthenticatedRoute,
  badRequest,
  routeErrorResponse,
} from '@/lib/api/route-handler'
import type { Database } from '@/lib/supabase/types'

type SavedAnalysisRow = Database['public']['Tables']['saved_analyses']['Row']
type SavedAnalysisInsert =
  Database['public']['Tables']['saved_analyses']['Insert']
type AiInsightRow = Database['public']['Tables']['ai_insights']['Row']

export async function GET(request: Request) {
  return withAuthenticatedRoute(
    request,
    'list-saved-analyses',
    async ({ user }) => {
      const supabase = await createClient()

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
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

      return NextResponse.json({
        savedAnalyses: (data as unknown[]) ?? [],
        total: (data as unknown[] | null)?.length ?? 0,
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

      const supabase = await createClient()

      // Verify the insight exists
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: insight, error: insightError } = await (supabase as any)
        .from('ai_insights')
        .select('id')
        .eq('id', insightId)
        .single()

      const typedInsight = insight as Pick<AiInsightRow, 'id'> | null
      if (insightError || !typedInsight) {
        return NextResponse.json(
          { error: 'Analysis not found' },
          { status: 404 }
        )
      }

      // Check if already saved to avoid duplicates
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: existing } = await (supabase as any)
        .from('saved_analyses')
        .select('id')
        .eq('user_id', user.id)
        .eq('insight_id', insightId)
        .single()

      if (existing as SavedAnalysisRow | null) {
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

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: saved, error: insertError } = await (supabase as any)
        .from('saved_analyses')
        .insert(insertRow)
        .select()
        .single()

      if (insertError) {
        return routeErrorResponse('save-analysis', insertError)
      }

      return NextResponse.json(saved as SavedAnalysisRow, { status: 201 })
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

      const supabase = await createClient()

      // Verify ownership
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: record, error: lookupError } = await (supabase as any)
        .from('saved_analyses')
        .select('id, user_id')
        .eq('id', id)
        .single()

      const typedRecord = record as Pick<
        SavedAnalysisRow,
        'id' | 'user_id'
      > | null

      if (lookupError || !typedRecord) {
        return NextResponse.json(
          { error: 'Saved analysis not found' },
          { status: 404 }
        )
      }

      if (typedRecord.user_id !== user.id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: updated, error: updateError } = await (supabase as any)
        .from('saved_analyses')
        .update({ notes: body.notes ?? null } satisfies Partial<SavedAnalysisInsert>)
        .eq('id', id)
        .select()
        .single()

      if (updateError) {
        return routeErrorResponse('update-saved-analysis', updateError)
      }

      return NextResponse.json(updated as SavedAnalysisRow)
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

      const supabase = await createClient()

      // Verify ownership before deleting
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: record, error: lookupError } = await (supabase as any)
        .from('saved_analyses')
        .select('id, user_id')
        .eq('id', id)
        .single()

      const typedRecord = record as Pick<
        SavedAnalysisRow,
        'id' | 'user_id'
      > | null

      if (lookupError || !typedRecord) {
        return NextResponse.json(
          { error: 'Saved analysis not found' },
          { status: 404 }
        )
      }

      if (typedRecord.user_id !== user.id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: deleteError } = await (supabase as any)
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
