/**
 * Rate Confirmation PDF Generation Endpoint
 * Generates professional rate confirmation PDFs for loads
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import PDFDocument from 'pdfkit';
import nodemailer from 'nodemailer';

// Email transporter configuration
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

    // Check authentication
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const loadId = params.id;
    const body = await req.json();
    const { action = 'generate', email } = body; // action: generate, download, email

    // Get user's organization
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', session.user.id)
      .single();

    if (!profile?.organization_id) {
      return NextResponse.json({ error: 'No organization found' }, { status: 400 });
    }

    // Get load details with carrier and shipper
    const { data: load, error: loadError } = await supabase
      .from('loads')
      .select(`
        *,
        shippers (
          name,
          contact_name,
          phone,
          email,
          address
        ),
        carriers (
          company_name,
          mc_number,
          dot_number,
          contact_name,
          phone,
          email,
          driver_name,
          driver_phone
        )
      `)
      .eq('id', loadId)
      .eq('organization_id', profile.organization_id)
      .single();

    if (loadError || !load) {
      return NextResponse.json({ error: 'Load not found' }, { status: 404 });
    }

    // Get organization details for broker info
    const { data: organization } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', profile.organization_id)
      .single();

    // Generate rate confirmation number
    const rateConNumber = `RC-${load.load_number}-${Date.now().toString().slice(-6)}`;

    // Generate PDF
    const pdfBuffer = await generateRateConPDF(load, organization, rateConNumber);

    // Save rate confirmation record
    const { data: rateCon, error: rateConError } = await supabase
      .from('rate_confirmations')
      .insert({
        organization_id: profile.organization_id,
        load_id: loadId,
        confirmation_number: rateConNumber,
        status: 'generated',
        created_at: new Date().toISOString(),
        created_by: session.user.id
      })
      .select()
      .single();

    if (rateConError) {
      console.error('Error saving rate confirmation record:', rateConError);
    }

    // Handle different actions
    if (action === 'email' && email) {
      // Send email with PDF attachment
      try {
        await sendRateConEmail(email, load, pdfBuffer, rateConNumber);

        // Update rate con status
        if (rateCon) {
          await supabase
            .from('rate_confirmations')
            .update({
              status: 'sent',
              sent_at: new Date().toISOString(),
              sent_to_email: email
            })
            .eq('id', rateCon.id);
        }

        return NextResponse.json({
          success: true,
          message: `Rate confirmation sent to ${email}`,
          confirmationNumber: rateConNumber
        });

      } catch (emailError: any) {
        console.error('Error sending email:', emailError);
        return NextResponse.json(
          { error: 'Failed to send email', details: emailError.message },
          { status: 500 }
        );
      }
    } else {
      // Return PDF for download
      // Convert Buffer to Uint8Array for NextResponse
      const uint8Array = new Uint8Array(pdfBuffer);
      return new NextResponse(uint8Array, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="rate-con-${rateConNumber}.pdf"`,
          'X-Confirmation-Number': rateConNumber
        }
      });
    }

  } catch (error: any) {
    console.error('Error generating rate confirmation:', error);
    return NextResponse.json(
      { error: 'Failed to generate rate confirmation', details: error.message },
      { status: 500 }
    );
  }
}

// Generate PDF function
async function generateRateConPDF(load: any, organization: any, rateConNumber: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50 });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Header
      doc.fontSize(20).font('Helvetica-Bold').text('RATE CONFIRMATION', { align: 'center' });
      doc.fontSize(10).font('Helvetica').text(`Confirmation #: ${rateConNumber}`, { align: 'center' });
      doc.moveDown();

      // Broker Information
      doc.fontSize(12).font('Helvetica-Bold').text('BROKER INFORMATION');
      doc.fontSize(10).font('Helvetica');
      doc.text(`Company: ${organization?.name || 'LoadVoice Brokerage'}`);
      doc.text(`MC Number: ${organization?.mc_number || 'MC-XXXXXX'}`);
      doc.text(`Phone: ${organization?.phone || '1-800-LOADVOICE'}`);
      doc.text(`Email: ${organization?.email || 'dispatch@loadvoice.com'}`);
      if (organization?.address) {
        doc.text(`Address: ${organization.address}`);
      }
      doc.moveDown();

      // Load Information
      doc.fontSize(12).font('Helvetica-Bold').text('LOAD INFORMATION');
      doc.fontSize(10).font('Helvetica');
      doc.text(`Load Number: ${load.load_number}`);
      doc.text(`Reference: ${load.reference_number || 'N/A'}`);
      doc.moveDown(0.5);

      // Shipper Information
      doc.fontSize(11).font('Helvetica-Bold').text('SHIPPER:');
      doc.fontSize(10).font('Helvetica');
      if (load.shippers) {
        doc.text(`Name: ${load.shippers.name}`);
        doc.text(`Contact: ${load.shippers.contact_name || 'N/A'}`);
        doc.text(`Phone: ${load.shippers.phone || 'N/A'}`);
      } else {
        doc.text('Shipper information not available');
      }
      doc.moveDown(0.5);

      // Pickup Information
      doc.fontSize(11).font('Helvetica-Bold').text('PICKUP:');
      doc.fontSize(10).font('Helvetica');
      doc.text(`Location: ${load.pickup_city}, ${load.pickup_state}`);
      if (load.pickup_address) {
        doc.text(`Address: ${load.pickup_address}`);
      }
      doc.text(`Date: ${formatDate(load.pickup_date)}`);
      doc.text(`Time: ${load.pickup_time || 'FCFS'}`);
      doc.moveDown(0.5);

      // Delivery Information
      doc.fontSize(11).font('Helvetica-Bold').text('DELIVERY:');
      doc.fontSize(10).font('Helvetica');
      doc.text(`Location: ${load.delivery_city}, ${load.delivery_state}`);
      if (load.delivery_address) {
        doc.text(`Address: ${load.delivery_address}`);
      }
      doc.text(`Date: ${formatDate(load.delivery_date)}`);
      doc.text(`Time: ${load.delivery_time || 'FCFS'}`);
      doc.moveDown();

      // Commodity Information
      doc.fontSize(12).font('Helvetica-Bold').text('COMMODITY INFORMATION');
      doc.fontSize(10).font('Helvetica');
      doc.text(`Description: ${load.commodity || 'General Freight'}`);
      doc.text(`Weight: ${load.weight ? `${load.weight.toLocaleString()} lbs` : 'TBD'}`);
      doc.text(`Equipment Type: ${load.equipment_type || 'Dry Van'}`);
      if (load.special_instructions) {
        doc.text(`Special Instructions: ${load.special_instructions}`);
      }
      doc.moveDown();

      // Carrier Information
      doc.fontSize(12).font('Helvetica-Bold').text('CARRIER INFORMATION');
      doc.fontSize(10).font('Helvetica');
      if (load.carriers) {
        doc.text(`Company: ${load.carriers.company_name}`);
        doc.text(`MC Number: ${load.carriers.mc_number || 'N/A'}`);
        doc.text(`DOT Number: ${load.carriers.dot_number || 'N/A'}`);
        doc.text(`Dispatcher: ${load.carriers.contact_name || 'N/A'}`);
        doc.text(`Phone: ${load.carriers.phone || 'N/A'}`);
        doc.text(`Driver: ${load.carriers.driver_name || 'TBD'}`);
        doc.text(`Driver Phone: ${load.carriers.driver_phone || 'TBD'}`);
      } else {
        doc.text('Carrier to be assigned');
      }
      doc.moveDown();

      // Rate Information
      doc.fontSize(12).font('Helvetica-Bold').text('RATE & PAYMENT');
      doc.fontSize(10).font('Helvetica');
      doc.text(`Line Haul Rate: ${load.carrier_rate ? `$${load.carrier_rate.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : 'TBD'}`);
      doc.text(`Payment Terms: Net 30 Days (Quick Pay Available - 2% discount)`);
      doc.moveDown();

      // Terms and Conditions
      doc.fontSize(12).font('Helvetica-Bold').text('TERMS & CONDITIONS');
      doc.fontSize(9).font('Helvetica');
      doc.text('1. Carrier agrees to transport the above described freight at the rate specified.');
      doc.text('2. Carrier shall be liable for cargo loss and damage in accordance with 49 USC 14706.');
      doc.text('3. Carrier warrants it maintains cargo and liability insurance of at least $1,000,000.');
      doc.text('4. Carrier agrees to notify broker immediately of any delays or issues.');
      doc.text('5. This rate confirmation is subject to the terms of the Broker-Carrier Agreement.');
      doc.moveDown();

      // Signature Lines
      doc.fontSize(10).font('Helvetica-Bold');
      doc.text('CARRIER ACCEPTANCE:', 50, doc.y);
      doc.moveDown(2);
      doc.fontSize(9).font('Helvetica');
      doc.text('_____________________________', 50, doc.y);
      doc.text('Signature', 50, doc.y + 15);
      doc.text('_____________________________', 250, doc.y - 15);
      doc.text('Date', 250, doc.y);
      doc.moveDown(2);

      // Footer
      doc.fontSize(8).font('Helvetica').fillColor('gray');
      doc.text(`Generated by LoadVoice on ${new Date().toLocaleString()}`, { align: 'center' });
      doc.text('This rate confirmation constitutes a legally binding agreement', { align: 'center' });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

// Send email with rate con attached
async function sendRateConEmail(
  email: string,
  load: any,
  pdfBuffer: Buffer,
  rateConNumber: string
): Promise<void> {
  const mailOptions = {
    from: process.env.SMTP_FROM || 'LoadVoice <noreply@loadvoice.com>',
    to: email,
    subject: `Rate Confirmation - Load ${load.load_number}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Rate Confirmation</h2>

        <p>Please find attached the rate confirmation for:</p>

        <div style="background: #f3f4f6; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p><strong>Load Number:</strong> ${load.load_number}</p>
          <p><strong>Confirmation Number:</strong> ${rateConNumber}</p>
          <p><strong>Route:</strong> ${load.pickup_city}, ${load.pickup_state} → ${load.delivery_city}, ${load.delivery_state}</p>
          <p><strong>Pickup Date:</strong> ${formatDate(load.pickup_date)}</p>
          <p><strong>Commodity:</strong> ${load.commodity || 'General Freight'}</p>
          <p><strong>Rate:</strong> $${load.carrier_rate?.toLocaleString('en-US', { minimumFractionDigits: 2 }) || 'TBD'}</p>
        </div>

        <p>Please review the attached rate confirmation and confirm acceptance by signing and returning.</p>

        <p>If you have any questions, please don't hesitate to contact us.</p>

        <p style="color: #6b7280; font-size: 12px; margin-top: 30px;">
          This is an automated email from LoadVoice. Please do not reply directly to this email.
        </p>
      </div>
    `,
    attachments: [
      {
        filename: `rate-con-${rateConNumber}.pdf`,
        content: pdfBuffer,
        contentType: 'application/pdf'
      }
    ]
  };

  await transporter.sendMail(mailOptions);
}

// Helper function to format dates
function formatDate(dateString: string | null): string {
  if (!dateString) return 'TBD';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

// GET endpoint to retrieve rate confirmation history
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

    // Check authentication
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const loadId = params.id;

    // Get user's organization
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', session.user.id)
      .single();

    if (!profile?.organization_id) {
      return NextResponse.json({ error: 'No organization found' }, { status: 400 });
    }

    // Get all rate confirmations for this load
    const { data: rateConfirmations, error } = await supabase
      .from('rate_confirmations')
      .select('*')
      .eq('load_id', loadId)
      .eq('organization_id', profile.organization_id)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    return NextResponse.json({
      rateConfirmations: rateConfirmations || []
    });

  } catch (error: any) {
    console.error('Error fetching rate confirmations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch rate confirmations' },
      { status: 500 }
    );
  }
}