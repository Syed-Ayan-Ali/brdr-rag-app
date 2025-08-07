# BRDR API Data Mapping

## Overview

The BRDRCrawler has been enhanced to extract and map all data from the BRDR API response to the corresponding database columns in the `brdr_documents` table. This ensures that all rich metadata from the BRDR API is properly stored and can be queried.

## BRDR API Response Structure

The BRDR API returns documents with the following structure:

```typescript
interface BRDRDocument {
  // Core document fields
  docId: string;
  docUuid?: string;
  docLongTitle: string;
  docTypeCode?: string;
  docTypeDesc: string;
  versionCode?: string;
  docDesc?: string;
  issueDate: string;
  guidelineNo?: string;
  supersessionDate?: string;
  
  // Topic and subtopic information
  docTopicSubtopicList?: Array<{
    codeType?: string;
    topicCode?: string;
    subtopicCode?: string;
    topicSubtopicCode?: string;
    topicSubtopicDesc?: string;
    topicDesc: string;
    subtopicDesc: string;
    topicDspSeq?: number;
    subtopicDspSeq?: number;
    topicSubtopicSame?: boolean;
  }>;
  
  // Lists and arrays
  docKeywordList?: any[];
  docDisplayKeywordList?: any[];
  docAiTypeList?: any[];
  docUserSelectedKeyowrdList?: any[];
  docUserInputtedKeywordList?: any[];
  docViewList?: any[];
  directlyRelatedDocList?: any[];
  versionHistoryDocList?: any[];
  referenceDocList?: any[];
  supersededDocList?: any[];
  
  // Additional metadata
  spmCode?: string;
  consultStsCode?: string;
  consultOpenDate?: string;
  consultClsDate?: string;
  docLangMapDto?: any;
  searchWordSet?: any;
  interestedInDocList?: any;
  crossRelpItemDto?: any;
  versionHistRelpItemDto?: any;
  supsdRelpItemDto?: any;
  showInterestedDoc?: boolean;
  isShowDocEngVersion?: boolean;
  isShowDocChiVersion?: boolean;
  engDocId?: string;
  chiDocId?: string;
  isDocNotExists?: boolean;
  docNotExistsMsg?: string;
  groupRelationshipDtoList?: any[];
  docSubtypeCode?: string;
  isOnlyAvailableLangCode?: boolean;
  isSPM?: boolean;
}
```

## Database Column Mapping

### Core Document Fields

| BRDR API Field | Database Column | Type | Description |
|----------------|-----------------|------|-------------|
| `docUuid` | `doc_uuid` | TEXT | BRDR UUID |
| `docTypeCode` | `doc_type_code` | TEXT | Document type code (CIR, GL, etc.) |
| `docTypeDesc` | `doc_type_desc` | TEXT | Document type description |
| `versionCode` | `version_code` | TEXT | Version code (Current, Historical) |
| `docLongTitle` | `doc_long_title` | TEXT | Full document title |
| `docDesc` | `doc_desc` | TEXT | Document description |
| `issueDate` | `issue_date` | TIMESTAMPTZ | Issue date |
| `guidelineNo` | `guideline_no` | TEXT | Guideline number |
| `supersessionDate` | `supersession_date` | TIMESTAMPTZ | Supersession date |

### BRDR-Specific Arrays

| BRDR API Field | Database Column | Type | Description |
|----------------|-----------------|------|-------------|
| `docTopicSubtopicList` | `doc_topic_subtopic_list` | JSONB | Full topic/subtopic list |
| `docKeywordList` | `doc_keyword_list` | JSONB | BRDR keyword list |
| `docAiTypeList` | `doc_ai_type_list` | JSONB | AI type list |
| `docViewList` | `doc_view_list` | JSONB | View list |
| `directlyRelatedDocList` | `directly_related_doc_list` | JSONB | Related documents |
| `versionHistoryDocList` | `version_history_doc_list` | JSONB | Version history |
| `referenceDocList` | `reference_doc_list` | JSONB | Reference documents |
| `supersededDocList` | `superseded_doc_list` | JSONB | Superseded documents |

### Enhanced Fields

| Field | Database Column | Type | Description |
|-------|-----------------|------|-------------|
| `topics` | `topics` | TEXT[] | Extracted topic strings |
| `concepts` | `concepts` | TEXT[] | Extracted concepts |
| `document_type` | `document_type` | TEXT | Document type |
| `language` | `language` | TEXT | Language (default: 'en') |

## Data Extraction Process

### 1. Topic Extraction

Topics are extracted from `docTopicSubtopicList` and formatted as:
```
"${topicDesc}: ${subtopicDesc}"
```

Example:
```typescript
// Input
docTopicSubtopicList: [
  {
    topicDesc: "Miscellaneous",
    subtopicDesc: "SFC/IA/MPFA"
  },
  {
    topicDesc: "Wealth Management & MPF",
    subtopicDesc: "Securities/investment products"
  }
]

// Output
topics: [
  "Miscellaneous: SFC/IA/MPFA",
  "Wealth Management & MPF: Securities/investment products"
]
```

### 2. Concept Extraction

