# Database Migration Guide

This guide helps you set up the enhanced database schema for the ETL pipeline using Prisma.

## The Problem

The `psql` command is not available on Windows by default, and direct SQL migrations can cause permission issues with Supabase. Prisma handles these issues automatically.

## Solutions

### Option 1: Use Prisma Migration (Recommended)

Prisma handles permissions and schema changes automatically:

```bash
npm run db:migrate:prisma
```

This will:
- Generate the Prisma client
- Create and apply migrations
- Handle permissions properly
- Work with Supabase without issues

### Option 2: Check Current Database Status

First, check what tables already exist:

```bash
npm run db:check
```

This will tell you which enhanced tables are missing and provide guidance.

### Option 3: Use Supabase Dashboard

1. **Go to your Supabase project dashboard**
2. **Navigate to SQL Editor**
3. **Copy the migration SQL** from `lib/etl/database/migration.sql`
4. **Paste and execute** the SQL in the Supabase SQL Editor

### Option 4: Use Prisma Studio

For a visual database interface:

```bash
npm run prisma:studio
```

This opens a web interface where you can:
- View your database schema
- Browse and edit data
- Run queries
- Manage your database visually

## Step-by-Step Process

### 1. Test Environment Variables

```bash
npm run env:test
```

This ensures your environment variables are loaded correctly.

### 2. Check Database Connection

```bash
npm run db:test
```

This tests your database connection and existing tables.

### 3. Check Missing Tables

```bash
npm run db:check
```

This shows which enhanced tables are missing.

### 4. Run Migration (Choose one method)

**Option A: Prisma Migration (Recommended)**
```bash
npm run db:migrate:prisma
```

**Option B: Supabase Dashboard**
- Go to your Supabase project
- Open SQL Editor
- Copy contents of `lib/etl/database/migration.sql`
- Execute the SQL

**Option C: Prisma Studio**
```bash
npm run prisma:studio
```

### 5. Verify Migration

```bash
npm run db:check
```

This should show all tables as existing.

### 6. Test ETL Pipeline

```bash
npm run etl:example
```

This tests the complete ETL pipeline.

## Migration SQL Content

The migration file (`lib/etl/database/migration.sql`) contains:

1. **Enhanced columns** for existing tables
2. **New tables** for knowledge graph features
3. **Indexes** for better performance
4. **Functions** for enhanced search
5. **Views** for easier querying

## Troubleshooting

### Common Issues

1. **"psql is not recognized"**
   - Install PostgreSQL or use Supabase Dashboard
   - See Option 2 above

2. **"Connection failed"**
   - Check your `DATABASE_URL` in `.env`
   - Verify your database is accessible

3. **"Permission denied"**
   - Ensure your database user has CREATE privileges
   - Check your Supabase project settings

4. **"Table already exists"**
   - This is normal, the migration uses `IF NOT EXISTS`
   - Continue with the next steps

### Getting Help

If you're still having issues:

1. **Check the logs** from `npm run db:check`
2. **Verify your environment** with `npm run env:test`
3. **Use Supabase Dashboard** as the most reliable method
4. **Contact support** if using a managed database service

## Next Steps

After successful migration:

1. **Test the ETL pipeline**: `npm run etl:example`
2. **Process your documents**: `npm run etl:process`
3. **Check the setup guide**: `ETL_SETUP_GUIDE.md`

## Alternative: Manual Table Creation

If you prefer to create tables manually, here are the key tables you need:

```sql
-- Keywords table
CREATE TABLE IF NOT EXISTS keywords (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    keyword TEXT UNIQUE NOT NULL,
    concept TEXT,
    weight FLOAT DEFAULT 1.0,
    frequency INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Chunk relationships table
CREATE TABLE IF NOT EXISTS chunk_relationships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_chunk_id UUID NOT NULL REFERENCES brdr_documents_data(id) ON DELETE CASCADE,
    target_chunk_id UUID NOT NULL REFERENCES brdr_documents_data(id) ON DELETE CASCADE,
    relationship_type TEXT NOT NULL,
    weight FLOAT DEFAULT 1.0,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(source_chunk_id, target_chunk_id, relationship_type)
);

-- Add enhanced columns to existing tables
ALTER TABLE brdr_documents 
ADD COLUMN IF NOT EXISTS keywords TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS topics TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS summary TEXT,
ADD COLUMN IF NOT EXISTS document_type TEXT,
ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'en';

ALTER TABLE brdr_documents_data 
ADD COLUMN IF NOT EXISTS chunk_type TEXT,
ADD COLUMN IF NOT EXISTS keywords TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS related_chunks TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS context_extension TEXT,
ADD COLUMN IF NOT EXISTS relationship_weights JSONB,
ADD COLUMN IF NOT EXISTS semantic_score FLOAT;
```

This covers the essential tables for the enhanced ETL pipeline to work. 