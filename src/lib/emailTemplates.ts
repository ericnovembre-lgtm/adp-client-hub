export interface EmailTemplate {
  id: string;
  name: string;
  category: "cold_outreach" | "follow_up" | "proposal" | "check_in" | "closed_won";
  subject: string;
  body: string;
}

export const EMAIL_TEMPLATES: EmailTemplate[] = [
  {
    id: "cold-outreach",
    name: "Cold Outreach",
    category: "cold_outreach",
    subject: "Simplify HR for {{company_name}} with ADP TotalSource",
    body: `Hi {{contact_name}},

I'm reaching out because {{company_name}} caught my attention as a growing business that could benefit from streamlined HR operations.

As {{contact_title}} at {{company_name}}, you likely deal with the complexities of payroll, benefits administration, workers' compensation, and HR compliance on a daily basis. What if you could offload all of that to a trusted partner?

ADP TotalSource is a Professional Employer Organization (PEO) that provides:
• Fortune 500-level benefits at small business pricing
• Full payroll processing and tax filing
• Workers' compensation management with potential 20-30% cost savings
• HR compliance support and risk mitigation
• Dedicated HR business partner

I'd love to schedule a brief 15-minute call to explore how we can help {{company_name}} focus on what you do best.

Would Tuesday or Thursday work for a quick chat?

Best regards`,
  },
  {
    id: "follow-up",
    name: "Follow-Up",
    category: "follow_up",
    subject: "Following up — ADP TotalSource for {{company_name}}",
    body: `Hi {{contact_name}},

Thank you for taking the time to speak with me about {{company_name}}'s HR needs. I really enjoyed learning about your business.

As we discussed, ADP TotalSource can help {{company_name}} by:
• Reducing your administrative burden so you can focus on growth
• Providing access to comprehensive benefits packages your employees will love
• Ensuring compliance with ever-changing employment regulations
• Potentially lowering your workers' comp costs significantly

I've attached some additional resources that outline our services in more detail. I'd be happy to set up a demo of our platform at your convenience.

What does your schedule look like this week?

Best regards`,
  },
  {
    id: "proposal",
    name: "Proposal",
    category: "proposal",
    subject: "Your ADP TotalSource Proposal — {{company_name}}",
    body: `Hi {{contact_name}},

Thank you for your interest in ADP TotalSource. I'm excited to share a customized proposal for {{company_name}}.

Based on our conversations and your team of approximately {{headcount}} employees, I've put together a comprehensive PEO package that includes:

📋 HR Administration & Compliance
• Dedicated HR Business Partner
• Employee handbook and policy development
• Compliance monitoring and updates

💰 Payroll & Tax
• Full-service payroll processing
• Tax filing and W-2 preparation
• Time and attendance integration

🏥 Benefits Administration
• Medical, dental, and vision insurance
• 401(k) retirement plans
• Life and disability insurance

🛡️ Risk Management
• Workers' compensation coverage
• Safety and compliance programs
• Claims management

Please review the attached proposal and let me know if you have any questions. I'm available to walk through the details at your convenience.

Best regards`,
  },
  {
    id: "check-in",
    name: "Check-In",
    category: "check_in",
    subject: "Checking in — How's everything going at {{company_name}}?",
    body: `Hi {{contact_name}},

I wanted to check in and see how things are going at {{company_name}}. It's been a while since we last connected, and I wanted to make sure you have everything you need.

A few updates from ADP TotalSource that might interest you:
• We've enhanced our benefits offerings with new plan options
• Our compliance team has published updated guidance on recent regulatory changes
• We've launched new HR technology features for easier employee management

Is there anything specific I can help with? I'd love to schedule a quick call to catch up and discuss any new challenges {{company_name}} might be facing.

Looking forward to hearing from you!

Best regards`,
  },
  {
    id: "closed-won",
    name: "Welcome / Onboarding",
    category: "closed_won",
    subject: "Welcome to ADP TotalSource, {{company_name}}! 🎉",
    body: `Hi {{contact_name}},

Welcome to the ADP TotalSource family! We're thrilled to have {{company_name}} on board.

Here's what to expect in the coming days:

📅 Onboarding Timeline:
1. Week 1: Kickoff call with your dedicated implementation team
2. Week 2: Data collection and system setup
3. Week 3: Benefits enrollment opens for your employees
4. Week 4: First payroll processing under ADP TotalSource

🎯 Your Key Contacts:
• Implementation Specialist: Will be assigned within 24 hours
• HR Business Partner: Will reach out to schedule an introductory meeting
• Payroll Specialist: Available for any payroll-specific questions

📝 Next Steps:
• Complete the onboarding questionnaire (attached)
• Gather employee census data
• Provide current benefits and payroll information

Please don't hesitate to reach out if you have any questions. We're here to make this transition as smooth as possible.

Welcome aboard!

Best regards`,
  },
];

export function fillTemplate(template: string, mergeFields: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(mergeFields)) {
    const regex = new RegExp(`\\{\\{${key}\\}\\}`, "g");
    result = result.replace(regex, value || `{{${key}}}`);
  }
  return result;
}