Concepts are extracted from:
- Document type description (`docTypeDesc`)
- Topic descriptions (`topicDesc`)
- Subtopic descriptions (`subtopicDesc`)

Example:
```typescript
// Input
docTypeDesc: "CIR - Circular"
docTopicSubtopicList: [
  { topicDesc: "Miscellaneous", subtopicDesc: "SFC/IA/MPFA" },
  { topicDesc: "Wealth Management & MPF", subtopicDesc: "Securities/investment products" }
]

// Output
concepts: [
  "CIR - Circular",
  "Miscellaneous", 
  "SFC/IA/MPFA",
  "Wealth Management & MPF",
  "Securities/investment products"
]
```

## Implementation Details

### BRDRCrawler Updates

1. **Enhanced Interface**: Updated `BRDRDocument` interface to include all possible BRDR API fields
2. **Comprehensive Mapping**: All BRDR fields are mapped to corresponding database columns
3. **Data Validation**: Proper null/undefined handling for optional fields
4. **Logging**: Detailed logging of data mapping process

### Key Methods

#### `crawlDocuments()`
- Fetches documents from BRDR API
- Maps all BRDR fields to database columns
- Logs data mapping details
- Returns `CrawledDocument[]` with complete field mapping

#### `extractConcepts()`
- Extracts concepts from document type and topics
- Removes duplicates
- Returns unique concept array

#### `logBRDRDataMapping()`
- Logs detailed information about data mapping
- Tracks field counts and extraction results
- Helps with debugging and monitoring

## Testing

### Test Script

Run the BRDR data mapping test:

```bash
npm run brdr:mapping:test
```

This will:
1. Create a sample BRDR document with all fields
2. Test the data mapping process
3. Log detailed mapping results
4. Verify all fields are properly extracted

### Sample Output

```typescript
{
  originalDocId: "20250203-4-EN",
  mappedDocId: "20250203-4-EN",
  docUuid: null,
  docTypeCode: "CIR",
  docTypeDesc: "CIR - Circular",
  versionCode: "Current",
  docLongTitle: "Circular Issued by the Securities and Futures Commission...",
  topicsCount: 2,
  conceptsCount: 5,
  extractedTopics: [
    "Miscellaneous: SFC/IA/MPFA",
    "Wealth Management & MPF: Securities/investment products"
  ],
  extractedConcepts: [
    "CIR - Circular",
    "Miscellaneous",
    "SFC/IA/MPFA", 
    "Wealth Management & MPF",
    "Securities/investment products"
  ]
}
```

## Database Integration

### Prisma Schema

The enhanced schema includes all the new columns:

```prisma
model brdr_documents {
  // ... existing fields
  
  // BRDR-specific fields
  doc_uuid            String?
  doc_type_code       String?
  doc_type_desc       String?
  version_code        String?
  doc_long_title      String?
  doc_desc            String?
  issue_date          DateTime?
  guideline_no        String?
  supersession_date   DateTime?
  
  // BRDR-specific arrays
  doc_topic_subtopic_list Json?
  doc_keyword_list     Json?
  doc_ai_type_list     Json?
  doc_view_list        Json?
  directly_related_doc_list Json?
  version_history_doc_list Json?
  reference_doc_list   Json?
  superseded_doc_list  Json?
  
  // Enhanced fields
  concepts            String[] @default([])
  // ... other fields
}
```

### DatabaseManager Integration

The `DatabaseManager.storeDocument()` method handles storing all the mapped fields:

```typescript
const result = await prisma.brdr_documents.create({
  data: {
    // ... existing fields
    
    // BRDR-specific fields
    doc_uuid: document.doc_uuid,
    doc_type_code: document.doc_type_code,
    doc_type_desc: document.doc_type_desc,
    // ... all other mapped fields
    
    // Enhanced fields
    concepts: document.concepts || [],
    topics: document.topics || [],
    // ... other fields
  }
});
```

## Usage

### Running the Enhanced Crawler

```bash
# Test the crawler with data mapping
npm run crawler:test

# Run full crawler with enhanced data mapping
npm run crawler:full

# Test BRDR data mapping specifically
npm run brdr:mapping:test
```

### Querying Enhanced Data

```sql
-- Query documents by type
SELECT * FROM brdr_documents WHERE doc_type_code = 'CIR';

-- Query by issue date
SELECT * FROM brdr_documents WHERE issue_date >= '2025-01-01';

-- Query with concepts
SELECT * FROM brdr_documents WHERE 'SFC' = ANY(concepts);

-- Query with topics
SELECT * FROM brdr_documents WHERE 'Miscellaneous: SFC/IA/MPFA' = ANY(topics);
```

## Benefits

1. **Complete Data Preservation**: All BRDR API data is stored
2. **Rich Querying**: Query by topics, concepts, document types
3. **Structured Storage**: JSONB arrays for complex data
4. **Audit Trail**: Detailed logging of data mapping
5. **Flexible Schema**: Easy to extend with new BRDR fields

## Future Enhancements

1. **PDF Content**: Add PDF parsing when available
2. **Relationship Mapping**: Map document relationships
3. **Version History**: Track document version changes
4. **Advanced Concepts**: AI-powered concept extraction
5. **Multi-language**: Support for Chinese documents 