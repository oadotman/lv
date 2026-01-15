/**
 * Temporal Resolution Agent - Resolves relative dates and times to absolute values
 * Handles complex temporal references like "tomorrow", "next Monday", "end of day"
 */

import { BaseAgent } from '../base-agent';
import { AgentContextData, BaseAgentOutput } from '../types';

export interface ResolvedDateTime {
  originalText: string;
  resolvedDate?: Date;
  resolvedTime?: string; // HH:MM format
  confidence: number;

  // Type of reference
  type: 'absolute' | 'relative' | 'recurring' | 'range' | 'approximate';

  // Context of the date/time
  context: 'pickup' | 'delivery' | 'availability' | 'deadline' | 'appointment' | 'other';

  // Precision level
  precision: 'exact' | 'day' | 'week' | 'month' | 'approximate';

  // Special flags
  isHoliday?: boolean;
  isWeekend?: boolean;
  isRush?: boolean; // ASAP, urgent, etc.
  isFlexible?: boolean;

  // Business hours consideration
  assumedBusinessHours?: {
    start: string; // HH:MM
    end: string; // HH:MM
  };

  // Timezone handling
  timezone?: string;
  timezoneAssumed?: boolean;
}

export interface TimeWindow {
  start: ResolvedDateTime;
  end: ResolvedDateTime;
  duration?: number; // in minutes
  flexibility?: 'strict' | 'flexible' | 'preferred';
}

export interface TemporalResolutionOutput extends BaseAgentOutput {
  resolvedDates: ResolvedDateTime[];

  timeWindows: Array<{
    id: string;
    type: 'pickup' | 'delivery' | 'availability' | 'appointment';
    window: TimeWindow;
    loadId?: string; // If associated with specific load
    notes?: string;
  }>;

  // Recurring patterns detected
  recurringPatterns?: Array<{
    pattern: 'daily' | 'weekly' | 'monthly';
    daysOfWeek?: string[]; // ["Monday", "Wednesday", "Friday"]
    timeOfDay?: string; // "morning", "afternoon", "EOD"
    description: string;
  }>;

  // Temporal constraints and dependencies
  constraints: Array<{
    type: 'before' | 'after' | 'between' | 'duration' | 'same_day';
    reference1: string; // e.g., "pickup"
    reference2?: string; // e.g., "delivery"
    constraint: string; // e.g., "must be before", "at least 2 days after"
    violated?: boolean;
  }>;

  // Holiday and weekend considerations
  holidayConsiderations: Array<{
    date: Date;
    holiday: string;
    impact: 'closed' | 'limited_hours' | 'surcharge';
    alternativeDate?: Date;
  }>;

  // Ambiguities and assumptions
  assumptions: Array<{
    type: 'timezone' | 'business_hours' | 'date_context' | 'year';
    assumption: string;
    confidence: number;
    alternativeInterpretation?: string;
  }>;

  // Timeline summary
  timeline?: {
    earliestDate?: Date;
    latestDate?: Date;
    totalDuration?: number; // in days
    criticalPath?: string[]; // Sequence of critical events
  };

  // Warnings about temporal issues
  warnings?: Array<{
    type: 'ambiguous' | 'impossible' | 'unlikely' | 'missing_year' | 'timezone_unclear';
    description: string;
    affectedDates: string[];
    severity: 'high' | 'medium' | 'low';
  }>;


}

export class TemporalResolutionAgent extends BaseAgent<void, TemporalResolutionOutput> {
  name = 'temporal_resolution';
  version = '1.0.0';
  description = 'Temporal reference resolution and date/time parsing';
  dependencies = ['classification'];

  private callDate: Date;
  private timezone: string;

  constructor() {
    super({
      timeout: 15000,
      critical: false, // Not critical but very helpful
      parallel: true, // Can run in parallel with other foundation agents
      retryOnFailure: true
    });
  }
  getPrompt(context: AgentContextData): string {
    return this.buildTemporalPrompt(context);
  }

  async execute(context: AgentContextData): Promise<TemporalResolutionOutput> {
    this.log('Starting temporal resolution');

    // Get call context
    this.callDate = context.metadata?.callDate || new Date();
    this.timezone = context.metadata?.timezone || 'America/Chicago'; // Default to CST

    // Build extraction prompt
    const prompt = this.buildTemporalPrompt(context);

    // Call OpenAI
    const response = await this.callOpenAI(
      prompt,
      this.getSystemPrompt(),
      0.2, // Low temperature for accuracy
      'gpt-4o'
    );

    // Parse and validate response
    const output = this.parseTemporalResponse(response, context);

    this.log(`Resolved ${output.resolvedDates.length} dates/times, ${output.timeWindows.length} windows`);

    return output;
  }

