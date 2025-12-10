import { Call, CallDetail, Template, TranscriptMessage, CallInsight, User } from "./types";

export const mockUser: User = {
  name: "Alex Morgan",
  email: "alex.morgan@example.com",
  company: "Innovate Inc.",
};

export const mockCalls: Call[] = [
  {
    id: "1",
    callDate: "2023-11-28",
    customerName: "Acme Corp",
    salesRep: "John Doe",
    duration: 1380, // 23 min
    status: "completed",
    outcome: "qualified",
    sentiment: "positive",
    sentimentScore: 87,
  },
  {
    id: "2",
    callDate: "2023-11-27",
    customerName: "TechStart Inc",
    salesRep: "Jane Smith",
    duration: 960, // 16 min
    status: "completed",
    outcome: "follow-up",
    sentiment: "neutral",
    sentimentScore: 65,
  },
  {
    id: "3",
    callDate: "2023-11-27",
    customerName: "Global Solutions",
    salesRep: "Mike Johnson",
    duration: 720, // 12 min
    status: "processing",
    sentiment: "positive",
    sentimentScore: 78,
  },
  {
    id: "4",
    callDate: "2023-11-26",
    customerName: "DataFlow Systems",
    salesRep: "Sarah Williams",
    duration: 1800, // 30 min
    status: "completed",
    outcome: "qualified",
    sentiment: "positive",
    sentimentScore: 92,
  },
  {
    id: "5",
    callDate: "2023-11-26",
    customerName: "CloudBase Co",
    salesRep: "John Doe",
    duration: 540, // 9 min
    status: "failed",
    sentiment: "negative",
    sentimentScore: 32,
  },
  {
    id: "6",
    callDate: "2023-11-25",
    customerName: "InnovateTech",
    salesRep: "Jane Smith",
    duration: 1200, // 20 min
    status: "completed",
    outcome: "qualified",
    sentiment: "positive",
    sentimentScore: 85,
  },
  {
    id: "7",
    callDate: "2023-11-24",
    customerName: "Enterprise Hub",
    salesRep: "Mike Johnson",
    duration: 900, // 15 min
    status: "completed",
    outcome: "not-qualified",
    sentiment: "negative",
    sentimentScore: 28,
  },
  {
    id: "8",
    callDate: "2023-11-24",
    customerName: "StartupX",
    salesRep: "Sarah Williams",
    duration: 660, // 11 min
    status: "completed",
    outcome: "follow-up",
    sentiment: "neutral",
    sentimentScore: 58,
  },
];

const transcript: TranscriptMessage[] = [
  {
    id: "1",
    speaker: "rep",
    timestamp: "00:15",
    sentiment: "positive",
    message: "Thanks for taking the time to chat today. I wanted to follow up on our last conversation about your current workflow.",
  },
  {
    id: "2",
    speaker: "prospect",
    timestamp: "00:28",
    sentiment: "neutral",
    message: "Of course. We're definitely feeling the pain with our manual data entry. It's time-consuming and prone to errors. It's a major bottleneck.",
  },
  {
    id: "3",
    speaker: "rep",
    timestamp: "00:45",
    sentiment: "positive",
    message: "I completely understand. That's exactly the problem we solve. Our platform automates the entire process, saving teams an average of 15 minutes per call.",
  },
  {
    id: "4",
    speaker: "prospect",
    timestamp: "01:02",
    sentiment: "positive",
    message: "That sounds promising. We're currently looking at Competitor X as well. How do you compare?",
  },
  {
    id: "5",
    speaker: "rep",
    timestamp: "01:18",
    sentiment: "positive",
    message: "Great question. Unlike Competitor X, we don't require any CRM integrations or API keys. You can start using it immediately - just upload, copy, and paste. No IT involvement needed.",
  },
  {
    id: "6",
    speaker: "prospect",
    timestamp: "01:35",
    sentiment: "positive",
    message: "That's a big plus for us. We've had security concerns with giving third-party apps access to our CRM. What about pricing?",
  },
  {
    id: "7",
    speaker: "rep",
    timestamp: "01:48",
    sentiment: "positive",
    message: "I'd be happy to send over a detailed pricing comparison. Can we schedule a follow-up demo next week to show you exactly how it works?",
  },
  {
    id: "8",
    speaker: "prospect",
    timestamp: "02:05",
    sentiment: "positive",
    message: "Yes, that would be great. Let's do Tuesday at 2 PM if that works for you.",
  },
];

