
LOADVOICE
Minimum Lovable Product Specification
Voice-Powered CRM for Freight Brokers
"Talk to shippers. Talk to carriers. LoadVoice handles everything else."
Version 2.0 — Updated MLP Release
December 2024
CONFIDENTIAL
 
1. Executive Summary
1.1 What is LoadVoice?
LoadVoice is a voice-powered CRM platform designed specifically for solo and small freight brokers. It automatically extracts shipment and carrier details from phone call recordings and builds a comprehensive CRM database that grows smarter with every conversation.
1.2 The Core Value Loop
Upload Call → Extract Data (60 sec) → Auto-Build CRM → One-Click Rate Con
That's it. Everything in this product serves this loop. The extraction is the hook that gets users in the door. The auto-built CRM database is the moat that makes leaving painful.
1.3 Why This Will Work
Factor	Evidence
Pain Severity	Brokers spend 2+ hours daily on data entry. 30% of operating budget goes to manual processes.
Market Size	79,000+ US brokerages. ~40,000 are solo/small operations (target segment).
Willingness to Pay	Already spending $300-800/month on software stack. Clear 15x ROI story.
Competition Gap	No one doing voice-first CRM for small brokers. Parade targets enterprise.
Technical Advantage	LoadVoice extraction engine already built. AssemblyAI provides reliable transcription.
1.4 Target Customer
Primary ICP: Solo freight broker or micro-brokerage (1-3 people)
•	Annual revenue: $500K - $3M
•	Monthly load volume: 30-150 loads
•	Current stack: LoadPilot + DAT + QuickBooks + Spreadsheets
•	Core pain: "I spend more time typing than selling"
 
2. User Journey & Workflows
This section maps the complete user journey from first discovery to daily power usage and growth through referrals.
2.1 Journey Overview
Phase	Timeframe	Goal
Discovery	Day 0	Find LoadVoice, understand value proposition
Signup	Day 0 (5 min)	Create account, complete minimal setup
First Value	Day 0 (10 min)	Upload first call, see extraction magic
Activation	Day 1-7	Complete 5+ extractions, save first loads
Daily Use	Week 2+	LoadVoice becomes part of daily workflow
Expansion	Month 2+	Add team members, refer other brokers
2.2 Phase 1: Discovery & Signup
Discovery Touchpoints
•	Reddit r/FreightBrokers post or comment
•	Facebook group recommendation
•	Referral link from another broker (referral system)
•	Google search: "freight broker automation"
Signup Flow (< 5 minutes)
1.	Land on homepage → See value proposition + demo video
2.	Click "Start Free Trial" → Email/password or Google SSO
3.	Minimal setup: Company name only (everything else optional)
4.	Immediate redirect to Dashboard with prominent "Upload Your First Call" CTA
Design Principle: Zero friction to first extraction. All other settings can be completed later.
2.3 Phase 2: First Value (The Magic Moment)
Critical: User must experience extraction within 10 minutes of signup. This is the hook.
First Extraction Flow
Step	User Action	System Response
1	Click "Upload Call" button	Open upload modal with drag-drop zone
2	Drag audio file (MP3/WAV/M4A)	Show file name, size, estimated duration
3	Select call type: Shipper or Carrier	Two clear buttons, default based on common use
4	Click "Extract"	Progress bar: Uploading → Transcribing → Extracting
5	Wait ~60 seconds	Show real-time status updates to maintain engagement
6	Review extracted data	Display all fields with inline editing capability
7	Click "Save to Loads"	Create Load + Carrier + Shipper records automatically
Post-Extraction Options
Action	Use Case
Save to Loads	Full CRM path — creates linked Load, Carrier, Shipper records
Copy to Clipboard	Export path — user pastes into existing TMS (reduces friction)
Generate Rate Con	Wow moment — instant rate confirmation PDF
Edit & Re-save	Correct any extraction errors before saving
 
2.4 Phase 3: Daily Workflow (Power User)
After activation, LoadVoice becomes integrated into the broker's daily routine.
Morning Routine
1.	Open LoadVoice Dashboard
2.	Review "Today's Snapshot" — see loads picking up, in transit, delivering
3.	Check "Needs Carrier" count — prioritize finding coverage
4.	Click into urgent loads, start making carrier calls
During Calls (Real-Time Workflow)
•	Broker records call (using phone app, Zoom, or dedicated recorder)
•	Immediately after call → Upload to LoadVoice
•	60 seconds later → Review extraction, make quick edits
•	Save to Loads → CRM updated, carrier/shipper database grows
•	If carrier confirmed → Generate Rate Con, email to carrier
End of Day
•	Review all loads — update statuses (Dispatched → In Transit → Delivered)
•	Rate carriers worked with today (1-5 stars, notes)
•	Check analytics — calls processed, loads created, margin tracked
2.5 Phase 4: Growth & Expansion
Team Expansion (Existing LoadVoice Feature)
When broker hires assistant or partner, they can add team members:
•	Settings → Team → Invite Member
•	Enter email → System sends invite with secure token
•	New member joins → Sees same loads, carriers, shippers
•	Roles: Owner, Admin, Member (permission levels)
Referral Program (Existing LoadVoice Feature)
Happy users share LoadVoice with broker friends:
•	Dashboard shows "Refer a Broker" with unique referral link
•	Share in Facebook groups, text to broker friends
•	When referred user subscribes → Referrer gets credit/discount
•	Track referrals in Partner dashboard
 
