import { IngestionService } from '@/lib/services/ingestion-service';



async function runIngestion() {
  const ingestionService = new IngestionService();
  console.log('Starting BRDR data ingestion...');
  try {
    await ingestionService.ingestBRDRData();
    console.log('Ingestion completed successfully.');
  } catch (error) {
    console.error('Ingestion failed:', error);
    process.exit(1);
  }
}

runIngestion();