const insights: CallInsight[] = [
  {
    type: "pain_point",
    text: "Manual data entry is a major bottleneck causing time delays and errors",
  },
  {
    type: "action_item",
    text: "Follow up with pricing comparison against Competitor X",
  },
  {
    type: "action_item",
    text: "Schedule demo for Tuesday at 2 PM",
  },
  {
    type: "competitor",
    text: "Competitor X mentioned as alternative solution being evaluated",
  },
];

export const mockCallDetail: CallDetail = {
  ...mockCalls[0],
  audioUrl: "/audio/sample-call.mp3",
  transcript,
  insights,
  crmOutputs: {
    plain: `The prospect at Acme Corp confirmed that their team is struggling with manual data entry, which they described as a "major bottleneck." They are currently evaluating Competitor X and asked for a pricing comparison. Security is a key concern - they expressed relief that our solution doesn't require CRM API access. Next steps are to provide the requested pricing information and conduct a product demo scheduled for Tuesday at 2 PM.`,
    hubspot: `**Contact:** Jane Smith - jane.smith@acmecorp.com
**Company:** Acme Corp
**Deal Stage:** Qualified Lead
**Deal Amount:** Not discussed
**Pain Points:**
- Manual data entry causing bottlenecks
- Errors in current process
- Security concerns with CRM integrations

**Competitors:** Competitor X

**Next Steps:**
1. Send pricing comparison vs Competitor X
2. Demo scheduled: Tuesday 2 PM

**Notes:** Strong interest. Security-conscious buyer. Ready to move forward pending pricing review.`,
    salesforce: `Account Name: Acme Corp
Contact Name: Jane Smith
Email: jane.smith@acmecorp.com
Opportunity Name: Acme Corp - Data Entry Automation
Stage: Qualification
Close Date: TBD
Amount: Not discussed yet

Description:
Prospect experiencing significant pain with manual data entry processes. Major concerns around time efficiency and error rates. Currently in evaluation phase, comparing our solution against Competitor X.

Key differentiator: No CRM integration required addresses their security concerns.

NEXT STEPS:
[] Send pricing comparison document
[] Conduct product demo - Tuesday 2 PM
[] Follow up on security questions

Competition: Competitor X (active evaluation)`,
    csv: `Date,Company,Contact,Email,Status,Pain Point,Competitor,Next Action,Demo Date
11/28/2023,Acme Corp,Jane Smith,jane.smith@acmecorp.com,Qualified,Manual data entry bottleneck,Competitor X,Send pricing comparison,Tuesday 2 PM`,
  },
};

