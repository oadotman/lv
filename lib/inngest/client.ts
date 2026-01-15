import { Inngest } from 'inngest';

// Create an Inngest client
export const inngest = new Inngest({ id: 'loadvoice' });

// Export types
export type InngestClient = typeof inngest;