/**
 * Carrier Management System
 * Exports all carrier-related functionality for automatic database population
 */

// Core services
export { carrierService, type ExtractedCarrierData, type CarrierStatistics } from './carrierService';
export { carrierExtractionProcessor, type CarrierExtractionResult } from './extractionProcessor';
export { carrierCallProcessingHook, type CallProcessingResult } from './callProcessingHook';

// Integration
export {
  callProcessingIntegration,
  processCallAfterExtraction
} from '../integrations/callProcessingIntegration';

/**
 * Usage Guide:
 *
 * 1. Automatic Processing (Recommended):
 *    After a call is transcribed and extracted, call:
 *    ```
 *    await processCallAfterExtraction(callId, transcription, extraction, organizationId);
 *    ```
 *
 * 2. Manual Processing:
 *    To process a specific carrier call:
 *    ```
 *    const result = await carrierExtractionProcessor.processCarrierCallExtraction(
 *      extraction,
 *      { callId, organizationId, callDate, loadId }
 *    );
 *    ```
 *
 * 3. Batch Processing:
 *    To process historical calls:
 *    ```
 *    const results = await callProcessingIntegration.processHistoricalCalls(organizationId);
 *    ```
 *
 * 4. Statistics Update:
 *    To update carrier statistics:
 *    ```
 *    const stats = await carrierService.updateCarrierStatistics(carrierId);
 *    ```
 *
 * 5. Carrier Search:
 *    To search carriers by criteria:
 *    ```
 *    const carriers = await carrierService.searchCarriers({
 *      organizationId,
 *      equipment: ['Dry Van'],
 *      minPerformanceScore: 80
 *    });
 *    ```
 */

// Re-export component
export { CarrierProfile } from '@/components/carriers/CarrierProfile';