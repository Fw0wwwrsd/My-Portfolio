import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { FoodLog, MealType } from '../lib/types'

export interface NewLog {
  log_date: string
  meal_type: MealType
  description: string
  calories: number
  protein_g: number
  carbs_g: number
  fat_g: number
  source: 'ai' | 'search' | 'manual'
}

export function useLogsForDate(date: string) {
  return useQuery({
    queryKey: ['logs', date],
    queryFn: async (): Promise<FoodLog[]> => {
      const { data, error } = await supabase
        .from('food_logs')
        .select('*')
        .eq('log_date', date)
        .order('created_at')
      if (error) throw error
      return data as FoodLog[]
    },
  })
}

export function useLogsForRange(fromDate: string, toDate: string) {
  return useQuery({
    queryKey: ['logs-range', fromDate, toDate],
    queryFn: async (): Promise<FoodLog[]> => {
      const { data, error } = await supabase
        .from('food_logs')
        .select('*')
        .gte('log_date', fromDate)
        .lte('log_date', toDate)
        .order('log_date')
      if (error) throw error
      return data as FoodLog[]
    },
  })
}

export function useAddLog() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (log: NewLog) => {
      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user) throw new Error('Not signed in')
      const { error } = await supabase
        .from('food_logs')
        .insert({ ...log, user_id: userData.user.id })
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['logs'] })
      qc.invalidateQueries({ queryKey: ['logs-range'] })
    },
  })
}

export function useDeleteLog() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('food_logs').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['logs'] })
      qc.invalidateQueries({ queryKey: ['logs-range'] })
    },
  })
}

export function sumLogs(logs: FoodLog[]) {
  return logs.reduce(
    (acc, l) => ({
      calories: acc.calories + l.calories,
      protein_g: acc.protein_g + Number(l.protein_g),
      carbs_g: acc.carbs_g + Number(l.carbs_g),
      fat_g: acc.fat_g + Number(l.fat_g),
    }),
    { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 },
  )
}
