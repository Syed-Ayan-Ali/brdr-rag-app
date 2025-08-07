-- Enhanced ETL Pipeline Database Migration
-- This script adds knowledge graph and smart chunking capabilities to the existing schema

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Add new columns to existing tables

-- Add enhanced columns to brdr_documents table
ALTER TABLE brdr_documents 
ADD COLUMN IF NOT EXISTS keywords TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS topics TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS summary TEXT,
ADD COLUMN IF NOT EXISTS document_type TEXT,
ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'en';

-- Add enhanced columns to brdr_documents_data table
ALTER TABLE brdr_documents_data 
ADD COLUMN IF NOT EXISTS chunk_type TEXT,
ADD COLUMN IF NOT EXISTS keywords TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS related_chunks TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS context_extension TEXT,
ADD COLUMN IF NOT EXISTS relationship_weights JSONB,
ADD COLUMN IF NOT EXISTS semantic_score FLOAT;

-- 2. Create new tables for knowledge graph

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

-- Keyword relationships table
CREATE TABLE IF NOT EXISTS keyword_relationships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_keyword_id UUID NOT NULL REFERENCES keywords(id) ON DELETE CASCADE,
    target_keyword_id UUID NOT NULL REFERENCES keywords(id) ON DELETE CASCADE,
    relationship_type TEXT NOT NULL,
    weight FLOAT DEFAULT 1.0,
    co_occurrence INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(source_keyword_id, target_keyword_id, relationship_type)
);

-- Document-keyword mappings table
CREATE TABLE IF NOT EXISTS document_keywords (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID NOT NULL REFERENCES brdr_documents(id) ON DELETE CASCADE,
    keyword_id UUID NOT NULL REFERENCES keywords(id) ON DELETE CASCADE,
    frequency INTEGER DEFAULT 1,
    weight FLOAT DEFAULT 1.0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(document_id, keyword_id)
);

-- Chunk-keyword mappings table
CREATE TABLE IF NOT EXISTS chunk_keywords (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    chunk_id UUID NOT NULL REFERENCES brdr_documents_data(id) ON DELETE CASCADE,
    keyword_id UUID NOT NULL REFERENCES keywords(id) ON DELETE CASCADE,
    frequency INTEGER DEFAULT 1,
    weight FLOAT DEFAULT 1.0,
    position INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(chunk_id, keyword_id)
);

-- Enhanced document metadata table
CREATE TABLE IF NOT EXISTS document_metadata (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID NOT NULL REFERENCES brdr_documents(id) ON DELETE CASCADE,
    metadata_type TEXT NOT NULL,
    metadata_key TEXT NOT NULL,
    metadata_value JSONB NOT NULL,
    confidence FLOAT DEFAULT 1.0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(document_id, metadata_type, metadata_key)
);

