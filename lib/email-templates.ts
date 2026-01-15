// =====================================================
// EMAIL TEMPLATE LIBRARY
// Pre-defined templates and smart suggestions
// =====================================================

export interface EmailTemplate {
  id: string;
  name: string;
  icon: string;
  category: 'follow-up' | 'proposal' | 'meeting' | 'clarification' | 'thank-you' | 'next-steps';
  prompt: string;
  subjectTemplate: string;
  variables: string[];
  whenToUse: string;
}

export const emailTemplates: EmailTemplate[] = [
  // Follow-up Templates
  {
    id: 'immediate-follow-up',
    name: 'Immediate Follow-up',
    icon: '📬',
    category: 'follow-up',
    prompt: `Write a warm follow-up email that:
- Thanks them for their time
- Summarizes the key points discussed
- Confirms the next steps we agreed on
- Includes any action items with deadlines
- Ends with clear call-to-action`,
    subjectTemplate: 'Great speaking with you today - Next steps from our call',
    variables: ['customerName', 'keyPoints', 'nextSteps', 'actionItems'],
    whenToUse: 'Send within 2-4 hours after a positive call'
  },
  {
    id: 'recap-action-items',
    name: 'Recap & Action Items',
    icon: '✅',
    category: 'follow-up',
    prompt: `Create a structured follow-up email that:
- Provides a clear recap of what was discussed
- Lists action items for both parties
- Includes specific deadlines and owners
- Asks for confirmation on understanding
- Sets expectations for next communication`,
    subjectTemplate: 'Action items from our {date} discussion',
    variables: ['customerName', 'actionItems', 'deadlines'],
    whenToUse: 'After calls with multiple action items'
  },

  // Proposal Templates
  {
    id: 'send-proposal',
    name: 'Send Proposal',
    icon: '📄',
    category: 'proposal',
    prompt: `Write an email to accompany a proposal that:
- References our discussion about their specific needs
- Highlights how our solution addresses their pain points
- Mentions the custom pricing based on their requirements
- Includes a clear timeline for decision
- Offers to walk through the proposal together`,
    subjectTemplate: 'Proposal for {companyName} - Addressing {mainPainPoint}',
    variables: ['companyName', 'painPoints', 'proposedSolution', 'pricing'],
    whenToUse: 'When sending a formal proposal or quote'
  },
  {
    id: 'pricing-discussion',
    name: 'Pricing Follow-up',
    icon: '💰',
    category: 'proposal',
    prompt: `Create an email that:
- Acknowledges their budget concerns
- Explains the value proposition clearly
- Offers flexible payment options if discussed
- Includes ROI calculations if available
- Suggests a call to discuss custom options`,
    subjectTemplate: 'Pricing options for {companyName} - Let\'s find the right fit',
    variables: ['budget', 'pricingOptions', 'roi'],
    whenToUse: 'After discussing pricing or budget constraints'
  },

  // Meeting Templates
  {
    id: 'schedule-demo',
    name: 'Schedule Demo',
    icon: '🖥️',
    category: 'meeting',
    prompt: `Write an email to schedule a demo that:
- References specific features they were interested in
- Suggests 2-3 specific time slots
- Mentions who should attend from their team
- Includes meeting agenda
- Provides any prep materials needed`,
    subjectTemplate: 'Demo scheduling - See {productName} in action',
    variables: ['interestedFeatures', 'suggestedTimes', 'attendees'],
    whenToUse: 'When prospect expressed interest in seeing a demo'
  },
  {
    id: 'schedule-next-meeting',
    name: 'Schedule Next Meeting',
    icon: '📅',
    category: 'meeting',
    prompt: `Create an email to schedule the next meeting that:
- References what we'll cover in the next discussion
- Proposes specific dates and times
- Mentions any materials to review beforehand
- Includes key stakeholders who should join
- Sets clear objectives for the meeting`,
    subjectTemplate: 'Next steps meeting - {mainTopic}',
    variables: ['nextTopics', 'proposedDates', 'stakeholders'],
    whenToUse: 'To schedule a follow-up meeting'
  },

  // Clarification Templates
  {
    id: 'clarify-requirements',
    name: 'Clarify Requirements',
    icon: '❓',
    category: 'clarification',
    prompt: `Write an email seeking clarification that:
- Thanks them for sharing their requirements
- Lists specific questions about unclear points
- Explains why we need this information
- Offers to jump on a quick call if easier
- Maintains momentum in the conversation`,
    subjectTemplate: 'Quick clarification on your requirements',
    variables: ['requirements', 'questions'],
    whenToUse: 'When you need more information about their needs'
  },
  {
    id: 'address-concerns',
    name: 'Address Concerns',
    icon: '🤝',
    category: 'clarification',
    prompt: `Create an email that addresses their concerns by:
- Acknowledging each concern specifically
- Providing clear responses with examples
- Offering references or case studies if relevant
- Suggesting a call to discuss further
- Reassuring them about our capabilities`,
    subjectTemplate: 'Addressing your concerns about {mainConcern}',
    variables: ['concerns', 'objections'],
    whenToUse: 'After a call where objections were raised'
  },

  // Thank You Templates
  {
    id: 'thank-you-intro',
    name: 'Thank You - First Call',
    icon: '🙏',
    category: 'thank-you',
    prompt: `Write a thank you email after an introductory call that:
- Expresses genuine appreciation for their time
- Shows understanding of their business
- Highlights potential areas we can help
- Includes relevant resources
- Suggests logical next steps`,
    subjectTemplate: 'Thank you for the introduction - Excited about {opportunity}',
    variables: ['businessUnderstanding', 'opportunities'],
    whenToUse: 'After an initial introductory call'
  },
  {
    id: 'thank-you-champion',
    name: 'Thank You - Champion',
    icon: '🌟',
    category: 'thank-you',
    prompt: `Create a thank you email for an internal champion that:
- Thanks them for advocating for us internally
- Provides materials to help them sell internally
- Offers to support their efforts
- Keeps them updated on progress
- Strengthens the relationship`,
    subjectTemplate: 'Thank you for your support - Resources attached',
    variables: ['championName', 'internalProcess'],
    whenToUse: 'For someone championing you internally'
  },

  // Next Steps Templates
  {
    id: 'trial-setup',
    name: 'Trial Setup',
    icon: '🚀',
    category: 'next-steps',
    prompt: `Write an email about setting up a trial that:
- Confirms their interest in moving forward
- Outlines the trial parameters (duration, features, support)
- Lists setup requirements and timeline
- Sets success criteria
- Schedules check-in calls`,
    subjectTemplate: 'Your {productName} trial - Let\'s get started',
    variables: ['trialDuration', 'setupRequirements', 'successCriteria'],
    whenToUse: 'When moving to trial or POC phase'
  },
  {
    id: 'decision-timeline',
    name: 'Decision Timeline',
    icon: '⏰',
    category: 'next-steps',
    prompt: `Create an email about their decision timeline that:
- Acknowledges their evaluation process
- Confirms key decision dates
- Offers to provide any additional information
- Mentions any time-sensitive factors (pricing, availability)
- Keeps door open for questions`,
    subjectTemplate: 'Supporting your evaluation of {productName}',
    variables: ['decisionDate', 'evaluationCriteria'],
    whenToUse: 'When discussing evaluation and decision timeline'
  },
  {
    id: 'stakeholder-intro',
    name: 'Stakeholder Introduction',
    icon: '👥',
    category: 'next-steps',
    prompt: `Write an email for introducing to other stakeholders that:
- Thanks them for the introduction opportunity
- Briefly introduces our solution and value prop
- References the discussions with the referring person
- Suggests next steps for engagement
- Includes relevant materials`,
    subjectTemplate: 'Introduction from {referrerName} - {companyName} + {ourCompany}',
    variables: ['referrerName', 'stakeholderRole', 'relevantPoints'],
    whenToUse: 'When being introduced to other decision makers'
  },
  {
    id: 'competitive-differentiation',
    name: 'Competitive Positioning',
    icon: '🏆',
    category: 'next-steps',
    prompt: `Create an email that addresses competitive concerns by:
- Acknowledging they're evaluating options
- Highlighting our unique differentiators
- Providing comparison materials if appropriate
- Offering customer references
- Suggesting a deeper dive on key differences`,
    subjectTemplate: 'Why {ourCompany} is the right choice for {companyName}',
    variables: ['competitors', 'differentiators', 'uniqueValue'],
    whenToUse: 'When competitors are mentioned or being evaluated'
  }
];

