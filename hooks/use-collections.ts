"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/db/supabase"

export interface Collection {
  collection_table_id: string
  collection_chunk_table_id: string
  description?: string
}

export function useCollections() {
  const [collections, setCollections] = useState<Collection[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchCollections = async () => {
    try {
      setLoading(true)
      setError(null)

      const { data, error } = await supabase
        .from('collections')
        .select('collection_table_id, collection_chunk_table_id, description')
        .order('collection_table_id')

      if (error) {
        throw error
      }

      setCollections(data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch collections')
      console.error('Error fetching collections:', err)
    } finally {
      setLoading(false)
    }
  }

  // create a new collection
  const createCollection = async (props: Collection) => {
    const { collection_table_id, collection_chunk_table_id, description } = props
    try {
      setLoading(true)
      setError(null)

      const { data, error } = await supabase
        .from('collections')
        .insert({
          collection_table_id,
          collection_chunk_table_id,
          description,
          created_at: new Date(),
          metadata: {},
          embedding: [],
        })
        .single()
      if (error) {
        throw error
      }

      setCollections((prev) => [...prev, data])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create collection')
      console.error('Error creating collection:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCollections()
  }, [])

  return { collections, loading, error, refetch: fetchCollections }
}