-- Image content table
CREATE TABLE IF NOT EXISTS image_content (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID NOT NULL REFERENCES brdr_documents(id) ON DELETE CASCADE,
    chunk_id UUID REFERENCES brdr_documents_data(id) ON DELETE SET NULL,
    image_url TEXT,
    image_data TEXT, -- Base64 encoded image data
    ocr_text TEXT,
    image_type TEXT,
    position JSONB,
    related_text TEXT,
    embedding VECTOR(1536),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create indexes for better performance

-- Indexes for keywords table
CREATE INDEX IF NOT EXISTS idx_keywords_keyword ON keywords(keyword);
CREATE INDEX IF NOT EXISTS idx_keywords_concept ON keywords(concept);
CREATE INDEX IF NOT EXISTS idx_keywords_weight ON keywords(weight);

-- Indexes for chunk relationships table
CREATE INDEX IF NOT EXISTS idx_chunk_relationships_type ON chunk_relationships(relationship_type);
CREATE INDEX IF NOT EXISTS idx_chunk_relationships_weight ON chunk_relationships(weight);
CREATE INDEX IF NOT EXISTS idx_chunk_relationships_source ON chunk_relationships(source_chunk_id);
CREATE INDEX IF NOT EXISTS idx_chunk_relationships_target ON chunk_relationships(target_chunk_id);

-- Indexes for keyword relationships table
CREATE INDEX IF NOT EXISTS idx_keyword_relationships_type ON keyword_relationships(relationship_type);
CREATE INDEX IF NOT EXISTS idx_keyword_relationships_weight ON keyword_relationships(weight);

-- Indexes for document_keywords table
CREATE INDEX IF NOT EXISTS idx_document_keywords_frequency ON document_keywords(frequency);
CREATE INDEX IF NOT EXISTS idx_document_keywords_weight ON document_keywords(weight);

-- Indexes for chunk_keywords table
CREATE INDEX IF NOT EXISTS idx_chunk_keywords_frequency ON chunk_keywords(frequency);
CREATE INDEX IF NOT EXISTS idx_chunk_keywords_weight ON chunk_keywords(weight);
CREATE INDEX IF NOT EXISTS idx_chunk_keywords_position ON chunk_keywords(position);

-- Indexes for document_metadata table
CREATE INDEX IF NOT EXISTS idx_document_metadata_type ON document_metadata(metadata_type);
CREATE INDEX IF NOT EXISTS idx_document_metadata_confidence ON document_metadata(confidence);

-- Indexes for image_content table
CREATE INDEX IF NOT EXISTS idx_image_content_type ON image_content(image_type);
CREATE INDEX IF NOT EXISTS idx_image_content_embedding ON image_content USING ivfflat (embedding vector_cosine_ops);

-- Indexes for enhanced columns in existing tables
CREATE INDEX IF NOT EXISTS idx_brdr_documents_keywords ON brdr_documents USING GIN(keywords);
CREATE INDEX IF NOT EXISTS idx_brdr_documents_topics ON brdr_documents USING GIN(topics);
CREATE INDEX IF NOT EXISTS idx_brdr_documents_document_type ON brdr_documents(document_type);
CREATE INDEX IF NOT EXISTS idx_brdr_documents_language ON brdr_documents(language);

CREATE INDEX IF NOT EXISTS idx_brdr_documents_data_chunk_type ON brdr_documents_data(chunk_type);
CREATE INDEX IF NOT EXISTS idx_brdr_documents_data_keywords ON brdr_documents_data USING GIN(keywords);
CREATE INDEX IF NOT EXISTS idx_brdr_documents_data_related_chunks ON brdr_documents_data USING GIN(related_chunks);
CREATE INDEX IF NOT EXISTS idx_brdr_documents_data_semantic_score ON brdr_documents_data(semantic_score);

-- 4. Create enhanced RPC functions for knowledge graph search

-- Function to search with knowledge graph relationships
CREATE OR REPLACE FUNCTION public.search_with_knowledge_graph(
    query_embedding VECTOR,
    match_count INTEGER DEFAULT 10,
    match_threshold DOUBLE PRECISION DEFAULT 0.3,
    min_content_length INTEGER DEFAULT 50,
    include_relationships BOOLEAN DEFAULT TRUE
)
RETURNS TABLE(
    doc_id TEXT,
    content TEXT,
    metadata JSONB,
    similarity DOUBLE PRECISION,
    related_chunks JSONB,
    keywords JSONB
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        d.doc_id,
        d.content,
        d.metadata,
        (1 - (d.embedding <=> query_embedding)) AS similarity,
        CASE 
            WHEN include_relationships THEN 
                COALESCE(
                    (SELECT json_agg(
                        json_build_object(
                            'target_chunk_id', cr.target_chunk_id,
                            'relationship_type', cr.relationship_type,
                            'weight', cr.weight
                        )
                    ) FROM chunk_relationships cr 
                    WHERE cr.source_chunk_id = d.id AND cr.weight >= 0.3),
                    '[]'::json
                )
            ELSE '[]'::json
        END AS related_chunks,
        CASE 
            WHEN include_relationships THEN 
                COALESCE(
                    (SELECT json_agg(
                        json_build_object(
                            'keyword', k.keyword,
                            'weight', ck.weight,
                            'concept', k.concept
                        )
                    ) FROM chunk_keywords ck
                    JOIN keywords k ON ck.keyword_id = k.id
                    WHERE ck.chunk_id = d.id),
                    '[]'::json
                )
            ELSE '[]'::json
        END AS keywords
    FROM brdr_documents_data d
    WHERE LENGTH(d.content) >= min_content_length
        AND (1 - (d.embedding <=> query_embedding)) >= match_threshold
    ORDER BY d.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

-- Function to get related chunks
CREATE OR REPLACE FUNCTION public.get_related_chunks(
    chunk_id UUID,
    max_relationships INTEGER DEFAULT 5,
    min_weight DOUBLE PRECISION DEFAULT 0.3
)
RETURNS TABLE(
    related_chunk_id UUID,
    relationship_type TEXT,
    weight DOUBLE PRECISION,
    content TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        cr.target_chunk_id,
        cr.relationship_type,
        cr.weight,
        d.content
    FROM chunk_relationships cr
    JOIN brdr_documents_data d ON cr.target_chunk_id = d.id
    WHERE cr.source_chunk_id = chunk_id
        AND cr.weight >= min_weight
    ORDER BY cr.weight DESC
    LIMIT max_relationships;
END;
$$;

-- Function to get keywords for a chunk
CREATE OR REPLACE FUNCTION public.get_chunk_keywords(
    chunk_id UUID
)
RETURNS TABLE(
    keyword TEXT,
    weight DOUBLE PRECISION,
    concept TEXT,
    frequency INTEGER
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        k.keyword,
        ck.weight,
        k.concept,
        ck.frequency
    FROM chunk_keywords ck
    JOIN keywords k ON ck.keyword_id = k.id
    WHERE ck.chunk_id = chunk_id
    ORDER BY ck.weight DESC;
END;
$$;

-- Function to get knowledge graph statistics
CREATE OR REPLACE FUNCTION public.get_knowledge_graph_stats()
RETURNS TABLE(
    total_chunks BIGINT,
    total_keywords BIGINT,
    total_relationships BIGINT,
    total_concepts BIGINT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        (SELECT COUNT(*) FROM brdr_documents_data) AS total_chunks,
        (SELECT COUNT(*) FROM keywords) AS total_keywords,
        (SELECT COUNT(*) FROM chunk_relationships) AS total_relationships,
        (SELECT COUNT(*) FROM keywords WHERE concept IS NOT NULL) AS total_concepts;
END;
$$;

-- 5. Create triggers for maintaining data consistency

-- Trigger to update keyword frequency when chunk_keywords is modified
CREATE OR REPLACE FUNCTION update_keyword_frequency()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE keywords 
        SET frequency = frequency + NEW.frequency
        WHERE id = NEW.keyword_id;
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        UPDATE keywords 
        SET frequency = frequency - OLD.frequency + NEW.frequency
        WHERE id = NEW.keyword_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE keywords 
        SET frequency = frequency - OLD.frequency
        WHERE id = OLD.keyword_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_keyword_frequency
    AFTER INSERT OR UPDATE OR DELETE ON chunk_keywords
    FOR EACH ROW EXECUTE FUNCTION update_keyword_frequency();

-- 6. Insert sample data for testing (optional)

-- Insert sample keywords
INSERT INTO keywords (keyword, concept, weight, frequency) VALUES
    ('regulation', 'regulation', 1.0, 10),
    ('compliance', 'regulation', 0.9, 8),
    ('financial', 'finance', 1.0, 12),
    ('reporting', 'finance', 0.8, 6),
    ('audit', 'compliance', 0.9, 7),
    ('risk', 'risk_management', 1.0, 9)
ON CONFLICT (keyword) DO NOTHING;

-- 7. Create views for easier querying

-- View for chunks with their keywords
CREATE OR REPLACE VIEW chunks_with_keywords AS
SELECT 
    d.id,
    d.doc_id,
    d.content,
    d.chunk_type,
    d.keywords,
    d.semantic_score,
    json_agg(
        json_build_object(
            'keyword', k.keyword,
            'weight', ck.weight,
            'concept', k.concept
        )
    ) AS extracted_keywords
FROM brdr_documents_data d
LEFT JOIN chunk_keywords ck ON d.id = ck.chunk_id
LEFT JOIN keywords k ON ck.keyword_id = k.id
GROUP BY d.id, d.doc_id, d.content, d.chunk_type, d.keywords, d.semantic_score;

-- View for documents with their concepts
CREATE OR REPLACE VIEW documents_with_concepts AS
SELECT 
    d.id,
    d.doc_id,
    d.document_type,
    d.topics,
    d.keywords,
    json_agg(DISTINCT k.concept) FILTER (WHERE k.concept IS NOT NULL) AS concepts
FROM brdr_documents d
LEFT JOIN document_keywords dk ON d.id = dk.document_id
LEFT JOIN keywords k ON dk.keyword_id = k.id
GROUP BY d.id, d.doc_id, d.document_type, d.topics, d.keywords;

-- 8. Grant necessary permissions (adjust as needed for your setup)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO your_user;
-- GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO your_user;

COMMENT ON TABLE keywords IS 'Stores extracted keywords and concepts for knowledge graph';
COMMENT ON TABLE chunk_relationships IS 'Stores relationships between chunks for enhanced search';
COMMENT ON TABLE keyword_relationships IS 'Stores relationships between keywords';
COMMENT ON TABLE image_content IS 'Stores image content with OCR and embeddings';
COMMENT ON FUNCTION search_with_knowledge_graph IS 'Enhanced search function that includes knowledge graph relationships';
COMMENT ON FUNCTION get_related_chunks IS 'Retrieves related chunks based on relationships';
COMMENT ON FUNCTION get_chunk_keywords IS 'Retrieves keywords associated with a chunk';
COMMENT ON FUNCTION get_knowledge_graph_stats IS 'Returns statistics about the knowledge graph';

-- Migration completed successfully
SELECT 'Enhanced ETL Pipeline database migration completed successfully!' AS status; 