// Get smart template suggestions based on call data
export function getSmartTemplateSuggestions(callData: {
  sentiment?: string;
  outcome?: string;
  hasObjections?: boolean;
  hasBudgetDiscussion?: boolean;
  hasNextSteps?: boolean;
  hasCompetitors?: boolean;
  isFirstCall?: boolean;
  dealStage?: string;
}): EmailTemplate[] {
  const suggestions: EmailTemplate[] = [];

  // Always suggest immediate follow-up for positive calls
  if (callData.sentiment === 'positive' || callData.outcome === 'positive') {
    suggestions.push(emailTemplates.find(t => t.id === 'immediate-follow-up')!);
  }

  // If there are next steps, suggest action items template
  if (callData.hasNextSteps) {
    suggestions.push(emailTemplates.find(t => t.id === 'recap-action-items')!);
  }

  // If objections were raised, suggest addressing concerns
  if (callData.hasObjections) {
    suggestions.push(emailTemplates.find(t => t.id === 'address-concerns')!);
  }

  // If budget was discussed, suggest pricing follow-up
  if (callData.hasBudgetDiscussion) {
    suggestions.push(emailTemplates.find(t => t.id === 'pricing-discussion')!);
  }

  // If competitors mentioned, suggest competitive positioning
  if (callData.hasCompetitors) {
    suggestions.push(emailTemplates.find(t => t.id === 'competitive-differentiation')!);
  }

  // If first call, suggest thank you
  if (callData.isFirstCall) {
    suggestions.push(emailTemplates.find(t => t.id === 'thank-you-intro')!);
  }

  // Based on deal stage
  if (callData.dealStage === 'demo') {
    suggestions.push(emailTemplates.find(t => t.id === 'schedule-demo')!);
  } else if (callData.dealStage === 'proposal') {
    suggestions.push(emailTemplates.find(t => t.id === 'send-proposal')!);
  } else if (callData.dealStage === 'trial') {
    suggestions.push(emailTemplates.find(t => t.id === 'trial-setup')!);
  }

  // Return top 3 suggestions
  return suggestions.slice(0, 3);
}

// Generate subject line based on template and call data
export function generateSubjectLine(
  template: EmailTemplate,
  callData: {
    customerName?: string;
    companyName?: string;
    date?: string;
    mainTopic?: string;
    mainPainPoint?: string;
    productName?: string;
  }
): string {
  let subject = template.subjectTemplate;

  // Replace variables
  subject = subject.replace('{customerName}', callData.customerName || 'there');
  subject = subject.replace('{companyName}', callData.companyName || 'your company');
  subject = subject.replace('{date}', callData.date || 'today');
  subject = subject.replace('{mainTopic}', callData.mainTopic || 'our discussion');
  subject = subject.replace('{mainPainPoint}', callData.mainPainPoint || 'your needs');
  subject = subject.replace('{productName}', callData.productName || 'our solution');
  subject = subject.replace('{ourCompany}', 'LoadVoice');

  return subject;
}