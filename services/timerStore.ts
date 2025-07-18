import { supabase } from './supabaseClient';

export interface PuzzleTimer {
  puzzle_id: string;
  start_time: string | null;
  duration: number;
}

export async function getOrCreateTimer(
  puzzleId: string,
  duration: number,
  startTime: string | null
): Promise<PuzzleTimer | null> {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from('puzzle_timers')
      .select('puzzle_id,start_time,duration')
      .eq('puzzle_id', puzzleId)
      .single();
    if (!error && data) {
      return data as PuzzleTimer;
    }
  } catch (e) {
    console.error('timer fetch failed', e);
  }
  try {
    const { data, error } = await supabase
      .from('puzzle_timers')
      .insert([{ puzzle_id: puzzleId, start_time: startTime, duration }])
      .select()
      .single();
    if (!error) {
      return data as PuzzleTimer;
    }
  } catch (e) {
    console.error('timer init failed', e);
  }
  return null;
}

export async function setTimerStart(
  puzzleId: string,
  startTime: string
): Promise<void> {
  if (!supabase) return;
  try {
    await supabase
      .from('puzzle_timers')
      .update({ start_time: startTime })
      .eq('puzzle_id', puzzleId);
  } catch (e) {
    console.error('timer update failed', e);
  }
}
