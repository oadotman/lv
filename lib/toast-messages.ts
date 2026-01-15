/**
 * LoadVoice Toast Messages
 * Consistent success, error, and info messages across the app
 */

import { toast } from '@/components/ui/use-toast'

// Success messages
export const toastSuccess = {
  // Extraction success
  extractionComplete: (loadNumber?: string) => toast({
    title: '✅ Extraction Complete!',
    description: loadNumber
      ? `Load ${loadNumber} has been extracted and saved to your CRM`
      : 'Call data extracted successfully in under 60 seconds',
    duration: 5000,
  }),

  // Load management
  loadCreated: (loadNumber: string) => toast({
    title: '📦 Load Created',
    description: `Load ${loadNumber} has been added to your board`,
  }),

  loadUpdated: () => toast({
    title: '✅ Load Updated',
    description: 'Changes saved successfully',
  }),

  carrierAssigned: (carrierName: string) => toast({
    title: '🚚 Carrier Assigned',
    description: `${carrierName} has been assigned to this load`,
  }),

  statusUpdated: (newStatus: string) => toast({
    title: '📍 Status Updated',
    description: `Load status changed to ${newStatus.replace('_', ' ')}`,
  }),

  // Rate confirmation
  rateConGenerated: () => toast({
    title: '📄 Rate Con Generated',
    description: 'Rate confirmation PDF is ready for download',
  }),

  rateConSent: (email: string) => toast({
    title: '📧 Rate Con Sent',
    description: `Rate confirmation sent to ${email}`,
  }),

  // CRM updates
  carrierAdded: (name: string) => toast({
    title: '🚚 Carrier Added',
    description: `${name} added to your carrier database`,
  }),

  shipperAdded: (name: string) => toast({
    title: '🏢 Shipper Added',
    description: `${name} added to your shipper database`,
  }),

  // File operations
  uploadComplete: () => toast({
    title: '⬆️ Upload Complete',
    description: 'Your file has been uploaded successfully',
  }),

  transcriptionComplete: () => toast({
    title: '🎙️ Transcription Complete',
    description: 'Audio has been transcribed and is ready for extraction',
  }),

  // Batch operations
  batchProcessComplete: (count: number) => toast({
    title: '✅ Batch Processing Complete',
    description: `${count} items processed successfully`,
  }),

  // Quick wins
  autoPopulated: (type: 'carrier' | 'shipper', name: string) => toast({
    title: '🎯 Auto-Populated',
    description: `${type === 'carrier' ? 'Carrier' : 'Shipper'} "${name}" matched and updated automatically`,
    duration: 3000,
  }),

  laneUpdated: (lane: string) => toast({
    title: '📊 Lane Statistics Updated',
    description: `${lane} lane performance data updated`,
    duration: 3000,
  }),
}

// Error messages
export const toastError = {
  // Extraction errors
  extractionFailed: (reason?: string) => toast({
    title: '❌ Extraction Failed',
    description: reason || 'Unable to extract data from this call. Please try again.',
    variant: 'destructive',
  }),

  transcriptionFailed: () => toast({
    title: '❌ Transcription Failed',
    description: 'Audio quality may be too poor. Please try a different recording.',
    variant: 'destructive',
  }),

  // Validation errors
  missingRequiredFields: (fields: string[]) => toast({
    title: '⚠️ Missing Information',
    description: `Please fill in: ${fields.join(', ')}`,
    variant: 'destructive',
  }),

  invalidFileType: () => toast({
    title: '⚠️ Invalid File Type',
    description: 'Please upload an audio file (MP3, WAV, M4A, or WebM)',
    variant: 'destructive',
  }),

  fileTooLarge: () => toast({
    title: '⚠️ File Too Large',
    description: 'Please upload a file smaller than 100MB',
    variant: 'destructive',
  }),

  // API errors
  networkError: () => toast({
    title: '🌐 Connection Error',
    description: 'Unable to connect. Please check your internet connection.',
    variant: 'destructive',
  }),

  serverError: () => toast({
    title: '⚠️ Server Error',
    description: 'Something went wrong on our end. Please try again later.',
    variant: 'destructive',
  }),

  unauthorized: () => toast({
    title: '🔒 Unauthorized',
    description: 'Please log in to continue',
    variant: 'destructive',
  }),

  // Limit errors
  minutesExceeded: (limit: number) => toast({
    title: '⏰ Minutes Limit Reached',
    description: `You've used all ${limit} minutes this month. Upgrade to continue.`,
    variant: 'destructive',
  }),

  // Generic error
  generic: (message?: string) => toast({
    title: '❌ Error',
    description: message || 'Something went wrong. Please try again.',
    variant: 'destructive',
  }),
}

// Info messages
export const toastInfo = {
  // Process updates
  processing: (item: string) => toast({
    title: '⏳ Processing',
    description: `${item} is being processed...`,
    duration: 10000,
  }),

  saving: () => toast({
    title: '💾 Saving',
    description: 'Saving your changes...',
    duration: 2000,
  }),

  loading: (item: string) => toast({
    title: '📥 Loading',
    description: `Loading ${item}...`,
    duration: 2000,
  }),

  // Helpful hints
  tip: (message: string) => toast({
    title: '💡 Pro Tip',
    description: message,
    duration: 6000,
  }),

  firstTimeUser: () => toast({
    title: '👋 Welcome to LoadVoice!',
    description: 'Upload your first call to see the magic happen in 60 seconds',
    duration: 8000,
  }),

  // Status updates
  checkCallReminder: (count: number) => toast({
    title: '📞 Check Call Reminder',
    description: `You have ${count} loads that need check calls`,
  }),

  newExtractionsReady: (count: number) => toast({
    title: '✨ Extractions Ready',
    description: `${count} new extractions are ready for review`,
  }),

  // Feature announcements
  newFeature: (feature: string) => toast({
    title: '🎉 New Feature',
    description: `${feature} is now available!`,
    duration: 8000,
  }),
}

// Quick action toasts with buttons
export const toastAction = {
  loadNeedsCarrier: (loadNumber: string) => toast({
    title: '🚚 Carrier Needed',
    description: `Load ${loadNumber} needs a carrier ASAP`,
    duration: 10000,
  }),

  rateConReady: (loadNumber: string) => toast({
    title: '📄 Rate Con Ready',
    description: `Rate confirmation for Load ${loadNumber} is ready`,
    duration: 10000,
  }),

  upgradePrompt: () => toast({
    title: '🚀 Unlock More Features',
    description: 'Upgrade to Pro for unlimited extractions and team collaboration',
    duration: 10000,
  }),
}

// Confirmation dialogs (using toast with action)
export const toastConfirm = {
  deleteLoad: (onConfirm: () => void) => toast({
    title: '🗑️ Delete Load?',
    description: 'This action cannot be undone',
    variant: 'destructive',
    duration: 10000,
  }),

  cancelChanges: (onConfirm: () => void) => toast({
    title: '⚠️ Unsaved Changes',
    description: 'You have unsaved changes. Are you sure you want to leave?',
    variant: 'destructive',
    duration: 10000,
  }),
}