  private buildTemporalPrompt(context: AgentContextData): string {
    const callDateStr = this.callDate.toISOString().split('T')[0];
    const dayOfWeek = this.getDayOfWeek(this.callDate);
    const currentTime = this.callDate.toTimeString().split(' ')[0];

    return `Extract and resolve all temporal references (dates, times, deadlines) from this freight call.

CONTEXT:
- Call Date: ${callDateStr} (${dayOfWeek})
- Call Time: ${currentTime}
- Timezone: ${this.timezone}
- Assume current year unless otherwise specified

TRANSCRIPT:
${context.transcript}

EXTRACTION TASKS:

1. IDENTIFY ALL TEMPORAL REFERENCES:
   - Absolute dates: "December 15th", "12/15", "the 15th"
   - Relative dates: "tomorrow", "next Monday", "in 3 days"
   - Recurring: "every Tuesday", "daily pickups"
   - Time references: "8 AM", "end of day", "morning"
   - Ranges: "between Monday and Wednesday", "Dec 15-18"
   - Approximate: "early next week", "sometime in January"

2. RESOLVE TO ABSOLUTE DATES:
   - Convert relative to absolute based on call date
   - "Tomorrow" from ${callDateStr} = next day
   - "Next Monday" = upcoming Monday (not today if today is Monday)
   - "End of day" = typically 5 PM local time
   - "Morning" = typically 6 AM - 12 PM

3. IDENTIFY TIME WINDOWS:
   - Pickup windows
   - Delivery windows
   - Appointment slots
   - Available hours

4. DETECT CONSTRAINTS:
   - "Must deliver before Friday"
   - "At least 2 days transit time"
   - "Same day delivery"
   - Dependencies between dates

5. HOLIDAY CONSIDERATIONS:
   - Check if resolved dates fall on major holidays
   - Note potential closures or delays

6. ASSUMPTIONS MADE:
   - Timezone assumptions
   - Business hours assumptions (typically 8 AM - 5 PM)
   - Year assumptions for dates without year

Return as JSON:
{
  "resolvedDates": [
    {
      "originalText": "tomorrow morning",
      "resolvedDate": "YYYY-MM-DD",
      "resolvedTime": "HH:MM",
      "confidence": 0.0-1.0,
      "type": "relative",
      "context": "pickup|delivery|availability|deadline|appointment|other",
      "precision": "exact|day|week|month|approximate",
      "isWeekend": boolean,
      "isRush": boolean,
      "isFlexible": boolean,
      "timezone": "${this.timezone}",
      "timezoneAssumed": true
    }
  ],

  "timeWindows": [
    {
      "id": "window_1",
      "type": "pickup|delivery|availability|appointment",
      "window": {
        "start": {
          "originalText": "Monday 8 AM",
          "resolvedDate": "YYYY-MM-DD",
          "resolvedTime": "08:00",
          "confidence": 0.9
        },
        "end": {
          "originalText": "Monday noon",
          "resolvedDate": "YYYY-MM-DD",
          "resolvedTime": "12:00",
          "confidence": 0.9
        },
        "duration": 240,
        "flexibility": "strict|flexible|preferred"
      },
      "loadId": "load_1 if applicable",
      "notes": "any special notes"
    }
  ],

  "recurringPatterns": [
    {
      "pattern": "weekly",
      "daysOfWeek": ["Monday", "Wednesday", "Friday"],
      "timeOfDay": "morning",
      "description": "Regular pickup schedule"
    }
  ],

  "constraints": [
    {
      "type": "before|after|between|duration|same_day",
      "reference1": "pickup",
      "reference2": "delivery",
      "constraint": "delivery must be within 2 days of pickup",
      "violated": false
    }
  ],

  "holidayConsiderations": [
    {
      "date": "YYYY-MM-DD",
      "holiday": "Christmas",
      "impact": "closed",
      "alternativeDate": "YYYY-MM-DD"
    }
  ],

  "assumptions": [
    {
      "type": "timezone|business_hours|date_context|year",
      "assumption": "Assumed ${this.timezone} timezone",
      "confidence": 0.8,
      "alternativeInterpretation": "Could be EST if East Coast"
    }
  ],

  "timeline": {
    "earliestDate": "YYYY-MM-DD",
    "latestDate": "YYYY-MM-DD",
    "totalDuration": number in days,
    "criticalPath": ["pickup", "transit", "delivery"]
  },

  "warnings": [
    {
      "type": "ambiguous|impossible|unlikely|missing_year|timezone_unclear",
      "description": "Description of issue",
      "affectedDates": ["date reference"],
      "severity": "high|medium|low"
    }
  ]
}`;
  }

