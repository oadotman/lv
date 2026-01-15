# LoadVoice AI - CRM Data Entry Automation

A Next.js web application for automating CRM data entry from sales call recordings. Upload calls and get CRM-ready data instantly with no integrations required.

## ✨ Features

- **Dashboard** - Activity summary with metrics and recent calls
- **Calls Management** - View, filter, and export all processed calls
- **Call Details** - Full transcripts with sentiment analysis and CRM-ready outputs
- **Templates** - Customize field mappings for any CRM system
- **Settings** - Account, billing, notifications, and API management
- **Upload Modal** - Drag-and-drop file upload with progress tracking
- **Mobile Responsive** - Fully responsive design for all screen sizes

## 🚀 Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4 + shadcn/ui components
- **Icons**: Lucide React
- **UI Components**: Radix UI primitives
- **Charts**: Recharts (for analytics)

## 📦 Installation

1. Install dependencies:
```bash
npm install
```

2. Run the development server:
```bash
npm run dev
```

3. Open [http://localhost:3000](http://localhost:3000) in your browser

## 🏗️ Project Structure

```
calliq/
├── app/                        # Next.js app directory
│   ├── calls/                  # Calls list and detail pages
│   │   └── [id]/              # Dynamic call detail page
│   ├── templates/             # Templates management
│   ├── settings/              # Settings with tabs
│   ├── help/                  # Help center
│   ├── compatibility/         # CRM compatibility info
│   ├── layout.tsx             # Root layout with sidebar
│   ├── page.tsx               # Dashboard (homepage)
│   └── globals.css            # Global styles
├── components/
│   ├── layout/                # Layout components
│   │   ├── Sidebar.tsx        # Left navigation with mobile menu
│   │   └── TopBar.tsx         # Top bar with actions
│   ├── modals/                # Modal dialogs
│   │   └── UploadModal.tsx    # File upload modal
│   ├── ui/                    # shadcn/ui components
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── badge.tsx
│   │   ├── dialog.tsx
│   │   ├── tabs.tsx
│   │   ├── input.tsx
│   │   ├── toast.tsx
│   │   └── ...
│   ├── call/                  # Call-specific components
│   └── charts/                # Chart components
├── lib/
│   ├── mockData.ts            # Mock data for demo
│   ├── types.ts               # TypeScript interfaces
│   └── utils.ts               # Utility functions
└── public/                    # Static assets
```

## 📱 Pages & Routes

| Route | Description |
|-------|-------------|
| `/` | Dashboard with metrics and recent calls |
| `/calls` | Calls list with filtering and pagination |
| `/calls/[id]` | Call detail with transcript and CRM output |
| `/calls/[id]/email` | Email generator (placeholder) |
| `/templates` | Templates manager with field editor |
| `/settings` | Settings (Account, Billing, Notifications, API, Danger Zone) |
| `/help` | Help center with categories |

## 🎨 Design System

### Colors
- **Primary**: #2563EB (Blue)
- **Success**: #10B981 (Green)
- **Warning**: #F59E0B (Yellow/Orange)
- **Destructive**: #DC2626 (Red)

### Typography
- **H1**: 36px, Bold
- **H2**: 24px, Semibold
- **H3**: 18px, Semibold
- **Body**: 14px
- **Small**: 12px

### Status Badges
- ✅ **Completed** - Green
- ⏳ **Processing** - Yellow
- ❌ **Failed** - Red

## 🔧 Scripts

```bash
# Development
npm run dev        # Start development server

# Production
npm run build      # Build for production
npm run start      # Start production server

# Linting
npm run lint       # Run ESLint
```

## 🗂️ Mock Data

The app uses mock data defined in `lib/mockData.ts`:
- Sample user (Alex Morgan)
- 8 sample calls with various statuses
- Full transcript for call detail view
- CRM outputs in multiple formats (Plain, HubSpot, Salesforce, CSV)
- 3 pre-built templates (Salesforce, HubSpot, Custom)
- Metrics and chart data

## 📋 Key Features by Screen

### Dashboard
- Metrics cards (Calls Processed, Time Saved, Minutes Remaining)
- Recent calls table with status badges
- Quick actions (Upload, View All)
- Empty state for first-time users

### Calls List
- Search by customer, rep, or keywords
- Filter by sales rep
- Pagination (10 items per page)
- Export button
- Actions menu (View Details, Re-export, Delete)

### Call Detail
- Audio player with waveform (simulated)
- Chat-style transcript with sentiment emojis
- Quick insights sidebar (Pain Points, Action Items, Competitors)
- CRM output tabs (Plain, HubSpot, Salesforce, CSV)
- **Large "Copy to Clipboard" button** (primary action)
- Generate follow-up email link

### Templates
- Template list sidebar with search
- Field editor with table view
- Add/Edit/Delete fields
- Field types: Text, Number, Date, Picklist

### Settings
- 5 tabs: Account, Billing, Notifications, API Keys, Danger Zone
- Profile information editor
- Subscription and payment management
- Email preferences with checkboxes
- API key management with show/hide toggle

## 🎯 Design Principles

1. **NO Integration Language** - No "Connected", "Synced", or "OAuth" mentions
2. **Copy/Paste First** - Prominent copy buttons everywhere
3. **Mobile Responsive** - Mobile menu, responsive tables, stacked layouts
4. **Clear Status** - Color-coded badges for all states
5. **Empty States** - Helpful messaging and CTAs when no data exists

## 🐛 Troubleshooting

If you encounter the "Port already in use" error:
```bash
# Kill the Next.js process manually
# Windows: Open Task Manager and end Node.js processes
# Mac/Linux: pkill -f "next dev"

# Then restart
npm run dev
```

If Tailwind styles aren't loading:
- Make sure `@tailwindcss/postcss` is installed
- Check `postcss.config.js` uses `@tailwindcss/postcss` plugin
- Delete `.next` folder and restart dev server

## 📝 Notes

- **No Authentication**: This is a demo app with mock data
- **No Backend**: All data is frontend-only
- **No Email Sending**: Email generator is a placeholder
- **No Real Uploads**: File uploads are simulated with progress bars
- **No Real Charts**: Analytics charts use static data

## 🚧 Future Enhancements

- Analytics page with Recharts
- Email generator implementation
- Follow-up reminder system
- Template creation wizard
- Advanced filtering and search
- Real-time collaboration
- Webhook support

## 📄 License

This is a demo project for educational purposes.

---

Built with ❤️ using Next.js, TypeScript, and Tailwind CSS
