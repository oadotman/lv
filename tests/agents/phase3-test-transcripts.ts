/**
 * Test Transcripts for Phase 3 MVP Agent Testing
 * Real-world scenarios covering 80% of common freight broker calls
 */

export const Phase3TestTranscripts = {
  // ==========================================
  // LOAD EXTRACTION SCENARIOS
  // ==========================================

  singleLoadBooking: `
    Broker: Good morning, this is Mike from Apex Logistics. How can I help you today?
    Shipper: Hi Mike, this is Sarah from Johnson Manufacturing. We need to move a load of steel coils.
    Broker: Sure, I can help with that. What are the pickup and delivery locations?
    Shipper: Pickup is in Cleveland, Ohio - our facility at 1234 Industrial Drive, zip 44101.
             Going to Houston, Texas - the construction site at 5678 Commerce Street, 77002.
    Broker: Got it. Cleveland to Houston. What's the weight on those steel coils?
    Shipper: It's 42,000 pounds, will need a flatbed with tarps.
    Broker: 42,000 pounds, flatbed with tarps. When does this need to pick up?
    Shipper: Tomorrow morning, anytime after 7 AM. Delivery by Friday end of day.
    Broker: Tomorrow pickup after 7 AM, deliver by Friday EOD. Let me work on getting you a rate.
  `,

  multiLoadCall: `
    Broker: Hey Tom, Mike here. What do you have available?
    Carrier: I've got two trucks coming empty. One in Atlanta tomorrow, one in Memphis Thursday.
    Broker: Perfect timing! I have three loads I need covered.
    Carrier: Let's hear them.
    Broker: First one - Atlanta to Miami, 38,000 pounds of packaged goods, dry van, picks tomorrow afternoon.
    Carrier: Okay, that works for my Atlanta truck.
    Broker: Second load - Memphis to Dallas, 44,000 pounds of auto parts, Thursday morning pickup.
    Carrier: My Memphis truck can grab that Thursday.
    Broker: Third one if you can handle it - Dallas to Phoenix, 35,000 pounds, also auto parts, picks up Friday.
    Carrier: If we deliver the Memphis load Thursday night, we could grab the Dallas Friday morning.
    Broker: That would be perfect. Let me give you rates on all three.
  `,

  loadWithChanges: `
    Broker: I have that Chicago to Denver load we discussed.
    Carrier: The one with the machinery parts?
    Broker: Yes, but there's been a change. It's now 45,000 pounds instead of 40,000.
    Carrier: 45,000? That's heavier than we discussed.
    Broker: Right, they added another pallet. Also, the pickup moved to Wednesday instead of Tuesday.
    Carrier: Wednesday works better for me actually. Same delivery?
    Broker: No, they need it by Thursday now instead of Friday. Can you make that work?
    Carrier: Wednesday pickup, Thursday delivery to Denver. Yeah, we can do that with team drivers.
    Broker: Great. Oh, one more thing - the pickup address changed. It's now 9876 Logistics Way instead of the Industrial Park location.
  `,

  multiStopLoad: `
    Broker: I have a multi-stop load out of Los Angeles.
    Carrier: How many stops?
    Broker: Three stops total. First pickup in LA, then two deliveries.
    Carrier: Where are the deliveries?
    Broker: First stop is Phoenix - delivering 15 pallets there. Second stop continues to Albuquerque with the remaining 20 pallets.
    Carrier: So pickup 35 pallets in LA, drop 15 in Phoenix, and 20 in Albuquerque?
    Broker: Exactly. All dry goods, standard 53' dry van.
    Carrier: What's the timeline?
    Broker: Pick up Monday morning in LA, deliver Phoenix by Tuesday noon, Albuquerque by Wednesday morning.
    Carrier: That's doable. What about detention at the stops?
    Broker: Two hours free at each stop, then $75 per hour after that.
  `,

  // ==========================================
  // RATE EXTRACTION SCENARIOS
  // ==========================================

  flatRateQuote: `
    Broker: What's your rate on that Seattle to Portland run?
    Carrier: For a full truckload, 53' dry van?
    Broker: Yes, 44,000 pounds of consumer goods.
    Carrier: I can do that for $1,850 flat rate, all in.
    Broker: $1,850 all in. Does that include fuel?
    Carrier: Yes, that's everything included. Fuel, tolls, everything.
    Broker: Okay, $1,850 all inclusive. Let me confirm with the customer.
  `,

  perMileRate: `
    Carrier: What's the distance on that load?
    Broker: It's 750 miles, Nashville to Kansas City.
    Carrier: 750 miles... I need $2.85 per mile on that.
    Broker: So $2.85 times 750... that's $2,137.50 total?
    Carrier: That's right, $2,137.50. That's my fuel and everything.
    Broker: All miles or just loaded miles?
    Carrier: That's loaded miles. I'm not charging for deadhead.
    Broker: Got it, $2.85 per loaded mile, total $2,137.50.
  `,

  rateWithAccessorials: `
    Broker: The rate is $3,200 for the haul.
    Carrier: What about detention and layover?
    Broker: Detention is $75 per hour after 2 hours free at pickup and delivery.
    Carrier: And if I have to stay overnight?
    Broker: Layover is $350 per day if we hold you.
    Carrier: What about lumper fees?
    Broker: Customer will reimburse lumper fees with receipt, or you can use our lumper service.
    Carrier: Any TONU?
    Broker: Yes, $250 TONU if cancelled within 24 hours of pickup.
    Carrier: And stop pay?
    Broker: Additional stops are $100 each, first stop included in the base rate.
  `,

  rateWithPaymentTerms: `
    Carrier: What are your payment terms?
    Broker: Standard is net 30 from POD receipt.
    Carrier: Do you offer quick pay?
    Broker: Yes, we have 2-day quick pay at 3% discount.
    Carrier: 3% is steep. How about 2%?
    Broker: I can do 2.5% for quick pay.
    Carrier: Alright, 2.5% discount for 2-day pay. What about fuel advance?
    Broker: We offer 40% fuel advance once you're loaded and send BOL.
    Carrier: 40% advance works. So $3,200 base rate, net 30 standard, or quick pay at 2.5% discount.
    Broker: Correct. And the 40% fuel advance available once loaded.
  `,

  multiLoadWithDifferentRates: `
    Broker: I have two loads out of Chicago, interested?
    Carrier: Where are they going?
    Broker: First one goes to St. Louis, second to Indianapolis.
    Carrier: What are the rates?
    Broker: St. Louis pays $1,400 flat, Indianapolis pays $1,650.
    Carrier: The St. Louis is closer but pays less.
    Broker: Right, St. Louis is 300 miles at $1,400. Indianapolis is 185 miles but pays $1,650 because it's time-sensitive.
    Carrier: So that's $4.67 per mile to St. Louis, but $8.92 per mile to Indy?
    Broker: Correct. The Indy load is expedited, needs team drivers.
    Carrier: I'll take both. $1,400 for St. Louis, $1,650 for Indianapolis expedited.
  `,

  // ==========================================
  // CARRIER INFORMATION SCENARIOS
  // ==========================================

  carrierIntroduction: `
    Carrier: This is Bob from Thunder Transport calling about your posted loads.
    Broker: Hi Bob, thanks for calling. Tell me about your operation.
    Carrier: We're Thunder Transport out of Dallas. Been in business 15 years, run mostly Texas and surrounding states.
    Broker: Great. What's your MC number?
    Carrier: MC number is 789456.
    Broker: 789456, got it. How many trucks do you run?
    Carrier: We have 12 trucks, mix of dry vans and flatbeds. All owner-operators.
    Broker: And you're the main contact?
    Carrier: Yes, I'm Bob Thompson, the dispatcher. My direct line is 214-555-1234.
  `,

  carrierWithMCNumber: `
    Broker: Can I get your company information?
    Carrier: Sure, we're Lightning Logistics, MC number 654321, DOT 987654.
    Broker: Lightning Logistics, MC 654321. Are you asset-based or broker?
    Carrier: We're asset-based, have our own trucks and drivers.
    Broker: Perfect. How's your safety rating?
    Carrier: Satisfactory rating, no violations in the last two years.
    Broker: Excellent. And your insurance is current?
    Carrier: Yes, million dollar liability, 100k cargo. I can send certificates.
  `,

  carrierEquipmentDetails: `
    Broker: What equipment do you have available?
    Carrier: Right now I have three dry vans and two reefers available.
    Broker: Are the reefers continuous run?
    Carrier: Yes, all our reefers are continuous run, late model Carrier units.
    Broker: What about flatbed?
    Carrier: No flatbeds available this week, but I'll have two coming free next Monday.
    Broker: Are your dry vans 53 footers?
    Carrier: Yes, all 53' air-ride dry vans. Two are 2020 models, one is 2019.
    Broker: Can they handle hazmat?
    Carrier: The drivers are hazmat certified but we prefer non-hazmat loads.
  `,

  carrierWithDriverInfo: `
    Carrier: I have a driver coming empty out of Phoenix tomorrow.
    Broker: Is it a solo driver or team?
    Carrier: Solo driver, but I also have a team available if needed.
    Broker: How experienced is the solo driver?
    Carrier: John's been with us 5 years, over a million safe miles. Very reliable.
    Broker: Does he have TWIC card, hazmat?
    Carrier: He has hazmat and TWIC, also certified for oversized loads.
    Broker: Perfect. What about the team drivers?
    Carrier: Husband and wife team, 8 years experience, they run cross-country regularly.
    Broker: Excellent. Can they handle time-sensitive loads?
    Carrier: Absolutely, they specialize in expedited freight.
  `,

  // ==========================================
  // SHIPPER INFORMATION SCENARIOS
  // ==========================================

  shipperBooking: `
    Shipper: Hi, this is Lisa from Global Manufacturing. We need to book a shipment.
    Broker: Hi Lisa, I can help with that. Can you give me your company details?
    Shipper: Sure, we're Global Manufacturing Inc, located at 4321 Production Drive, Detroit, Michigan 48201.
    Broker: Got it. Is there a specific dock or building?
    Shipper: Yes, shipping dock B, building 2. Hours are 6 AM to 2 PM Monday through Friday.
    Broker: Dock B, building 2, 6 AM to 2 PM weekdays. Who should the driver check in with?
    Shipper: Check in with shipping coordinator. If I'm not there, ask for Tom Martinez.
    Broker: Perfect. What's the best number to reach you?
    Shipper: My direct line is 313-555-6789, or Tom at extension 234.
  `,

  shipperWithFacilityDetails: `
    Shipper: Our facility has specific requirements for pickup.
    Broker: What do I need to know?
    Shipper: First, drivers must have PPE - hard hat, safety vest, steel-toe boots.
    Broker: PPE required, got it. What else?
    Shipper: We're appointment only. 4-hour windows starting at 6 AM, 10 AM, or 2 PM.
    Broker: Appointment required with 4-hour windows. How do we schedule?
    Shipper: Call 24 hours in advance to 555-DOCK-001. They'll give you a confirmation number.
    Broker: Call 24 hours ahead to 555-DOCK-001 for appointment. Any other restrictions?
    Shipper: No trucks over 70 feet total length, and we're closed weekends and holidays.
    Broker: Max 70 feet length, closed weekends and holidays. Noted.
  `,

  shipperWithSpecialRequirements: `
    Shipper: This shipment has special handling requirements.
    Broker: What kind of special handling?
    Shipper: The product is fragile electronics. Must be kept dry, no stacking, padded walls preferred.
    Broker: Fragile electronics, keep dry, no stacking, padded walls. Temperature controlled?
    Shipper: Not refrigerated, but protect from extreme heat. Keep between 40 and 90 degrees.
    Broker: 40 to 90 degrees Fahrenheit. Any loading requirements?
    Shipper: Driver must count and verify serial numbers on all pallets before leaving.
    Broker: Count and verify serial numbers. How many pallets total?
    Shipper: 28 pallets, each has a unique serial number on the manifest we'll provide.
    Broker: 28 pallets with serial numbers to verify. Anything else?
    Shipper: Load bars required every 8 feet, and driver needs to photo-document the loading.
  `,

  // ==========================================
  // ACTION ITEMS SCENARIOS
  // ==========================================

  callWithFollowUps: `
    Broker: So we agreed on $2,400 for the load?
    Carrier: Yes, $2,400 works.
    Broker: Great. I'll send you the rate confirmation within the hour.
    Carrier: Perfect. I'll have my driver call for the appointment once I get the rate con.
    Broker: Also, please send me your insurance certificates and W9.
    Carrier: I'll email those right after this call.
    Broker: And remember, the customer needs 24-hour tracking updates.
    Carrier: I'll set up the tracking and send you the link.
    Broker: One more thing - can you confirm you can pick up tomorrow by 10 AM?
    Carrier: Let me confirm with my driver and call you back within 30 minutes.
    Broker: Sounds good. I'll wait for your call before confirming with the customer.
  `,

  urgentActions: `
    Broker: This is a hot load, needs immediate attention.
    Carrier: What's the urgency?
    Broker: Customer's production line is down, waiting for these parts.
    Carrier: When do they need it?
    Broker: Must pick up within 2 hours and deliver by 6 AM tomorrow.
    Carrier: I need to dispatch my closest driver immediately.
    Broker: Yes, please confirm within 15 minutes if you can cover it.
    Carrier: I'll call the driver now and get right back to you.
    Broker: I also need your driver's name and cell number as soon as confirmed.
    Carrier: Will do. Should I have him call the shipper directly?
    Broker: No, have him call me first. I'll coordinate with the shipper.
    Carrier: Got it. Give me 10 minutes to set this up.
  `,

  communicationCommitments: `
    Broker: Let's make sure we're aligned on communication.
    Carrier: What do you need from us?
    Broker: First, call when loaded with the BOL number.
    Carrier: Call when loaded with BOL, got it.
    Broker: Then tracking updates every 4 hours while in transit.
    Carrier: Every 4 hours. Do you want calls or can I text?
    Broker: Text is fine for updates, but call if there are any issues or delays.
    Carrier: Text for updates, call for problems. What about delivery?
    Broker: Call 1 hour before delivery and immediately after with POD.
    Carrier: Call 1 hour out and after delivery with POD.
    Broker: I'll text you my personal cell for after-hours communication.
    Carrier: Perfect. I'll also send you our 24/7 dispatch number.
  `,

  callWithNextSteps: `
    Broker: Alright, let's recap our next steps.
    Carrier: Yes, let me write this down.
    Broker: First, I'll email the rate confirmation in the next 30 minutes.
    Carrier: I'll sign and return it immediately.
    Broker: Second, you'll dispatch your driver for tomorrow 8 AM pickup.
    Carrier: Yes, 8 AM pickup in Memphis.
    Broker: Third, driver needs to call shipper tonight for appointment.
    Carrier: He'll call them before 5 PM today.
    Broker: Fourth, send me driver info and truck number by tonight.
    Carrier: I'll text that as soon as we hang up.
    Broker: Finally, remember this delivers Thursday by noon, no exceptions.
    Carrier: Thursday noon delivery is confirmed. We won't be late.
    Broker: Perfect. Let's touch base tomorrow morning after pickup.
    Carrier: I'll call you once we're loaded.
  `,

  pendingDecisions: `
    Broker: I need to check a few things with my customer.
    Carrier: What's still pending?
    Broker: First, they might add a second stop in Nashville.
    Carrier: That would change the rate.
    Broker: Right, I quoted them $150 for the additional stop.
    Carrier: $150 is fair for Nashville. When will you know?
    Broker: They'll confirm by 3 PM today.
    Carrier: Okay, what else?
    Broker: They're deciding between Tuesday or Wednesday pickup.
    Carrier: I can do either day.
    Broker: Good. They'll also confirm if they need liftgate at delivery.
    Carrier: I don't have liftgate on this truck.
    Broker: I'll let them know. They might use their forklift instead.
    Carrier: When do you need my final answer on taking the load?
    Broker: Once I get customer confirmation, you'll have 1 hour to decide.
    Carrier: Fair enough. I'll standby for your call.
  `,

  // ==========================================
  // ERROR SCENARIOS
  // ==========================================

  wrongNumber: `
    Person: Hello?
    Broker: Hi, this is Mike from Apex Logistics. Is this Tom from Thunder Transport?
    Person: No, you have the wrong number. This is a residential number.
    Broker: Oh, I'm sorry for the confusion. Have a good day.
    Person: No problem. Goodbye.
  `,

  corruptedTranscript: `
    [INAUDIBLE] ... freight ... [STATIC] ... $2,4-- ... [CALL DROPPED]
    ... pickup tomorrow ... [INAUDIBLE] ...
    ... MC number is [GARBLED] ...
  `,

  // ==========================================
  // COMPLETE CALL SCENARIOS
  // ==========================================

  completeCarrierCall: `
    Broker: Apex Logistics, this is Mike.
    Carrier: Hi Mike, this is Bob from Thunder Transport, MC 789456. Calling about your Detroit to Atlanta load.
    Broker: Hi Bob, yes I have that available. 42,000 pounds of auto parts, dry van.
    Carrier: What's it paying?
    Broker: I can offer $2,850 on that.
    Carrier: $2,850... that's a bit low for 700 miles. Can you do $3,100?
    Broker: Let me check... I can go up to $2,950, that's my best.
    Carrier: Alright, $2,950 works. When does it pick up?
    Broker: Tomorrow morning, 8 AM appointment at Ford Plant, dock 12.
    Carrier: Delivery?
    Broker: Thursday by 5 PM in Atlanta, suburban warehouse.
    Carrier: We can handle that. My driver John will take it, truck 447.
    Broker: Perfect. I'll send the rate con to your email. Please sign and return.
    Carrier: Will do. I'll have John call for the appointment details.
    Broker: Great. Also need your insurance cert and W9 if you haven't sent them recently.
    Carrier: I'll include those with the signed rate con.
    Broker: Excellent. Call me once you're loaded tomorrow.
    Carrier: Will do. Thanks Mike.
  `,

  completeBookingCall: `
    Broker: Good afternoon, Apex Logistics, Mike speaking.
    Shipper: Hi Mike, this is Sarah from Global Manufacturing. We have a shipment to book.
    Broker: Hi Sarah, I can help with that. What are we shipping?
    Shipper: 35,000 pounds of packaged electronics from our Detroit facility to Dallas.
    Broker: Detroit to Dallas, 35,000 pounds. When does it need to ship?
    Shipper: Pickup Thursday morning, deliver by Monday noon.
    Broker: Thursday pickup, Monday delivery. Any special requirements?
    Shipper: Yes, needs air-ride van, no tarps, keep dry. Also driver needs appointment.
    Broker: Air-ride van, keep dry, appointment required. Let me check rates.
    Shipper: Also, the driver needs to bring load bars and straps.
    Broker: Load bars and straps, noted. For 35,000 pounds, Detroit to Dallas, I can do $2,600.
    Shipper: $2,600 sounds reasonable. Can you guarantee Monday delivery?
    Broker: Yes, I'll put a team on it to guarantee Monday noon delivery.
    Shipper: Perfect. Our dock hours are 7 AM to 3 PM for pickup.
    Broker: 7 to 3 Thursday. What's the pickup address?
    Shipper: 4321 Production Drive, Detroit, 48201. Dock B, Building 2.
    Broker: Got it. Delivery address in Dallas?
    Shipper: 8765 Distribution Way, Dallas, 75201. They're 24/7.
    Broker: Excellent. I'll send you the booking confirmation and arrange the truck.
    Shipper: Great. Please confirm the driver info once assigned.
    Broker: Will do. I'll have that to you by end of day today.
    Shipper: Thank you Mike. Talk to you soon.
  `
};

// Export as default for easier imports
export default Phase3TestTranscripts;