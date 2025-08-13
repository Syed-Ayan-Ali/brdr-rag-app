import { BRDRPDFDownloader } from './download-all-brdr-pdfs';

async function exampleUsage() {
  console.log('📚 BRDR PDF Downloader - Example Usage\n');

  // Example 1: Download all PDFs (first 5 pages only for testing)
  console.log('1️⃣ Example 1: Download first 5 pages of PDFs');
  const downloader1 = new BRDRPDFDownloader('./example-downloads');
  await downloader1.downloadAllPDFs({
    maxPages: 5,
    delayBetweenDownloads: 2000, // 2 second delay
    showProgress: true
  });

  // Example 2: Download specific PDFs by ID
  console.log('\n2️⃣ Example 2: Download specific PDFs');
  const downloader2 = new BRDRPDFDownloader('./specific-downloads');
  await downloader2.downloadSpecificPDFs([
    'BRDR001', // Replace with actual document IDs
    'BRDR002',
    'BRDR003'
  ]);

  // Example 3: Download with custom settings
  console.log('\n3️⃣ Example 3: Download with custom settings');
  const downloader3 = new BRDRPDFDownloader('./custom-downloads');
  await downloader3.downloadAllPDFs({
    maxPages: 10, // Only first 10 pages
    delayBetweenDownloads: 3000, // 3 second delay to be very respectful
    showProgress: true
  });
}

// Run the examples
if (require.main === module) {
  exampleUsage().catch(console.error);
}
