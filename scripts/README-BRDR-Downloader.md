# BRDR PDF Downloader

A simple script to scrape and download all PDFs from the BRDR (Banking Disclosure Requirements) system to a local folder.

## Features

- ✅ Downloads all PDFs from BRDR API
- ✅ Progress tracking with real-time updates
- ✅ Skips already downloaded files
- ✅ Error handling and retry logic
- ✅ Respectful rate limiting (configurable delays)
- ✅ Detailed download reports
- ✅ Metadata files for each PDF
- ✅ Support for downloading specific documents by ID

## Quick Start

### 1. Basic Usage

Download all PDFs to the default directory (`./brdr-pdfs`):

```bash
npx ts-node scripts/download-all-brdr-pdfs.ts
```

### 2. Custom Directory

Download to a specific directory:

```bash
npx ts-node scripts/download-all-brdr-pdfs.ts ./my-pdfs
```

### 3. Limit Pages (for testing)

Download only first 5 pages:

```bash
npx ts-node scripts/download-all-brdr-pdfs.ts ./my-pdfs 5
```

### 4. Custom Delay

Download with 3-second delay between downloads:

```bash
npx ts-node scripts/download-all-brdr-pdfs.ts ./my-pdfs 10 3000
```

## Command Line Arguments

```bash
npx ts-node scripts/download-all-brdr-pdfs.ts [download-dir] [max-pages] [delay-ms]
```

- `download-dir`: Directory to save PDFs (default: `./brdr-pdfs`)
- `max-pages`: Maximum pages to fetch (default: all pages)
- `delay-ms`: Delay between downloads in milliseconds (default: 1000ms)

## Programmatic Usage

### Download All PDFs

```typescript
import { BRDRPDFDownloader } from './scripts/download-all-brdr-pdfs';

const downloader = new BRDRPDFDownloader('./my-pdfs');

await downloader.downloadAllPDFs({
  maxPages: 10, // Optional: limit pages
  delayBetweenDownloads: 2000, // Optional: 2 second delay
  showProgress: true // Optional: show progress
});
```

### Download Specific PDFs

```typescript
const downloader = new BRDRPDFDownloader('./my-pdfs');

await downloader.downloadSpecificPDFs([
  'BRDR001',
  'BRDR002',
  'BRDR003'
]);
```

## Output Structure

The script creates the following structure:

```
brdr-pdfs/
├── BRDR001.pdf          # PDF file
├── BRDR001.json         # Metadata file
├── BRDR002.pdf
├── BRDR002.json
├── ...
└── download-report.json  # Summary report
```

### Metadata Files

Each PDF gets a corresponding `.json` file with metadata:

```json
{
  "docId": "BRDR001",
  "docLongTitle": "Document Title",
  "docTypeDesc": "Document Type",
  "issueDate": "2024-01-01",
  "downloadDate": "2024-01-15T10:30:00.000Z",
  "pdfInfo": {
    "docId": "BRDR001",
    "pdfUrl": "https://...",
    "pdfFileName": "document.pdf",
    "fileSize": "1.2MB",
    "title": "Document Title",
    "docTypeCode": "TYPE001",
    "docTypeDesc": "Document Type",
    "version": "1.0",
    "issueDate": "2024-01-01"
  }
}
```

### Download Report

A `download-report.json` file contains the summary:

```json
{
  "downloadDate": "2024-01-15T10:30:00.000Z",
  "totalDocuments": 100,
  "downloadedCount": 95,
  "failedCount": 3,
  "skippedCount": 2,
  "successRate": "95.0",
  "failedDownloads": ["BRDR001", "BRDR002", "BRDR003"],
  "skippedDownloads": ["BRDR004", "BRDR005"],
  "downloadDirectory": "./brdr-pdfs"
}
```

## Progress Display

The script shows real-time progress:

```
📊 Progress: 45/100 (45.0%)
⏱️  Elapsed: 2m 30s
❌ Failed: 2
⏭️  Skipped: 1
📄 Current: BRDR046
──────────────────────────────────────────────────
```

## Error Handling

- **Network errors**: Automatically retries with exponential backoff
- **Missing PDFs**: Logs warning and continues with next document
- **File system errors**: Creates directories if they don't exist
- **Rate limiting**: Respectful delays between requests

## Best Practices

1. **Start Small**: Test with a few pages first (`maxPages: 5`)
2. **Be Respectful**: Use delays between downloads (1000-3000ms)
3. **Monitor Progress**: Check the progress display and final report
4. **Check Space**: Ensure you have enough disk space for all PDFs
5. **Resume Capability**: The script skips already downloaded files

## Troubleshooting

### Common Issues

1. **SSL Certificate Errors**: The script handles this automatically
2. **Network Timeouts**: Built-in retry logic with timeouts
3. **Rate Limiting**: Adjust the delay parameter if needed
4. **Disk Space**: Check available space before large downloads

### Logs

Check the console output for detailed logs. The script uses the existing logging system from your project.

## Dependencies

The script uses existing dependencies from your project:
- `axios` for HTTP requests
- `fs` and `path` for file operations
- Existing `BRDRCrawler` and `PDFScraper` classes
- Existing logging system

## Example Scripts

See `example-usage.ts` for more examples of how to use the downloader programmatically.
