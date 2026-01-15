import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET carrier documents
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient();

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's organization
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single();

    if (!profile?.organization_id) {
      return NextResponse.json({ error: 'No organization found' }, { status: 400 });
    }

    // Fetch documents for the carrier
    const { data: documents, error } = await supabase
      .from('carrier_documents')
      .select(`
        *,
        profiles!carrier_documents_uploaded_by_fkey (
          full_name,
          avatar_url
        )
      `)
      .eq('carrier_id', params.id)
      .eq('organization_id', profile.organization_id)
      .order('uploaded_at', { ascending: false });

    if (error) {
      console.error('Error fetching documents:', error);
      return NextResponse.json(
        { error: 'Failed to fetch documents' },
        { status: 500 }
      );
    }

    return NextResponse.json(documents || []);
  } catch (error) {
    console.error('Error in get documents API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST upload a new document
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient();

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's organization
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single();

    if (!profile?.organization_id) {
      return NextResponse.json({ error: 'No organization found' }, { status: 400 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const documentType = formData.get('type') as string;
    const expiresAt = formData.get('expires_at') as string;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Upload file to storage
    const fileName = `${profile.organization_id}/${params.id}/${Date.now()}-${file.name}`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('carrier-documents')
      .upload(fileName, file, {
        contentType: file.type,
      });

    if (uploadError) {
      console.error('Error uploading file:', uploadError);
      return NextResponse.json(
        { error: 'Failed to upload file' },
        { status: 500 }
      );
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('carrier-documents')
      .getPublicUrl(fileName);

    // Create document record
    const documentData = {
      carrier_id: params.id,
      organization_id: profile.organization_id,
      name: file.name,
      type: documentType || 'other',
      url: publicUrl,
      file_path: fileName,
      file_size: file.size,
      mime_type: file.type,
      uploaded_by: user.id,
      uploaded_at: new Date().toISOString(),
      expires_at: expiresAt || null,
    };

    const { data: document, error: documentError } = await supabase
      .from('carrier_documents')
      .insert(documentData)
      .select(`
        *,
        profiles!carrier_documents_uploaded_by_fkey (
          full_name,
          avatar_url
        )
      `)
      .single();

    if (documentError) {
      // Clean up uploaded file
      await supabase.storage
        .from('carrier-documents')
        .remove([fileName]);

      console.error('Error creating document record:', documentError);
      return NextResponse.json(
        { error: 'Failed to create document record' },
        { status: 500 }
      );
    }

    return NextResponse.json(document);
  } catch (error) {
    console.error('Error in upload document API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE a document
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient();

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's organization
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single();

    if (!profile?.organization_id) {
      return NextResponse.json({ error: 'No organization found' }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const documentId = searchParams.get('documentId');

    if (!documentId) {
      return NextResponse.json(
        { error: 'Document ID required' },
        { status: 400 }
      );
    }

    // Get document to delete
    const { data: document, error: fetchError } = await supabase
      .from('carrier_documents')
      .select('file_path')
      .eq('id', documentId)
      .eq('carrier_id', params.id)
      .eq('organization_id', profile.organization_id)
      .single();

    if (fetchError || !document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    // Delete from storage
    if (document.file_path) {
      await supabase.storage
        .from('carrier-documents')
        .remove([document.file_path]);
    }

    // Delete record
    const { error: deleteError } = await supabase
      .from('carrier_documents')
      .delete()
      .eq('id', documentId);

    if (deleteError) {
      console.error('Error deleting document:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete document' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in delete document API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}