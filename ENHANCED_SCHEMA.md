# Enhanced Database Schema for BRDR Integration

## Overview

The enhanced database schema has been designed to fully capture and utilize the rich metadata provided by the BRDR (Banking Returns Data Repository) API. This schema extends the existing ETL pipeline to store comprehensive document information, topics, concepts, and relationships.

## Key Enhancements

### 1. **BRDR-Specific Fields in `brdr_documents`**

The main documents table now includes all fields from the BRDR API response:

```sql
-- BRDR-specific fields
doc_uuid            TEXT,           -- BRDR UUID
doc_type_code       TEXT,           -- CIR, GL, etc.
doc_type_desc       TEXT,           -- "CIR - Circular"
version_code        TEXT,           -- Current, Historical
doc_long_title      TEXT,           -- Full document title
doc_desc            TEXT,           -- Document description
issue_date          TIMESTAMPTZ,    -- Document issue date
guideline_no        TEXT,           -- Guideline number
supersession_date   TIMESTAMPTZ,    -- Supersession date

-- BRDR-specific arrays (JSONB)
doc_topic_subtopic_list JSONB,      -- Full topic/subtopic list
doc_keyword_list     JSONB,         -- BRDR keyword list
doc_ai_type_list     JSONB,         -- AI type list
doc_view_list        JSONB,         -- View list
directly_related_doc_list JSONB,    -- Related documents
version_history_doc_list JSONB,     -- Version history
reference_doc_list   JSONB,         -- Reference documents
superseded_doc_list  JSONB,         -- Superseded documents
```

### 2. **New Tables for Enhanced Knowledge Graph**

#### **Topics Table**
Stores BRDR topics and subtopics with proper relationships:

```sql
CREATE TABLE topics (
  id                    UUID PRIMARY KEY,
  topic_code            TEXT UNIQUE NOT NULL,
  topic_desc            TEXT NOT NULL,
  subtopic_code         TEXT,
  subtopic_desc         TEXT,
  topic_subtopic_code   TEXT,
  topic_subtopic_desc   TEXT,
  display_sequence      INTEGER,
  created_at            TIMESTAMPTZ DEFAULT NOW()
);
```

#### **Concepts Table**
Stores higher-level concepts extracted from documents:

```sql
CREATE TABLE concepts (
  id              UUID PRIMARY KEY,
  concept_name    TEXT UNIQUE NOT NULL,
  concept_type    TEXT,           -- regulatory, financial, technical, etc.
  description     TEXT,
  weight          FLOAT DEFAULT 1.0,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
```

#### **Relationship Tables**
- `document_topics`: Links documents to topics
- `document_concepts`: Links documents to concepts
- `concept_keywords`: Links concepts to keywords

### 3. **Enhanced Data Processing**

The crawler now processes BRDR API responses to extract:

- **Topics**: From `docTopicSubtopicList` array
- **Concepts**: From document type and topic descriptions
- **Metadata**: All BRDR-specific fields and arrays
- **Relationships**: Between documents, topics, and concepts

## Example BRDR API Response Processing

Given this BRDR API response:

```json
{
  "docId": "20250203-4-EN",
  "docTypeDesc": "CIR - Circular",
  "docLongTitle": "Circular Issued by the Securities and Futures Commission...",
  "issueDate": "2025-01-27T16:00:00.000+00:00",
  "docTopicSubtopicList": [
    {
      "topicDesc": "Miscellaneous",
      "subtopicDesc": "SFC/IA/MPFA"
    },
    {
      "topicDesc": "Wealth Management & MPF",
      "subtopicDesc": "Securities/investment products"
    }
  ]
}
```

The system will:

1. **Store in `brdr_documents`**:
   - `doc_id`: "20250203-4-EN"
   - `doc_type_desc`: "CIR - Circular"
   - `doc_long_title`: "Circular Issued by the Securities and Futures Commission..."
   - `issue_date`: "2025-01-27T16:00:00.000+00:00"
   - `topics`: ["Miscellaneous: SFC/IA/MPFA", "Wealth Management & MPF: Securities/investment products"]
   - `concepts`: ["CIR - Circular", "Miscellaneous", "SFC/IA/MPFA", "Wealth Management & MPF", "Securities/investment products"]

2. **Create in `topics` table**:
   - Topic: "Miscellaneous: SFC/IA/MPFA"
   - Topic: "Wealth Management & MPF: Securities/investment products"

3. **Create in `concepts` table**:
   - Concept: "CIR - Circular" (type: regulatory)
   - Concept: "Miscellaneous" (type: regulatory)
   - Concept: "SFC/IA/MPFA" (type: regulatory)
   - Concept: "Wealth Management & MPF" (type: financial)
   - Concept: "Securities/investment products" (type: financial)

4. **Create relationships**:
   - Document ↔ Topics (via `document_topics`)
   - Document ↔ Concepts (via `document_concepts`)
   - Concepts ↔ Keywords (via `concept_keywords`)

## Usage

### 1. **Run Migration**
```bash
npm run migrate:enhanced
```

### 2. **Test Enhanced Crawler**
```bash
npm run crawler:test-basic
```

### 3. **Process Documents with Enhanced Data**
```bash
npm run etl:process
```

## Benefits

### 1. **Rich Metadata Storage**
- All BRDR API fields are preserved
- JSONB arrays for flexible data storage
- Proper indexing for fast queries

### 2. **Enhanced Knowledge Graph**
- Topics and subtopics with proper relationships
- Higher-level concepts for better categorization
- Weighted relationships for relevance scoring

### 3. **Improved Search and Retrieval**
- Search by document type (CIR, GL, etc.)
- Search by topics and concepts
- Filter by issue date and version
- Find related documents

### 4. **Better Analytics**
- Document type distribution
- Topic popularity analysis
- Concept relationship mapping
- Temporal analysis by issue date

## Query Examples

### Find Documents by Type
```sql
SELECT doc_id, doc_long_title, issue_date 
FROM brdr_documents 
WHERE doc_type_code = 'CIR';
```

### Find Documents by Topic
```sql
SELECT d.doc_id, d.doc_long_title, t.topic_desc
FROM brdr_documents d
JOIN document_topics dt ON d.id = dt.document_id
JOIN topics t ON dt.topic_id = t.id
WHERE t.topic_desc LIKE '%SFC%';
```

### Find Related Documents
```sql
SELECT d.doc_id, d.doc_long_title
FROM brdr_documents d
WHERE d.doc_id IN (
  SELECT jsonb_array_elements_text(directly_related_doc_list)
  FROM brdr_documents
  WHERE doc_id = '20250203-4-EN'
);
```

### Analyze Concept Relationships
```sql
SELECT c.concept_name, COUNT(dc.document_id) as document_count
FROM concepts c
JOIN document_concepts dc ON c.id = dc.concept_id
GROUP BY c.concept_name
ORDER BY document_count DESC;
```

## Future Enhancements

1. **Advanced Topic Analysis**: Automatic topic clustering and hierarchy
2. **Concept Evolution**: Track how concepts change over time
3. **Document Similarity**: Enhanced similarity scoring using topics and concepts
4. **Regulatory Impact**: Analyze impact of regulatory changes
5. **Temporal Analysis**: Track document evolution and supersession

This enhanced schema provides a solid foundation for advanced BRDR document analysis and knowledge graph construction. 