// =====================================================
// BULL BOARD QUEUE MONITORING UI
// Provides admin interface for monitoring Bull queues
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { createBullBoard } from '@bull-board/api';
import { BullAdapter } from '@bull-board/api/bullAdapter';
import { getCallProcessingQueue } from '@/lib/queue/bull-processor';
import { createServerClient, requireAuth } from '@/lib/supabase/server';

// Password protection for Bull Board
const BULL_BOARD_PASSWORD = process.env.BULL_BOARD_PASSWORD || 'admin_password_change_me';

// Initialize Bull Board
let bullBoardInitialized = false;
let serverAdapter: any;

async function initializeBullBoard() {
  if (bullBoardInitialized) return serverAdapter;

  try {
    // Import ExpressAdapter dynamically to avoid issues
    const { ExpressAdapter } = await import('@bull-board/express');

    serverAdapter = new ExpressAdapter();
    serverAdapter.setBasePath('/api/admin/queue');

    // Get the queue instance
    const callQueue = await getCallProcessingQueue();

    // Create Bull Board with the queue
    createBullBoard({
      queues: [new BullAdapter(callQueue)],
      serverAdapter,
    });

    bullBoardInitialized = true;
    return serverAdapter;
  } catch (error) {
    console.error('[BullBoard] Failed to initialize:', error);
    throw error;
  }
}

// Authentication middleware
async function authenticate(req: NextRequest): Promise<boolean> {
  // Check for basic auth header
  const authHeader = req.headers.get('authorization');

  if (authHeader?.startsWith('Basic ')) {
    const base64Credentials = authHeader.slice(6);
    const credentials = Buffer.from(base64Credentials, 'base64').toString('ascii');
    const [username, password] = credentials.split(':');

    if (username === 'admin' && password === BULL_BOARD_PASSWORD) {
      return true;
    }
  }

  // Check if user is authenticated admin via Supabase
  try {
    const user = await requireAuth();
    if (user) {
      const supabase = createServerClient();

      // Check if user has admin role
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (profile?.role === 'admin' || profile?.role === 'super_admin') {
        return true;
      }
    }
  } catch (error) {
    // User not authenticated via Supabase
  }

  return false;
}

export async function GET(req: NextRequest) {
  try {
    // Check authentication
    const isAuthenticated = await authenticate(req);

    if (!isAuthenticated) {
      // Return 401 with basic auth challenge
      return new NextResponse('Authentication required', {
        status: 401,
        headers: {
          'WWW-Authenticate': 'Basic realm="Bull Board Admin"',
        },
      });
    }

    // Initialize Bull Board if needed
    const adapter = await initializeBullBoard();

    // Get the path from the URL
    const url = new URL(req.url);
    const path = url.pathname.replace('/api/admin/queue', '') || '/';

    // Create a mock Express request/response
    const mockReq = {
      method: 'GET',
      url: path,
      headers: Object.fromEntries(req.headers.entries()),
      query: Object.fromEntries(url.searchParams.entries()),
    };

    // Handle the request through Bull Board
    const handler = adapter.getRouter();

    // This is a simplified handler - in production, you'd want a more robust solution
    // For now, return a simple HTML page with queue stats
    const html = await generateQueueDashboard();

    return new NextResponse(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html',
      },
    });
  } catch (error) {
    console.error('[BullBoard] Error:', error);
    return NextResponse.json(
      { error: 'Failed to load queue dashboard' },
      { status: 500 }
    );
  }
}

