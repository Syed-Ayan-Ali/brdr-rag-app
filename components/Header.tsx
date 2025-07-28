"use client"

import { Menu, Sparkles, Triangle } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Combobox } from "@/components/ui/combobox"
import { useCollections } from "@/hooks/use-collections"
import { useEffect } from "react"

interface HeaderProps {
  selectedCollectionId?: string
  onCollectionChange?: (collectionId: string) => void
}

export function Header({ selectedCollectionId, onCollectionChange }: HeaderProps) {
  const { collections, loading, error } = useCollections()

  const collectionOptions = collections.map((collection) => ({
    value: collection.collection_table_id,
    label: collection.collection_chunk_table_id,
  }))
  
  return (
    <header className="flex items-center justify-between p-4 border-b">
      <div className="flex items-center space-x-4">
        <Button variant="ghost" size="icon">
          <Menu className="h-5 w-5" />
        </Button>
        <div className="flex items-center space-x-2">
          <span className="font-semibold">HKMA RAG SEARCH</span>
        </div>
      </div>
      
      <div className="flex items-center space-x-4">
        <div className="w-64">
          <Combobox
            options={collectionOptions}
            value={selectedCollectionId || 'all'}
            onValueChange={onCollectionChange}
            placeholder={loading ? "Loading collections..." : "Select collection..."}
            searchPlaceholder="Search collections..."
            emptyText="No collections found."
          />
        </div>
        
      </div>
    </header>
  )
}