/**
 * LoadVoice Test Data Seeder
 * Populates database with realistic freight broker data for testing
 */

const { createClient } = require('@supabase/supabase-js');
const { faker } = require('@faker-js/faker');

// Initialize Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Configuration
const SEED_CONFIG = {
  organizationId: null, // Will be set dynamically
  loads: 50,
  carriers: 20,
  shippers: 15,
  calls: 100,
  extractionInbox: 10
};

// Common freight data
const COMMODITIES = [
  'Steel Coils', 'Aluminum Sheets', 'Plastic Pellets', 'Paper Rolls',
  'Auto Parts', 'Electronics', 'Furniture', 'Food Products',
  'Construction Materials', 'Chemicals (Non-Hazmat)', 'Textiles',
  'Machinery', 'Consumer Goods', 'Medical Supplies', 'Raw Materials'
];

const EQUIPMENT_TYPES = [
  'Dry Van', 'Reefer', 'Flatbed', 'Step Deck', 'RGN',
  'Power Only', 'Hotshot', 'Box Truck', 'Conestoga'
];

const MAJOR_CITIES = [
  { city: 'Chicago', state: 'IL' },
  { city: 'Los Angeles', state: 'CA' },
  { city: 'Houston', state: 'TX' },
  { city: 'Atlanta', state: 'GA' },
  { city: 'Miami', state: 'FL' },
  { city: 'New York', state: 'NY' },
  { city: 'Dallas', state: 'TX' },
  { city: 'Phoenix', state: 'AZ' },
  { city: 'Philadelphia', state: 'PA' },
  { city: 'Detroit', state: 'MI' },
  { city: 'Seattle', state: 'WA' },
  { city: 'Denver', state: 'CO' },
  { city: 'Boston', state: 'MA' },
  { city: 'Nashville', state: 'TN' },
  { city: 'Memphis', state: 'TN' },
  { city: 'Louisville', state: 'KY' },
  { city: 'Indianapolis', state: 'IN' },
  { city: 'Columbus', state: 'OH' },
  { city: 'Charlotte', state: 'NC' },
  { city: 'Jacksonville', state: 'FL' }
];

const LOAD_STATUSES = [
  'quoted',
  'needs_carrier',
  'dispatched',
  'in_transit',
  'delivered',
  'completed'
];

// Helper functions
function getRandomLocation() {
  return MAJOR_CITIES[Math.floor(Math.random() * MAJOR_CITIES.length)];
}

function getRandomCommodity() {
  return COMMODITIES[Math.floor(Math.random() * COMMODITIES.length)];
}

function getRandomEquipment() {
  return EQUIPMENT_TYPES[Math.floor(Math.random() * EQUIPMENT_TYPES.length)];
}

function getRandomStatus() {
  return LOAD_STATUSES[Math.floor(Math.random() * LOAD_STATUSES.length)];
}

function calculateMiles(origin, destination) {
  // Simplified distance calculation
  const avgMilesPerState = 500;
  const stateDistance = origin.state === destination.state ? 0 : 1;
  return 100 + Math.floor(Math.random() * 2000) + (stateDistance * avgMilesPerState);
}

function calculateRate(miles, equipment) {
  // Base rate per mile
  let ratePerMile = 2.5 + Math.random() * 1.5; // $2.50 - $4.00 per mile

  // Adjust for equipment type
  if (equipment === 'Reefer') ratePerMile += 0.30;
  if (equipment === 'Flatbed') ratePerMile += 0.20;
  if (equipment === 'RGN') ratePerMile += 0.50;

  return Math.round(miles * ratePerMile);
}

