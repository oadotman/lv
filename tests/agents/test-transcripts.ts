/**
 * Test transcripts for various call scenarios
 * Covers all 17+ edge cases identified
 */

export const TestTranscripts = {
  // 1. Price negotiation with multiple offers
  carrier_negotiation: `
    Broker: Hey, I've got a load from Chicago to Dallas, 800 miles. What's your rate?
    Carrier: For that lane, I'd need at least $2,500 all in.
    Broker: That's a bit high. I can do $2,000 flat rate.
    Carrier: Can't do $2,000. How about $2,300?
    Broker: I can come up to $2,150, that's my best.
    Carrier: You know what, if you can guarantee detention after 2 hours, I'll take $2,150.
    Broker: Deal. $2,150 with detention after 2 hours. What's your MC number?
    Carrier: MC 123456. Driver's name is John Smith, truck 5541.
    Broker: Perfect, I'll send the rate con over. Pick up is tomorrow at 8 AM.
  `,

  // 2. Multiple loads in one call
  multi_load: `
    Shipper: I have three loads I need moved this week.
    Broker: Sure, what are the details?
    Shipper: First one is 20 pallets from Chicago to Dallas, picking up tomorrow.
    Broker: Okay, what about the second?
    Shipper: Second is 15 pallets, Atlanta to Miami, needs to deliver by Friday.
    Broker: Got it. And the third?
    Shipper: Third one is a full truckload, Denver to Phoenix, 30,000 lbs, Monday pickup.
    Broker: Let me quote these separately. Chicago to Dallas I can do for $2,200.
    Shipper: What about the other two?
    Broker: Atlanta to Miami $1,800, Denver to Phoenix $2,500.
  `,

  // 3. Check call that becomes new booking
  check_becomes_booking: `
    Carrier: Hey, I'm calling to check on that load to Dallas we discussed.
    Broker: Which one? I don't see you booked on anything.
    Carrier: The one from Chicago, we talked yesterday.
    Broker: Oh, that one's already covered. But I do have a new one from Memphis to Dallas if you're interested.
    Carrier: Memphis to Dallas? What's it paying?
    Broker: $1,900 flat rate, picking up tomorrow morning.
    Carrier: I can do that. My truck is actually in Memphis now.
    Broker: Perfect! Let's book it. Still MC 789012?
    Carrier: Yes, same MC. Driver will be Tom Johnson.
  `,

  // 4. Conditional agreement
  conditional_agreement: `
    Broker: I have a load from Seattle to Portland, 175 miles, paying $650.
    Carrier: That's pretty short. What time is pickup?
    Broker: Needs to pick up by noon tomorrow.
    Carrier: I'll take it IF you can push the pickup to 2 PM. My driver won't be available until then.
    Broker: Let me check with the shipper... pause... Okay, 2 PM works.
    Carrier: Alright, then we have a deal. $650, pickup at 2 PM.
    Broker: Confirmed. Send me your insurance and we're good to go.
  `,

  // 5. Non-committal response
  non_committal: `
    Broker: Got a load from Phoenix to Las Vegas, 300 miles, paying $1,100.
    Carrier: Phoenix to Vegas... What's the commodity?
    Broker: It's auto parts, 22,000 lbs.
    Carrier: Let me check with my driver and see if he's interested. He's in Phoenix but might have already committed to something else.
    Broker: When will you know?
    Carrier: I'll call you back in 30 minutes.
    Broker: Okay, but I need to know soon. I have other carriers asking about it.
  `,

  // 6. Broker needs shipper confirmation
  broker_needs_confirmation: `
    Carrier: I can do that Chicago to Dallas load for $2,200.
    Broker: That's a bit higher than what the shipper approved. Let me call them and see if they'll go up.
    Carrier: What were they approved at?
    Broker: They said $2,000 max, but the market's tight so they might budge.
    Carrier: If they can do $2,200, I'm ready to roll. I have a truck there now.
    Broker: I'll call you right back after I talk to them.
  `,

  // 7. Imprecise verbal rates
  imprecise_rates: `
    Broker: What's your rate on that?
    Carrier: I'm thinking around two grand, maybe twenty-one hundred.
    Broker: So $2,100?
    Carrier: Yeah, somewhere in that ballpark. Twenty to twenty-one hundred.
    Broker: I need a firm rate. Will you do it for $2,050?
    Carrier: Sure, let's call it an even two thousand fifty.
  `,

  // 8. Relative time references
  relative_times: `
    Shipper: I need this picked up tomorrow morning.
    Broker: What time tomorrow?
    Shipper: First thing, like 7 or 8 AM.
    Broker: And delivery?
    Shipper: Needs to be there by end of day Monday.
    Broker: End of day meaning 5 PM?
    Shipper: Yeah, business close, 5 or 6 PM is fine.
    Broker: So pickup tomorrow, let's say 7:30 AM, deliver Monday by 5:30 PM?
    Shipper: That works.
  `,

  // 9. Info promised via text
  info_via_text: `
    Carrier: What's the pickup address?
    Broker: I'll text you all the details. What's your cell?
    Carrier: 555-1234. Can you send the delivery info too?
    Broker: Yeah, I'll send you everything - addresses, reference numbers, contact info.
    Carrier: Great. What about the rate confirmation?
    Broker: I'll email that. What's your email?
    Carrier: bob@carriercompany.com
    Broker: Perfect, you'll have everything in 10 minutes.
  `,

  // 10. Previous load reference
  previous_reference: `
    Carrier: Hey, you got another one of those Chicago runs?
    Broker: Chicago to where?
    Carrier: Like last week, Chicago to Dallas. Same rate?
    Broker: Let me check... Yeah, I can do another one. Same rate as last time, $2,200?
    Carrier: That's the one. Same pickup location?
    Broker: Yes, same shipper, same everything.
    Carrier: I'll take it. Same driver too, John from last week.
  `,

  // 11. Equipment complexity
  equipment_nuances: `
    Broker: I need a flatbed with tarps for this one.
    Carrier: Is it a regular flatbed or does it need to be a step deck?
    Broker: Regular flatbed is fine, but must have at least 8 foot tarps.
    Carrier: I have a 48-foot flatbed with 8-foot lumber tarps. Will that work?
    Broker: That's perfect. It's actually lumber going.
    Carrier: No problem, we haul lumber all the time. Is it treated or untreated?
    Broker: Treated lumber, about 44,000 lbs.
  `,

  // 12. Rate structure confusion
  rate_confusion: `
    Carrier: What's the rate?
    Broker: $3.00 a mile.
    Carrier: Is that all miles or just loaded miles?
    Broker: That's loaded miles. It's 800 miles.
    Carrier: So $2,400 total?
    Broker: Correct, $2,400 flat rate.
    Carrier: Does that include fuel surcharge?
    Broker: That's all in, includes everything.
    Carrier: Okay, so $2,400 all in, no separate fuel surcharge?
    Broker: Exactly.
  `,

  // 13. Full accessorials discussion
  accessorials_discussion: `
    Carrier: What about detention?
    Broker: Two hours free, then $75 an hour.
    Carrier: What about lumper fees?
    Broker: Lumper is on the receiver, but you pay and we reimburse.
    Carrier: How much is the lumper usually?
    Broker: Usually around $200-300 for this receiver.
    Carrier: What about TONU?
    Broker: TONU is $250 if we cancel after you're dispatched.
    Carrier: Any stops?
    Broker: Just one stop, $50 for the extra stop.
  `,

  // 14. Carrier callback accepting
  callback_acceptance: `
    Carrier: Hey, I'm calling back about that Denver to Phoenix load.
    Broker: Oh yeah, you said you'd think about it. It's still available.
    Carrier: I'll take it at the $2,500 you offered.
    Broker: Great! You said MC 345678, right?
    Carrier: That's correct. I decided to take it since my driver is already in Denver.
    Broker: Perfect timing. Can you pick up tomorrow at 10 AM?
    Carrier: Yes, we'll be there.
  `,

  // 15. Multi-stop load
  multi_stop: `
    Broker: This has two stops. First stop in Kansas City, final in Dallas.
    Carrier: How many miles total?
    Broker: 250 to Kansas City, then another 500 to Dallas. 750 total.
    Carrier: What's coming off in Kansas City?
    Broker: 10 pallets in KC, remaining 15 pallets go to Dallas.
    Carrier: My rate for multi-stop is $2,800.
    Broker: That includes the stop pay?
    Carrier: Yes, that's all inclusive for both stops.
  `,

  // 16. Load details changing
  load_changes: `
    Broker: Remember that 20,000 lb load we discussed?
    Carrier: Yeah, Chicago to Dallas, tomorrow pickup.
    Broker: Change of plans. It's now 25,000 lbs and pickup got pushed to Wednesday.
    Carrier: 25,000 lbs changes things. That's 5,000 lbs more.
    Broker: I know. I can go up to $2,300 for the extra weight.
    Carrier: Wednesday pickup actually works better for me. $2,300 works.
    Broker: Great, so same everything else, just 25,000 lbs and Wednesday pickup.
  `,

  // 17. Wrong number
  wrong_number: `
    Person: Hello, is this Pizza Palace?
    Broker: No, this is a freight brokerage.
    Person: Oh, sorry, I must have the wrong number.
    Broker: No problem, have a good day.
    Person: You too, bye.
  `,

  // 18. Voicemail
  voicemail: `
    Recording: Hi, you've reached Bob at ABC Trucking. I'm either on another call or away from my desk. Please leave a message and I'll call you back as soon as possible. If this is urgent, please call my cell at 555-1234. Thanks and have a great day. BEEP.
  `
};