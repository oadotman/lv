import { Inngest, EventSchemas } from 'inngest';

// Define all event types for type safety
export type Events = {
  'call/uploaded': {
    data: {
      callId: string;
      userId: string;
      organizationId?: string;
      fileName: string;
      fileSize: number;
      duration?: number;
      audioUrl: string;
      customerName?: string;
    };
  };
  'call/transcribed': {
    data: {
      callId: string;
      userId: string;
      transcriptId: string;
      duration: number;
    };
  };
  'call/extracted': {
    data: {
      callId: string;
      userId: string;
      fieldsExtracted: number;
      insightsGenerated: number;
    };
  };
  'call/approved': {
    data: {
      callId: string;
      userId: string;
      transcriptId?: string;
      autoApproved: boolean;
    };
  };
  'call/failed': {
    data: {
      callId: string;
      userId: string;
      stage: 'upload' | 'transcription' | 'extraction';
      error: string;
    };
  };
};

// Create Inngest client with typed events
export const inngest = new Inngest({
  id: 'synqall',
  name: 'SynQall',
  eventKey: process.env.INNGEST_EVENT_KEY,
  schemas: new EventSchemas().fromRecord<Events>(),
});