// Seed functions
async function seedCarriers(orgId) {
  console.log('\n📦 Seeding Carriers...');
  const carriers = [];

  for (let i = 0; i < SEED_CONFIG.carriers; i++) {
    const carrier = {
      organization_id: orgId,
      company_name: faker.company.name() + ' Transport',
      mc_number: `MC-${faker.number.int({ min: 100000, max: 999999 })}`,
      dot_number: `DOT-${faker.number.int({ min: 1000000, max: 9999999 })}`,
      contact_name: faker.person.fullName(),
      phone: faker.phone.number('###-###-####'),
      email: faker.internet.email(),
      address: faker.location.streetAddress(),
      city: faker.location.city(),
      state: faker.location.state({ abbreviated: true }),
      zip: faker.location.zipCode(),
      equipment_types: [getRandomEquipment(), getRandomEquipment()],
      insurance_expiry: faker.date.future().toISOString(),
      authority_status: 'active',
      safety_rating: faker.number.int({ min: 70, max: 99 }),
      on_time_percentage: faker.number.int({ min: 85, max: 99 }),
      total_loads: faker.number.int({ min: 10, max: 500 }),
      average_rate: faker.number.int({ min: 2000, max: 5000 }),
      created_at: faker.date.past({ years: 2 }).toISOString(),
      updated_at: faker.date.recent().toISOString()
    };

    carriers.push(carrier);
  }

  const { data, error } = await supabase
    .from('carriers')
    .insert(carriers)
    .select();

  if (error) {
    console.error('Error seeding carriers:', error);
    return [];
  }

  console.log(`  ✓ Created ${data.length} carriers`);
  return data;
}

async function seedShippers(orgId) {
  console.log('\n🏢 Seeding Shippers...');
  const shippers = [];

  for (let i = 0; i < SEED_CONFIG.shippers; i++) {
    const location = getRandomLocation();
    const shipper = {
      organization_id: orgId,
      name: faker.company.name(),
      contact_name: faker.person.fullName(),
      phone: faker.phone.number('###-###-####'),
      email: faker.internet.email(),
      address: faker.location.streetAddress(),
      city: location.city,
      state: location.state,
      zip: faker.location.zipCode(),
      facility_hours: `M-F ${faker.number.int({ min: 6, max: 8 })}AM-${faker.number.int({ min: 3, max: 6 })}PM`,
      appointment_required: faker.datatype.boolean(),
      lumper_required: faker.datatype.boolean(),
      credit_status: faker.helpers.arrayElement(['good', 'warning', 'hold']),
      payment_terms: faker.helpers.arrayElement(['Net 15', 'Net 30', 'Net 45', 'COD']),
      total_loads: faker.number.int({ min: 5, max: 200 }),
      lifetime_revenue: faker.number.int({ min: 50000, max: 1000000 }),
      avg_rate_per_mile: faker.number.float({ min: 2.0, max: 4.5, precision: 0.01 }),
      created_at: faker.date.past({ years: 2 }).toISOString(),
      updated_at: faker.date.recent().toISOString()
    };

    shippers.push(shipper);
  }

  const { data, error } = await supabase
    .from('shippers')
    .insert(shippers)
    .select();

  if (error) {
    console.error('Error seeding shippers:', error);
    return [];
  }

  console.log(`  ✓ Created ${data.length} shippers`);
  return data;
}

