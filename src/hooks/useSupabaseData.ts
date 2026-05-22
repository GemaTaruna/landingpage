import { useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

export function useSupabaseCollection<T>(tableName: string, sortBy: string = 'created_at') {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = async () => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    try {
      const { data: result, error: fetchErr } = await supabase
        .from(tableName)
        .select('*')
        .order(sortBy, { ascending: false });

      if (fetchErr) throw fetchErr;

      // Backwards compatibility map to match our UI component signatures
      const mapped = (result || []).map((item: any) => ({
        ...item,
        avatarUrl: item.avatar_url || item.avatarUrl,
        imageUrl: item.image_url || item.imageUrl,
        isLarge: item.is_large !== undefined ? item.is_large : item.isLarge,
      })) as unknown as T[];

      setData(mapped);
      setError(null);
    } catch (err: any) {
      console.error(`Error fetching from Supabase table ${tableName}:`, err);
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    if (!isSupabaseConfigured) return;

    // Subscribe to real-time postgres changes
    const uniqueChannelName = `${tableName}-realtime-${Math.random().toString(36).substring(2, 9)}`;
    const channel = supabase
      .channel(uniqueChannelName)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: tableName },
        () => {
          fetchData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tableName, sortBy]);

  return { data, loading, error, refresh: fetchData };
}