  protected getSystemPrompt(): string {
    return `You are an expert temporal resolution system for LoadVoice.
Convert all relative date and time references to absolute values.
Consider the call date and time as the reference point for "today", "now", etc.
Be aware of weekends, holidays, and typical business hours.
Flag any ambiguities or assumptions made.
Account for freight industry norms (e.g., "end of day" typically means 5 PM).
Return valid JSON without markdown formatting.`;
  }

  private parseTemporalResponse(response: any, context: AgentContextData): TemporalResolutionOutput {
    const resolvedDates = this.parseResolvedDates(response.resolvedDates);
    const timeWindows = this.parseTimeWindows(response.timeWindows);

    // Calculate confidence
    const dateConfidence = resolvedDates.length > 0
      ? resolvedDates.reduce((sum, d) => sum + d.confidence, 0) / resolvedDates.length
      : 0.5;

    const windowConfidence = timeWindows.length > 0
      ? timeWindows.reduce((sum, w) => sum + ((w.window.start.confidence + w.window.end.confidence) / 2), 0) / timeWindows.length
      : 0.5;

    return {
      resolvedDates,
      timeWindows,
      recurringPatterns: response.recurringPatterns || [],
      constraints: response.constraints || [],
      holidayConsiderations: response.holidayConsiderations || [],
      assumptions: response.assumptions || [],
      timeline: response.timeline,
      warnings: response.warnings || [],
      confidence: this.calculateConfidence({
        dateResolution: dateConfidence,
        windowResolution: windowConfidence,
        assumptionCount: (response.assumptions?.length || 0) / 10 // More assumptions = lower confidence
      })
    };
  }

  private parseResolvedDates(dates: any): ResolvedDateTime[] {
    if (!Array.isArray(dates)) return [];

    return dates.map(date => ({
      originalText: date.originalText || '',
      resolvedDate: this.parseDate(date.resolvedDate),
      resolvedTime: date.resolvedTime,
      confidence: date.confidence || 0.5,
      type: date.type || 'absolute',
      context: date.context || 'other',
      precision: date.precision || 'approximate',
      isHoliday: date.isHoliday,
      isWeekend: date.isWeekend,
      isRush: date.isRush,
      isFlexible: date.isFlexible,
      timezone: date.timezone || this.timezone,
      timezoneAssumed: date.timezoneAssumed !== false
    }));
  }

  private parseTimeWindows(windows: any): TemporalResolutionOutput['timeWindows'] {
    if (!Array.isArray(windows)) return [];

    return windows.map(window => ({
      id: window.id || `window_${Date.now()}`,
      type: window.type || 'availability',
      window: {
        start: this.parseResolvedDateTime(window.window?.start),
        end: this.parseResolvedDateTime(window.window?.end),
        duration: window.window?.duration,
        flexibility: window.window?.flexibility || 'flexible'
      },
      loadId: window.loadId,
      notes: window.notes
    }));
  }

  private parseResolvedDateTime(data: any): ResolvedDateTime {
    if (!data) {
      return {
        originalText: '',
        confidence: 0,
        type: 'approximate',
        context: 'other',
        precision: 'approximate'
      };
    }

    return {
      originalText: data.originalText || '',
      resolvedDate: this.parseDate(data.resolvedDate),
      resolvedTime: data.resolvedTime,
      confidence: data.confidence || 0.5,
      type: data.type || 'absolute',
      context: data.context || 'other',
      precision: data.precision || 'day'
    };
  }

  private parseDate(dateStr: any): Date | undefined {
    if (!dateStr || dateStr === 'null') return undefined;

    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return undefined;
      return date;
    } catch {
      return undefined;
    }
  }

  private getDayOfWeek(date: Date): string {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[date.getDay()];
  }

  getDefaultOutput(): TemporalResolutionOutput {
    return {
      resolvedDates: [],
      timeWindows: [],
      recurringPatterns: [],
      constraints: [],
      holidayConsiderations: [],
      assumptions: [],
      timeline: undefined,
      warnings: [],
      confidence: {
        value: 0.3,
        level: 'low',
        factors: ['No temporal references found or resolution failed']
      }
    };
  }

  validateOutput(output: any): boolean {
    return (
      output &&
      Array.isArray(output.resolvedDates) &&
      Array.isArray(output.timeWindows) &&
      output.confidence
    );
  }
}