async function seedLoads(orgId, carriers, shippers) {
  console.log('\n🚚 Seeding Loads...');
  const loads = [];

  for (let i = 0; i < SEED_CONFIG.loads; i++) {
    const origin = getRandomLocation();
    const destination = getRandomLocation();
    const miles = calculateMiles(origin, destination);
    const equipment = getRandomEquipment();
    const rate = calculateRate(miles, equipment);
    const status = getRandomStatus();

    // Assign carrier if not 'needs_carrier' or 'quoted'
    const needsCarrier = status === 'needs_carrier' || status === 'quoted';
    const carrier = needsCarrier ? null : carriers[Math.floor(Math.random() * carriers.length)];
    const shipper = shippers[Math.floor(Math.random() * shippers.length)];

    const pickupDate = faker.date.future({ days: 7 });
    const deliveryDate = new Date(pickupDate);
    deliveryDate.setDate(deliveryDate.getDate() + Math.ceil(miles / 500));

    const load = {
      organization_id: orgId,
      load_number: `LD-${faker.number.int({ min: 10000, max: 99999 })}`,
      status,
      carrier_id: carrier?.id || null,
      shipper_id: shipper?.id || null,

      // Pickup details
      pickup_date: pickupDate.toISOString().split('T')[0],
      pickup_time: `${faker.number.int({ min: 6, max: 18 })}:00`,
      pickup_address: faker.location.streetAddress(),
      pickup_city: origin.city,
      pickup_state: origin.state,
      pickup_zip: faker.location.zipCode(),
      pickup_contact: faker.person.fullName(),
      pickup_phone: faker.phone.number('###-###-####'),

      // Delivery details
      delivery_date: deliveryDate.toISOString().split('T')[0],
      delivery_time: `${faker.number.int({ min: 6, max: 18 })}:00`,
      delivery_address: faker.location.streetAddress(),
      delivery_city: destination.city,
      delivery_state: destination.state,
      delivery_zip: faker.location.zipCode(),
      delivery_contact: faker.person.fullName(),
      delivery_phone: faker.phone.number('###-###-####'),

      // Load details
      commodity: getRandomCommodity(),
      weight: faker.number.int({ min: 10000, max: 45000 }),
      pallets: faker.number.int({ min: 10, max: 26 }),
      equipment_type: equipment,
      miles,
      rate,
      carrier_rate: carrier ? rate - Math.floor(rate * 0.15) : null, // 15% margin
      special_instructions: faker.datatype.boolean(0.3) ? faker.lorem.sentence() : null,
      temperature: equipment === 'Reefer' ? `${faker.number.int({ min: -10, max: 40 })}°F` : null,
      hazmat: false,
      team_required: miles > 1500,

      created_at: faker.date.recent({ days: 30 }).toISOString(),
      updated_at: faker.date.recent({ days: 7 }).toISOString()
    };

    loads.push(load);
  }

  const { data, error } = await supabase
    .from('loads')
    .insert(loads)
    .select();

  if (error) {
    console.error('Error seeding loads:', error);
    return [];
  }

  console.log(`  ✓ Created ${data.length} loads`);
  return data;
}

async function seedLanes(orgId, loads) {
  console.log('\n📊 Seeding Lane Statistics...');
  const laneMap = new Map();

  // Aggregate lane data from loads
  loads.forEach(load => {
    const laneKey = `${load.pickup_state}-${load.delivery_state}`;

    if (!laneMap.has(laneKey)) {
      laneMap.set(laneKey, {
        organization_id: orgId,
        lane_name: laneKey,
        origin_city: load.pickup_city,
        origin_state: load.pickup_state,
        destination_city: load.delivery_city,
        destination_state: load.delivery_state,
        loads: [],
        created_at: faker.date.past({ years: 1 }).toISOString(),
        updated_at: new Date().toISOString()
      });
    }

    const lane = laneMap.get(laneKey);
    lane.loads.push({
      rate: load.rate,
      miles: load.miles
    });
  });

  // Calculate lane statistics
  const lanes = Array.from(laneMap.values()).map(lane => {
    const totalRate = lane.loads.reduce((sum, l) => sum + l.rate, 0);
    const totalMiles = lane.loads.reduce((sum, l) => sum + l.miles, 0);
    const avgRate = Math.round(totalRate / lane.loads.length);
    const avgRpm = totalMiles > 0 ? (totalRate / totalMiles) : 0;

    return {
      organization_id: lane.organization_id,
      lane_name: lane.lane_name,
      origin_city: lane.origin_city,
      origin_state: lane.origin_state,
      destination_city: lane.destination_city,
      destination_state: lane.destination_state,
      average_rate: avgRate,
      average_rpm: Number(avgRpm.toFixed(2)),
      last_rate: lane.loads[lane.loads.length - 1].rate,
      load_count: lane.loads.length,
      created_at: lane.created_at,
      updated_at: lane.updated_at
    };
  });

  const { data, error } = await supabase
    .from('lanes')
    .insert(lanes)
    .select();

  if (error) {
    console.error('Error seeding lanes:', error);
    return [];
  }

  console.log(`  ✓ Created ${data.length} lanes`);
  return data;
}