export const mockTemplates: Template[] = [
  {
    id: "1",
    name: "Salesforce Opportunity",
    fieldCount: 15,
    isSelected: true,
    usageCount: 42,
    category: "standard",
    lastModified: "2023-11-25",
    fields: [
      {
        id: "f1",
        fieldName: "Opportunity Name",
        fieldType: "text",
        description: "Name of the sales opportunity",
      },
      {
        id: "f2",
        fieldName: "Account Name",
        fieldType: "text",
        description: "Company or organization name",
      },
      {
        id: "f3",
        fieldName: "Primary Contact",
        fieldType: "text",
        description: "Main contact person for this opportunity",
      },
      {
        id: "f4",
        fieldName: "Amount",
        fieldType: "number",
        description: "Total opportunity value (USD)",
      },
      {
        id: "f5",
        fieldName: "Stage",
        fieldType: "picklist",
        description: "Current sales stage",
        picklistValues: ["Prospecting", "Qualification", "Needs Analysis", "Value Proposition", "Decision Makers", "Proposal/Price Quote", "Negotiation/Review", "Closed Won", "Closed Lost"],
      },
      {
        id: "f6",
        fieldName: "Close Date",
        fieldType: "date",
        description: "Expected close date",
      },
      {
        id: "f7",
        fieldName: "Type",
        fieldType: "picklist",
        description: "Opportunity type",
        picklistValues: ["New Business", "Existing Business", "Renewal"],
      },
      {
        id: "f8",
        fieldName: "Lead Source",
        fieldType: "picklist",
        description: "How the lead was generated",
        picklistValues: ["Web", "Phone Inquiry", "Partner Referral", "Purchased List", "Other"],
      },
      {
        id: "f9",
        fieldName: "Probability (%)",
        fieldType: "number",
        description: "Likelihood of closing (0-100%)",
      },
      {
        id: "f10",
        fieldName: "Next Steps",
        fieldType: "textarea",
        description: "Immediate next actions required",
      },
      {
        id: "f11",
        fieldName: "Pain Points",
        fieldType: "textarea",
        description: "Customer challenges discussed",
      },
      {
        id: "f12",
        fieldName: "Competitors",
        fieldType: "text",
        description: "Competing solutions mentioned",
      },
      {
        id: "f13",
        fieldName: "Budget Confirmed",
        fieldType: "picklist",
        description: "Has budget been confirmed?",
        picklistValues: ["Yes", "No", "Unknown"],
      },
      {
        id: "f14",
        fieldName: "Decision Timeline",
        fieldType: "text",
        description: "Expected decision timeframe",
      },
      {
        id: "f15",
        fieldName: "Description",
        fieldType: "textarea",
        description: "Additional notes and details",
      },
    ],
  },
  {
    id: "2",
    name: "HubSpot Deal",
    fieldCount: 12,
    usageCount: 28,
    category: "standard",
    lastModified: "2023-11-20",
    fields: [
      {
        id: "f1",
        fieldName: "Deal Name",
        fieldType: "text",
        description: "Name of the deal",
      },
      {
        id: "f2",
        fieldName: "Amount",
        fieldType: "number",
        description: "Total contract value (USD)",
      },
      {
        id: "f3",
        fieldName: "Deal Stage",
        fieldType: "picklist",
        description: "Current pipeline stage",
        picklistValues: ["Appointment Scheduled", "Qualified to Buy", "Presentation Scheduled", "Decision Maker Bought-In", "Contract Sent", "Closed Won", "Closed Lost"],
      },
      {
        id: "f4",
        fieldName: "Pipeline",
        fieldType: "picklist",
        description: "Sales pipeline",
        picklistValues: ["Default", "New Business", "Renewal"],
      },
      {
        id: "f5",
        fieldName: "Close Date",
        fieldType: "date",
        description: "Expected close date",
      },
      {
        id: "f6",
        fieldName: "Deal Owner",
        fieldType: "text",
        description: "Sales rep responsible for this deal",
      },
      {
        id: "f7",
        fieldName: "Deal Type",
        fieldType: "picklist",
        description: "Type of deal",
        picklistValues: ["New Business", "Existing Business - Upgrade", "Existing Business - Renewal", "Existing Business - Downgrade"],
      },
      {
        id: "f8",
        fieldName: "Priority",
        fieldType: "picklist",
        description: "Deal priority level",
        picklistValues: ["High", "Medium", "Low"],
      },
      {
        id: "f9",
        fieldName: "Next Steps",
        fieldType: "textarea",
        description: "Immediate actions required",
      },
      {
        id: "f10",
        fieldName: "Pain Points",
        fieldType: "textarea",
        description: "Customer challenges identified",
      },
      {
        id: "f11",
        fieldName: "Decision Criteria",
        fieldType: "textarea",
        description: "Key factors influencing the buying decision",
      },
      {
        id: "f12",
        fieldName: "Competitors",
        fieldType: "text",
        description: "Competing solutions being evaluated",
      },
    ],
  },
  {
    id: "3",
    name: "Pipedrive Deal",
    fieldCount: 10,
    usageCount: 18,
    category: "standard",
    lastModified: "2023-11-22",
    fields: [
      {
        id: "f1",
        fieldName: "Deal Title",
        fieldType: "text",
        description: "Name of the deal",
      },
      {
        id: "f2",
        fieldName: "Organization",
        fieldType: "text",
        description: "Company or organization name",
      },
      {
        id: "f3",
        fieldName: "Person",
        fieldType: "text",
        description: "Primary contact person",
      },
      {
        id: "f4",
        fieldName: "Value",
        fieldType: "number",
        description: "Deal value (USD)",
      },
      {
        id: "f5",
        fieldName: "Stage",
        fieldType: "picklist",
        description: "Current deal stage",
        picklistValues: ["Lead In", "Contact Made", "Demo Scheduled", "Proposal Made", "Negotiations Started", "Won", "Lost"],
      },
      {
        id: "f6",
        fieldName: "Expected Close Date",
        fieldType: "date",
        description: "Expected close date",
      },
      {
        id: "f7",
        fieldName: "Probability",
        fieldType: "number",
        description: "Win probability (%)",
      },
      {
        id: "f8",
        fieldName: "Owner",
        fieldType: "text",
        description: "Deal owner / sales rep",
      },
      {
        id: "f9",
        fieldName: "Next Activity",
        fieldType: "text",
        description: "Next scheduled activity or task",
      },
      {
        id: "f10",
        fieldName: "Notes",
        fieldType: "textarea",
        description: "Additional deal notes",
      },
    ],
  },
  {
    id: "zoho",
    name: "Zoho CRM",
    fieldCount: 12,
    usageCount: 15,
    category: "standard",
    lastModified: "2023-11-23",
    fields: [
      {
        id: "z1",
        fieldName: "Deal Name",
        fieldType: "text",
        description: "Name of the deal",
      },
      {
        id: "z2",
        fieldName: "Account Name",
        fieldType: "text",
        description: "Company or account name",
      },
      {
        id: "z3",
        fieldName: "Contact Name",
        fieldType: "text",
        description: "Primary contact person",
      },
      {
        id: "z4",
        fieldName: "Amount",
        fieldType: "number",
        description: "Deal value (USD)",
      },
      {
        id: "z5",
        fieldName: "Stage",
        fieldType: "picklist",
        description: "Current deal stage",
        picklistValues: ["Qualification", "Needs Analysis", "Value Proposition", "Identify Decision Makers", "Proposal/Price Quote", "Negotiation/Review", "Closed Won", "Closed Lost"],
      },
      {
        id: "z6",
        fieldName: "Closing Date",
        fieldType: "date",
        description: "Expected closing date",
      },
      {
        id: "z7",
        fieldName: "Lead Source",
        fieldType: "picklist",
        description: "Source of the lead",
        picklistValues: ["Advertisement", "Cold Call", "Employee Referral", "External Referral", "Online Store", "Partner", "Public Relations", "Sales Email Campaign", "Seminar Partner", "Internal Seminar", "Trade Show", "Web Download", "Web Research", "Chat"],
      },
      {
        id: "z8",
        fieldName: "Type",
        fieldType: "picklist",
        description: "Type of business",
        picklistValues: ["New Business", "Existing Business"],
      },
      {
        id: "z9",
        fieldName: "Next Steps",
        fieldType: "textarea",
        description: "Next actions to be taken",
      },
      {
        id: "z10",
        fieldName: "Description",
        fieldType: "textarea",
        description: "Detailed description of the deal",
      },
      {
        id: "z11",
        fieldName: "Competitors",
        fieldType: "text",
        description: "Competing vendors or solutions",
      },
      {
        id: "z12",
        fieldName: "Campaign Source",
        fieldType: "text",
        description: "Marketing campaign that generated the lead",
      },
    ],
  },
  {
    id: "freshsales",
    name: "Freshsales",
    fieldCount: 11,
    usageCount: 10,
    category: "standard",
    lastModified: "2023-11-21",
    fields: [
      {
        id: "fs1",
        fieldName: "Deal Name",
        fieldType: "text",
        description: "Name of the deal",
      },
      {
        id: "fs2",
        fieldName: "Deal Value",
        fieldType: "number",
        description: "Total deal value (USD)",
      },
      {
        id: "fs3",
        fieldName: "Account",
        fieldType: "text",
        description: "Account or company name",
      },
      {
        id: "fs4",
        fieldName: "Primary Contact",
        fieldType: "text",
        description: "Main contact person",
      },
      {
        id: "fs5",
        fieldName: "Deal Stage",
        fieldType: "picklist",
        description: "Current sales stage",
        picklistValues: ["New", "Qualification", "Demo", "Negotiation", "Won", "Lost"],
      },
      {
        id: "fs6",
        fieldName: "Expected Close Date",
        fieldType: "date",
        description: "When the deal is expected to close",
      },
      {
        id: "fs7",
        fieldName: "Deal Reason",
        fieldType: "picklist",
        description: "Reason for the deal outcome",
        picklistValues: ["Product Features", "Price", "Relationship", "Competition", "Timing", "Other"],
      },
      {
        id: "fs8",
        fieldName: "Product",
        fieldType: "text",
        description: "Products or services being discussed",
      },
      {
        id: "fs9",
        fieldName: "Next Steps",
        fieldType: "textarea",
        description: "Next actions required",
      },
      {
        id: "fs10",
        fieldName: "Tags",
        fieldType: "text",
        description: "Tags for categorization",
      },
      {
        id: "fs11",
        fieldName: "Notes",
        fieldType: "textarea",
        description: "Additional notes and context",
      },
    ],
  },
  {
    id: "monday",
    name: "Monday.com CRM",
    fieldCount: 10,
    usageCount: 8,
    category: "standard",
    lastModified: "2023-11-19",
    fields: [
      {
        id: "m1",
        fieldName: "Item Name",
        fieldType: "text",
        description: "Name of the deal or lead",
      },
      {
        id: "m2",
        fieldName: "Status",
        fieldType: "picklist",
        description: "Current status",
        picklistValues: ["Lead", "Qualified", "Proposal", "Negotiation", "Won", "Lost", "On Hold"],
      },
      {
        id: "m3",
        fieldName: "Priority",
        fieldType: "picklist",
        description: "Priority level",
        picklistValues: ["Critical", "High", "Medium", "Low"],
      },
      {
        id: "m4",
        fieldName: "Deal Value",
        fieldType: "number",
        description: "Estimated deal value (USD)",
      },
      {
        id: "m5",
        fieldName: "Company",
        fieldType: "text",
        description: "Company or organization name",
      },
      {
        id: "m6",
        fieldName: "Contact",
        fieldType: "text",
        description: "Primary contact person",
      },
      {
        id: "m7",
        fieldName: "Timeline",
        fieldType: "text",
        description: "Expected timeline or deadline",
      },
      {
        id: "m8",
        fieldName: "Owner",
        fieldType: "text",
        description: "Team member responsible",
      },
      {
        id: "m9",
        fieldName: "Next Action",
        fieldType: "text",
        description: "Next action to be taken",
      },
      {
        id: "m10",
        fieldName: "Notes",
        fieldType: "textarea",
        description: "Meeting notes and updates",
      },
    ],
  },
  {
    id: "4",
    name: "Custom Prospect Template",
    fieldCount: 8,
    usageCount: 12,
    category: "custom",
    lastModified: "2023-11-28",
    fields: [
      {
        id: "f1",
        fieldName: "Company",
        fieldType: "text",
        description: "Company name",
      },
      {
        id: "f2",
        fieldName: "Pain Points",
        fieldType: "text",
        description: "Key challenges mentioned",
      },
    ],
  },
  {
    id: "5",
    name: "Discovery Call Notes",
    fieldCount: 6,
    usageCount: 5,
    category: "custom",
    lastModified: "2023-11-15",
    fields: [
      {
        id: "f1",
        fieldName: "Budget",
        fieldType: "number",
        description: "Prospect budget range",
      },
      {
        id: "f2",
        fieldName: "Timeline",
        fieldType: "text",
        description: "Expected decision timeline",
      },
    ],
  },
];

export const metricsData = {
  callsThisMonth: 42,
  callsTrend: "+5%",
  timeSaved: "18 hours",
  minutesUsed: 250,
  minutesTotal: 500,
  planRenewalDate: "December 15, 2023",
  // ROI data
  hoursSavedThisMonth: 18,
  hoursSavedLastMonth: 17,
  hourlyRate: 50,
};

export const chartData = {
  callsOverTime: [
    { day: "Mon", calls: 12 },
    { day: "Tue", calls: 19 },
    { day: "Wed", calls: 15 },
    { day: "Thu", calls: 22 },
    { day: "Fri", calls: 18 },
    { day: "Sat", calls: 5 },
    { day: "Sun", calls: 3 },
  ],
  sentimentDistribution: [
    { sentiment: "Positive", percentage: 75, count: 31 },
    { sentiment: "Neutral", percentage: 15, count: 6 },
    { sentiment: "Negative", percentage: 10, count: 5 },
  ],
};