2.6 Complete User Journey Diagram
Visual Flow (Text Representation):
DISCOVERY
Reddit / Facebook / Referral Link / Google Search
↓
SIGNUP (5 min)
Email/Password → Company Name → Dashboard
↓
FIRST EXTRACTION (10 min)
Upload Call → Select Type → Extract → Review → Save
↓
ACTIVATION (Week 1)
5+ Extractions → Loads Building → Carrier Database Growing
↓
DAILY USE (Week 2+)
Morning Review → Call Recording → Extract → Save → Rate Con → Status Updates
↓
EXPANSION (Month 2+)
Add Team Members → Share Referral Links → Partner Growth
 
3. MLP Feature Set
Philosophy: Include all working features from LoadVoice. Only skip features that require significant NEW development and aren't core to validation.
3.1 Complete Feature Inventory
Feature	Description	Source	Priority
Call Extraction	Upload audio, extract structured data in 60 sec	Modified	P0
Loads Management	View, edit, manage loads with status workflow	New	P0
Carrier Database	Auto-populated, searchable, notes/ratings	New	P0
Shipper Database	Auto-populated, contact info, load history	New	P0
Rate Con Generator	One-click PDF from load data	Modified	P0
Dashboard	Today's snapshot, action items, upload CTA	Modified	P1
Team Management	Invite members, roles, shared data	LoadVoice 100%	Included
Referral System	Unique links, tracking, rewards	LoadVoice 100%	Included
User Authentication	Email/password, SSO, password reset	LoadVoice 100%	Included
Billing (Paddle)	Subscriptions, invoices, tax handling	LoadVoice 95%	Included
Usage Tracking	Minutes used, plan limits	LoadVoice 100%	Included
Analytics Dashboard	Call stats, extraction metrics	LoadVoice 85%	Included
GDPR Compliance	Data export, deletion requests	LoadVoice 100%	Included
Copy/Export	Copy data to clipboard for other systems	Modified	P1
Green rows = Already built in LoadVoice, zero additional development needed
3.2 Out of Scope (Requires New Build, Not Core)
•	Lane Intelligence — Requires historical data accumulation
•	Invoice Generation — Users have QuickBooks
•	BOL Generation — Nice-to-have, not core
•	FMCSA/SAFER Verification — Integration creep
•	Load Board Posting — Integration creep
•	Bank Details/ACH — Unnecessary trust barrier
 
4. Feature Specifications
4.1 Call Extraction (The Differentiator)
This is the core magic of LoadVoice. Every design decision optimizes for speed, accuracy, and simplicity.
Shipper Call Extraction Fields
Field	Type	Example
origin_city, origin_state	String	Pittsburgh, PA
destination_city, destination_state	String	Charlotte, NC
commodity	String	Coiled steel
weight_lbs	Integer	40000
equipment_type	Enum	Flatbed
pickup_date, pickup_time	Date/Time	2025-01-23 06:00
delivery_date, delivery_time	Date/Time	2025-01-24 14:00
rate_to_shipper	Decimal	3200.00
special_requirements	Array	["Tarps required"]
shipper_name, contact, phone	String	Acme Steel, John, 555-1234
reference_number	String	PO-45892
Carrier Call Extraction Fields
Field	Type	Example
carrier_name	String	Johnson Trucking LLC
mc_number, dot_number	String	MC-789456, DOT-1234567
driver_name, driver_phone	String	Steve Johnson, 555-1234
dispatcher_name, dispatcher_phone	String	Maria, 555-9876
truck_number, trailer_number	String	42, 118
rate_to_carrier	Decimal	2800.00
Equipment Types
DRY_VAN | REEFER | FLATBED | STEP_DECK | LOWBOY | CONESTOGA | POWER_ONLY
4.2 Loads Management
Status Workflow
Needs Carrier → Dispatched → In Transit → Delivered
List View Columns
Status | Origin → Dest | Shipper | Carrier | Rate | Margin | Pickup Date
Quick filter tabs: All | Needs Carrier | Dispatched | In Transit | Delivered
4.3 Carrier Database (Lock-In Feature)
Strategic importance: After 3 months, broker has 80+ carriers. This data doesn't exist anywhere else.
Auto-Population Logic
•	On carrier call extraction, check if MC# exists
•	If exists: Update record with new info
•	If new: Create carrier record automatically
•	Link carrier to load record
Carrier Detail View
Name, MC#, contact info | Stats (total loads, last used) | Rating (1-5 stars) | Notes | Load History
 