async function seedExtractionInbox(orgId) {
  console.log('\n📥 Seeding Extraction Inbox...');
  const items = [];

  for (let i = 0; i < SEED_CONFIG.extractionInbox; i++) {
    const callType = faker.helpers.arrayElement(['shipper', 'carrier', 'check_call']);
    const origin = getRandomLocation();
    const destination = getRandomLocation();

    const extractedData = {
      call_type: callType,
      confidence: faker.number.int({ min: 75, max: 98 }),
      data: {
        load: {
          origin_city: origin.city,
          origin_state: origin.state,
          destination_city: destination.city,
          destination_state: destination.state,
          pickup_date: faker.date.future({ days: 7 }).toISOString().split('T')[0],
          commodity: getRandomCommodity(),
          equipment_type: getRandomEquipment(),
        },
        shipper: callType === 'shipper' ? {
          name: faker.company.name(),
          contact: faker.person.fullName(),
          phone: faker.phone.number('###-###-####')
        } : null,
        carrier: callType === 'carrier' ? {
          name: faker.company.name() + ' Transport',
          mc_number: `MC-${faker.number.int({ min: 100000, max: 999999 })}`,
          contact: faker.person.fullName()
        } : null,
        rate: {
          amount: faker.number.int({ min: 2000, max: 5000 })
        }
      }
    };

    const item = {
      organization_id: orgId,
      call_id: faker.string.uuid(),
      extraction_type: callType,
      status: 'pending',
      extracted_data: extractedData,
      confidence_score: extractedData.confidence,
      created_at: faker.date.recent({ days: 3 }).toISOString()
    };

    items.push(item);
  }

  const { data, error } = await supabase
    .from('extraction_inbox')
    .insert(items)
    .select();

  if (error) {
    console.error('Error seeding extraction inbox:', error);
    return [];
  }

  console.log(`  ✓ Created ${data.length} extraction inbox items`);
  return data;
}

// Main seeder function
async function seedDatabase() {
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║            LoadVoice Test Data Seeder                     ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
  `);

  try {
    // Get or create test organization
    console.log('\n🏢 Setting up test organization...');

    const { data: existingOrg } = await supabase
      .from('organizations')
      .select('id')
      .eq('name', 'LoadVoice Test Company')
      .single();

    let orgId;
    if (existingOrg) {
      orgId = existingOrg.id;
      console.log('  ✓ Using existing test organization');
    } else {
      const { data: newOrg, error } = await supabase
        .from('organizations')
        .insert({
          name: 'LoadVoice Test Company',
          settings: {
            mc_number: 'MC-TEST123',
            address: '123 Test Street, Chicago, IL 60601',
            phone: '555-TEST-123',
            email: 'test@loadvoice.com'
          }
        })
        .select()
        .single();

      if (error) throw error;
      orgId = newOrg.id;
      console.log('  ✓ Created new test organization');
    }

    SEED_CONFIG.organizationId = orgId;

    // Clean existing test data (optional)
    const cleanFirst = process.argv.includes('--clean');
    if (cleanFirst) {
      console.log('\n🧹 Cleaning existing test data...');
      await supabase.from('extraction_inbox').delete().eq('organization_id', orgId);
      await supabase.from('lanes').delete().eq('organization_id', orgId);
      await supabase.from('rate_confirmations').delete().eq('organization_id', orgId);
      await supabase.from('loads').delete().eq('organization_id', orgId);
      await supabase.from('carriers').delete().eq('organization_id', orgId);
      await supabase.from('shippers').delete().eq('organization_id', orgId);
      console.log('  ✓ Cleaned existing data');
    }

    // Seed data
    const carriers = await seedCarriers(orgId);
    const shippers = await seedShippers(orgId);
    const loads = await seedLoads(orgId, carriers, shippers);
    await seedLanes(orgId, loads);
    await seedExtractionInbox(orgId);

    // Summary
    console.log('\n' + '═'.repeat(60));
    console.log('✅ Test data seeded successfully!');
    console.log('═'.repeat(60));
    console.log(`
📊 Summary:
  • Organization: LoadVoice Test Company
  • Carriers: ${carriers.length}
  • Shippers: ${shippers.length}
  • Loads: ${loads.length}
  • Extraction Inbox: ${SEED_CONFIG.extractionInbox}
    `);

    console.log('🚀 You can now test LoadVoice with realistic data!');
    console.log('   Login with a test user to see the seeded data.\n');

  } catch (error) {
    console.error('\n❌ Seeding failed:', error);
    process.exit(1);
  }
}

// Run seeder
seedDatabase();