// Generate a simple dashboard HTML
async function generateQueueDashboard(): Promise<string> {
  try {
    const queue = await getCallProcessingQueue();

    // Get queue stats
    const [
      waitingCount,
      activeCount,
      completedCount,
      failedCount,
      delayedCount,
      pausedCount,
    ] = await Promise.all([
      queue.getWaitingCount(),
      queue.getActiveCount(),
      queue.getCompletedCount(),
      queue.getFailedCount(),
      queue.getDelayedCount(),
      queue.isPaused(),
    ]);

    // Get recent jobs
    const [waiting, active, completed, failed] = await Promise.all([
      queue.getWaiting(0, 10),
      queue.getActive(0, 10),
      queue.getCompleted(0, 10),
      queue.getFailed(0, 10),
    ]);

    return `
<!DOCTYPE html>
<html>
<head>
  <title>Queue Monitor - LoadVoice</title>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      padding: 20px;
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
    }
    h1 {
      color: white;
      margin-bottom: 30px;
      font-size: 2.5em;
      text-shadow: 2px 2px 4px rgba(0,0,0,0.2);
    }
    .stats {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
      margin-bottom: 30px;
    }
    .stat-card {
      background: white;
      border-radius: 12px;
      padding: 20px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.1);
      transition: transform 0.3s;
    }
    .stat-card:hover {
      transform: translateY(-5px);
    }
    .stat-value {
      font-size: 2.5em;
      font-weight: bold;
      color: #667eea;
    }
    .stat-label {
      color: #666;
      margin-top: 5px;
      text-transform: uppercase;
      font-size: 0.85em;
      letter-spacing: 1px;
    }
    .jobs-section {
      background: white;
      border-radius: 12px;
      padding: 25px;
      margin-bottom: 20px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.1);
    }
    h2 {
      color: #333;
      margin-bottom: 15px;
      padding-bottom: 10px;
      border-bottom: 2px solid #667eea;
    }
    .job-list {
      list-style: none;
    }
    .job-item {
      padding: 12px;
      border-bottom: 1px solid #eee;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .job-item:last-child {
      border-bottom: none;
    }
    .job-id {
      font-family: monospace;
      color: #667eea;
      font-size: 0.9em;
    }
    .job-time {
      color: #999;
      font-size: 0.85em;
    }
    .status-badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 0.75em;
      font-weight: 600;
      text-transform: uppercase;
    }
    .status-waiting { background: #fef3c7; color: #92400e; }
    .status-active { background: #dbeafe; color: #1e40af; }
    .status-completed { background: #d1fae5; color: #065f46; }
    .status-failed { background: #fee2e2; color: #991b1b; }
    .refresh-btn {
      background: white;
      color: #667eea;
      border: 2px solid #667eea;
      padding: 12px 24px;
      border-radius: 8px;
      font-size: 16px;
      cursor: pointer;
      transition: all 0.3s;
      margin-bottom: 20px;
    }
    .refresh-btn:hover {
      background: #667eea;
      color: white;
    }
    .paused-notice {
      background: #fef3c7;
      color: #92400e;
      padding: 15px;
      border-radius: 8px;
      margin-bottom: 20px;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .empty-state {
      text-align: center;
      padding: 20px;
      color: #999;
      font-style: italic;
    }
  </style>
  <script>
    function refreshPage() {
      window.location.reload();
    }
    // Auto-refresh every 5 seconds
    setInterval(refreshPage, 5000);
  </script>
</head>
<body>
  <div class="container">
    <h1>🎯 Queue Monitor</h1>

    ${pausedCount ? '<div class="paused-notice">⚠️ Queue is currently paused</div>' : ''}

    <button class="refresh-btn" onclick="refreshPage()">🔄 Refresh</button>

    <div class="stats">
      <div class="stat-card">
        <div class="stat-value">${waitingCount}</div>
        <div class="stat-label">Waiting</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${activeCount}</div>
        <div class="stat-label">Active</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${completedCount}</div>
        <div class="stat-label">Completed</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${failedCount}</div>
        <div class="stat-label">Failed</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${delayedCount}</div>
        <div class="stat-label">Delayed</div>
      </div>
    </div>

    ${activeCount > 0 ? `
    <div class="jobs-section">
      <h2>🔄 Active Jobs</h2>
      <ul class="job-list">
        ${active.map(job => `
          <li class="job-item">
            <span class="job-id">#${job.id}</span>
            <span>${job.data.fileName || 'Processing...'}</span>
            <span class="status-badge status-active">Active</span>
          </li>
        `).join('')}
      </ul>
    </div>
    ` : ''}

    ${waitingCount > 0 ? `
    <div class="jobs-section">
      <h2>⏳ Waiting Jobs</h2>
      <ul class="job-list">
        ${waiting.map(job => `
          <li class="job-item">
            <span class="job-id">#${job.id}</span>
            <span>${job.data.fileName || 'Queued'}</span>
            <span class="status-badge status-waiting">Waiting</span>
          </li>
        `).join('')}
      </ul>
    </div>
    ` : ''}

    ${failedCount > 0 ? `
    <div class="jobs-section">
      <h2>❌ Failed Jobs</h2>
      <ul class="job-list">
        ${failed.map(job => `
          <li class="job-item">
            <span class="job-id">#${job.id}</span>
            <span>${job.data.fileName || 'Unknown'}</span>
            <span class="status-badge status-failed">Failed</span>
          </li>
        `).join('')}
      </ul>
    </div>
    ` : ''}

    <div class="jobs-section">
      <h2>✅ Recently Completed</h2>
      ${completed.length > 0 ? `
        <ul class="job-list">
          ${completed.map(job => `
            <li class="job-item">
              <span class="job-id">#${job.id}</span>
              <span>${job.data.fileName || 'Completed'}</span>
              <span class="status-badge status-completed">Done</span>
            </li>
          `).join('')}
        </ul>
      ` : '<div class="empty-state">No completed jobs yet</div>'}
    </div>
  </div>
</body>
</html>
    `;
  } catch (error) {
    console.error('[BullBoard] Failed to generate dashboard:', error);
    return `
<!DOCTYPE html>
<html>
<head>
  <title>Queue Monitor Error</title>
</head>
<body>
  <h1>Failed to load queue dashboard</h1>
  <p>Error: ${error instanceof Error ? error.message : 'Unknown error'}</p>
</body>
</html>
    `;
  }
}