4.4 Rate Confirmation Generator
The "wow" moment: Phone call to rate con in under 2 minutes.
Generation Flow
•	From Load Detail → Click "Generate Rate Con"
•	Preview PDF with all fields auto-filled
•	Actions: Download PDF | Email to Carrier
Rate Con Contents
Broker company info | Load details (origin, dest, dates, commodity, equipment) | Carrier info (name, MC#, driver, truck/trailer) | Rate and payment terms | Standard T&Cs
4.5 Team Management (From LoadVoice)
100% reusable from existing codebase. Enables growth from solo to small team.
Capabilities
•	Invite team members via email with secure token
•	Role-based access: Owner, Admin, Member
•	Shared access to all loads, carriers, shippers
•	Activity tracking per team member
•	Manage team from Settings → Team
4.6 Referral/Partner System (From LoadVoice)
100% reusable. Critical for organic growth — freight brokers talk to each other constantly.
Capabilities
•	Unique referral link per user
•	Track referral clicks and signups
•	Automatic credit when referred user subscribes
•	Partner dashboard for high-volume referrers
•	Configurable reward structure
 
5. Technical Architecture
5.1 LoadVoice Reuse Analysis
Component	Reuse	Changes Needed
Audio Upload/Storage	100%	None
Transcription (AssemblyAI)	95%	Add freight word boost terms
AI Extraction (OpenAI)	70%	New freight-specific prompts
User Auth (Supabase)	100%	None
Team Management	100%	None
Partner/Referral System	100%	None
Billing (Paddle)	95%	Update plan names/limits
Usage Tracking	100%	None
PDF Export	80%	Rate con template
Analytics Dashboard	85%	Update metrics shown
GDPR Compliance	100%	None
Search	90%	Add freight-specific filters
5.2 New Build Components
Component	Effort	Week
Freight extraction prompts	2-3 days	Week 1
Load data model + CRUD	3-4 days	Week 2
Carrier auto-population	2 days	Week 3
Shipper auto-population	1 day	Week 3
Rate con PDF generator	2 days	Week 4
Dashboard home screen	2 days	Week 5
Load/Carrier/Shipper views	3 days	Week 5
5.3 Database Schema (New Tables)
Loads: id, organization_id, status, origin_city, origin_state, destination_city, destination_state, commodity, weight_lbs, equipment_type, special_requirements, reference_number, pickup_date, pickup_time, delivery_date, delivery_time, shipper_rate, carrier_rate, margin, shipper_id, carrier_id, source_call_id, created_at, updated_at
Carriers: id, organization_id, carrier_name, mc_number (unique), dot_number, dispatcher_name, dispatcher_phone, driver_name, driver_phone, rating, notes, equipment_types, load_count, last_used_date, created_at, updated_at
Shippers: id, organization_id, shipper_name, contact_name, phone, email, address, notes, load_count, total_revenue, last_load_date, created_at, updated_at
Rate_Cons: id, organization_id, load_id, rate_con_number, status, pdf_url, sent_at, sent_to_email, created_at
Organizations (modify): ADD: product_type, company_address, mc_number, dot_number, logo_url, rate_con_terms
 
5.4 AssemblyAI Configuration
Word Boost Terms
MC number, DOT number, flatbed, dry van, reefer, step deck, conestoga, lumper, detention, TONU, deadhead, rate con, bill of lading, BOL, POD, pickup, delivery, shipper, consignee, broker, dispatcher, driver, truck number, trailer number, pallet, skid, tarps, chains, straps, hazmat, overweight, oversize
5.5 Key API Endpoints (New)
Endpoint	Method	Purpose
/api/loads	GET, POST	List and create loads
/api/loads/[id]	GET, PUT, DELETE	Load CRUD operations
/api/carriers	GET, POST	List and create carriers
/api/carriers/[id]	GET, PUT	Carrier detail and update
/api/shippers	GET, POST	List and create shippers
/api/shippers/[id]	GET, PUT	Shipper detail and update
/api/loads/[id]/rate-con	POST	Generate rate confirmation
/api/extraction/save	POST	Save extraction to load + carrier + shipper
 
6. Pricing Strategy
6.1 Pricing Tiers
Plan	Price	Includes
Starter	$99/mo	500 minutes extraction, copy/export only, no CRM features, 1 user
Pro	$199/mo	1,500 minutes, full CRM (loads, carriers, shippers), rate con, 1 user
Team	$349/mo	4,000 minutes, full CRM, rate con, up to 3 users, priority support
6.2 Pricing Rationale
•	$99 = extraction-only users, low commitment entry point
•	$199 = the real product with stickiness (most users)
•	$349 = natural upgrade path when broker adds assistant/partner
•	All tiers below "needs approval" threshold for small businesses
•	15x ROI: Saves ~$3K/month in time, costs $199
 
7. Development Roadmap
7.1 Build Timeline (6 Weeks to Beta)
Week	Focus	Deliverables
1-2	Extraction Engine	Freight prompts, word boost, field mapping, testing
3	Data Model	Loads, Carriers, Shippers tables + CRUD API
4	Auto-Population	Carrier/Shipper creation from extractions, linking
5	Core UI	Dashboard, load/carrier/shipper views
6	Rate Con + Polish	PDF generation, email, bug fixes
7-8	Beta Testing	5 real brokers using daily, iterate
7.2 Week 1-2 Tasks
1.	Configure AssemblyAI with freight word boost terms
2.	Create shipper call extraction prompt, test with samples
3.	Create carrier call extraction prompt, test with samples
4.	Build extraction review UI with inline editing
5.	Add confidence indicators for uncertain fields
6.	Test end-to-end: upload → transcribe → extract → display
7.3 Week 3-4 Tasks
1.	Create database migrations for loads, carriers, shippers
2.	Build CRUD API endpoints for all entities
3.	Implement "Save to Loads" with auto-population logic
4.	Build carrier lookup by MC# (update vs. create)
5.	Build shipper lookup by name (fuzzy match)
6.	Link extracted data to load → carrier → shipper
 
8. Success Metrics
8.1 Beta Phase (Weeks 7-8)
Metric	Target
Beta users actively uploading	5 brokers
Time to first extraction	< 5 minutes from signup
Extraction accuracy	> 85%
% of extractions saved as loads	> 50%
8.2 Launch Phase (Month 2-3)
Metric	Target
Paying customers	10
Monthly Recurring Revenue	$1,500 - $2,000
Extraction accuracy	> 90%
Referral signups	3+ from referral links
8.3 Growth Phase (Month 6)
Metric	Target
Paying customers	50
Monthly Recurring Revenue	$10,000
Avg carriers per customer database	> 30
Team plan upgrades	5+ customers
Monthly churn rate	< 5%
8.4 Key Leading Indicators
1.	Extractions per user per week (target: > 10)
2.	% of extractions saved as loads (target: > 60%)
3.	Carrier database growth rate per user
4.	Rate con generation frequency
5.	Referral link shares per active user
6.	DAU/MAU ratio (target: > 40%)
 
9. Go-to-Market Strategy
9.1 Target Channels
Channel	Size	Approach
r/FreightBrokers	15K+ members	Community engagement, demo videos
Facebook Groups	10K+ combined	Value posts, case studies
Freight Broker Boot Camp	10K+ students	Partnership/referral
LinkedIn	Targetable	Direct outreach to solo brokers
9.2 Messaging
Primary: "Stop typing. Start moving loads."
Supporting: "Upload your call. Get your load data in 60 seconds."
Supporting: "Your carrier Rolodex, built automatically from calls."
ROI Hook: "Save 15+ hours a week on data entry."
9.3 Beta Recruitment
•	Post in r/FreightBrokers asking about data entry pain
•	DM 20 solo brokers on LinkedIn, offer free pilot
•	Offer: "Free for 30 days, first 10 get 50% off forever"
•	Requirement: Must upload at least 5 calls during beta
9.4 Leveraging Referral System
The existing referral system from LoadVoice is a key growth lever:
•	Enable referral links from Day 1 of launch
•	Offer meaningful reward: 1 month free for referrer when referee subscribes
•	Prompt happy users to share: "Know a broker who hates data entry?"
•	Track referral performance in analytics dashboard
 
10. Appendix
10.1 Glossary of Freight Terms
Term	Definition
MC Number	Motor Carrier number — FMCSA registration identifier
DOT Number	Department of Transportation identifier
Rate Con	Rate Confirmation — agreement between broker and carrier
BOL	Bill of Lading — document detailing shipment contents
POD	Proof of Delivery
Dry Van	Standard enclosed 53' trailer
Reefer	Refrigerated trailer
Flatbed	Open trailer for oversized loads
TONU	Truck Ordered Not Used — cancellation fee
Detention	Fee for driver waiting beyond free time
10.2 Document Control
Document Title	LoadVoice MLP Product Specification
Version	2.0
Status	Final — Updated with Teams, Referrals, User Journey
Created Date	December 2024
Classification	Confidential

— End of Document —
