export type CallStatus = "completed" | "processing" | "failed";
export type SentimentType = "positive" | "neutral" | "negative";

export interface Call {
  id: string;
  callDate: string;
  customerName: string;
  salesRep: string;
  duration: number; // in seconds
  status: CallStatus;
  outcome?: string;
  sentiment?: SentimentType;
  sentimentScore?: number; // 0-100
}

export interface TranscriptMessage {
  id: string;
  speaker: "rep" | "prospect";
  timestamp: string;
  sentiment: "positive" | "neutral" | "negative";
  message: string;
}

export interface CallInsight {
  type: "pain_point" | "action_item" | "competitor";
  text: string;
}

export interface CallDetail extends Call {
  audioUrl?: string;
  transcript: TranscriptMessage[];
  insights: CallInsight[];
  crmOutputs: {
    plain: string;
    hubspot: string;
    salesforce: string;
    csv: string;
  };
}

export interface Template {
  id: string;
  name: string;
  fieldCount: number;
  fields: TemplateField[];
  isSelected?: boolean;
  usageCount?: number;
  category?: "standard" | "custom";
  lastModified?: string;
}

export interface TemplateField {
  id: string;
  fieldName: string;
  fieldType: "text" | "textarea" | "email" | "number" | "date" | "picklist";
  description: string;
  picklistValues?: string[];
}

export interface MetricCard {
  title: string;
  value: string;
  trend?: {
    value: string;
    direction: "up" | "down";
  };
  subtitle?: string;
  link?: string;
}

export interface User {
  name: string;
  email: string;
  company: string;
  avatar?: string;
}
