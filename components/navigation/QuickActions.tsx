'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command'
import {
  Plus,
  Upload,
  Phone,
  Truck,
  Building2,
  FileText,
  Search,
  Command,
  Package,
  Users,
  DollarSign,
  BarChart3,
  Settings,
  Zap,
  AlertCircle,
  Inbox
} from 'lucide-react'

interface QuickAction {
  id: string
  title: string
  description?: string
  icon: React.ReactNode
  action: () => void
  category: 'create' | 'extract' | 'navigate' | 'search'
  shortcut?: string
}

export function QuickActions() {
  const [open, setOpen] = useState(false)
  const [commandOpen, setCommandOpen] = useState(false)
  const router = useRouter()

  const quickActions: QuickAction[] = [
    // Create actions
    {
      id: 'new-extraction',
      title: 'New Extraction',
      description: 'Upload and extract a call',
      icon: <Zap className="h-4 w-4" />,
      action: () => router.push('/extraction/new'),
      category: 'create',
      shortcut: '⌘E'
    },
    {
      id: 'new-load',
      title: 'New Load',
      description: 'Create a new load manually',
      icon: <Package className="h-4 w-4" />,
      action: () => router.push('/loads/new'),
      category: 'create',
      shortcut: '⌘L'
    },
    {
      id: 'new-carrier',
      title: 'Add Carrier',
      description: 'Add a new carrier to database',
      icon: <Truck className="h-4 w-4" />,
      action: () => router.push('/carriers/new'),
      category: 'create'
    },
    {
      id: 'new-shipper',
      title: 'Add Shipper',
      description: 'Add a new shipper',
      icon: <Building2 className="h-4 w-4" />,
      action: () => router.push('/shippers/new'),
      category: 'create'
    },
    // Extract actions
    {
      id: 'extract-shipper',
      title: 'Extract Shipper Call',
      description: 'Upload a shipper call',
      icon: <Users className="h-4 w-4" />,
      action: () => router.push('/extraction/new?type=shipper'),
      category: 'extract'
    },
    {
      id: 'extract-carrier',
      title: 'Extract Carrier Call',
      description: 'Upload a carrier call',
      icon: <Truck className="h-4 w-4" />,
      action: () => router.push('/extraction/new?type=carrier'),
      category: 'extract'
    },
    {
      id: 'extract-check',
      title: 'Extract Check Call',
      description: 'Upload a check call',
      icon: <Phone className="h-4 w-4" />,
      action: () => router.push('/extraction/new?type=check'),
      category: 'extract'
    },
    // Navigate actions
    {
      id: 'view-needs-carrier',
      title: 'Loads Needing Carriers',
      description: 'View loads that need coverage',
      icon: <AlertCircle className="h-4 w-4" />,
      action: () => router.push('/loads?status=needs_carrier'),
      category: 'navigate'
    },
    {
      id: 'view-in-transit',
      title: 'In Transit Loads',
      description: 'Track loads on the road',
      icon: <Truck className="h-4 w-4" />,
      action: () => router.push('/loads?status=in_transit'),
      category: 'navigate'
    },
    {
      id: 'view-extraction-inbox',
      title: 'Extraction Inbox',
      description: 'Review pending extractions',
      icon: <Inbox className="h-4 w-4" />,
      action: () => router.push('/extraction-inbox'),
      category: 'navigate'
    },
    {
      id: 'view-reports',
      title: 'Reports',
      description: 'View analytics and reports',
      icon: <BarChart3 className="h-4 w-4" />,
      action: () => router.push('/reports'),
      category: 'navigate'
    },
  ]

  // Keyboard shortcut handler
  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setCommandOpen((open) => !open)
      }
      if (e.key === 'e' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        router.push('/extraction/new')
      }
      if (e.key === 'l' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        router.push('/loads/new')
      }
    }

    document.addEventListener('keydown', down)
    return () => document.removeEventListener('keydown', down)
  }, [router])

  return (
    <>
      {/* Quick Actions Dropdown */}
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <Plus className="h-4 w-4" />
            Quick Actions
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56" align="end">
          <DropdownMenuLabel>Create New</DropdownMenuLabel>
          <DropdownMenuItem onClick={() => router.push('/extraction/new')}>
            <Zap className="mr-2 h-4 w-4" />
            <span>New Extraction</span>
            <span className="ml-auto text-xs text-muted-foreground">⌘E</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => router.push('/loads/new')}>
            <Package className="mr-2 h-4 w-4" />
            <span>New Load</span>
            <span className="ml-auto text-xs text-muted-foreground">⌘L</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => router.push('/carriers/new')}>
            <Truck className="mr-2 h-4 w-4" />
            <span>Add Carrier</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => router.push('/shippers/new')}>
            <Building2 className="mr-2 h-4 w-4" />
            <span>Add Shipper</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuLabel>Quick Nav</DropdownMenuLabel>
          <DropdownMenuItem onClick={() => router.push('/loads?status=needs_carrier')}>
            <AlertCircle className="mr-2 h-4 w-4 text-red-500" />
            <span>Needs Carrier</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => router.push('/loads?status=in_transit')}>
            <Truck className="mr-2 h-4 w-4 text-yellow-500" />
            <span>In Transit</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => router.push('/extraction-inbox')}>
            <Inbox className="mr-2 h-4 w-4 text-blue-500" />
            <span>Extraction Inbox</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setCommandOpen(true)}>
            <Command className="mr-2 h-4 w-4" />
            <span>Command Palette</span>
            <span className="ml-auto text-xs text-muted-foreground">⌘K</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Command Palette */}
      <CommandDialog open={commandOpen} onOpenChange={setCommandOpen}>
        <CommandInput placeholder="Type a command or search..." />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>

          <CommandGroup heading="Create">
            {quickActions.filter(a => a.category === 'create').map(action => (
              <CommandItem
                key={action.id}
                onSelect={() => {
                  action.action()
                  setCommandOpen(false)
                }}
              >
                {action.icon}
                <span className="ml-2">{action.title}</span>
                {action.shortcut && (
                  <span className="ml-auto text-xs text-muted-foreground">
                    {action.shortcut}
                  </span>
                )}
              </CommandItem>
            ))}
          </CommandGroup>

          <CommandSeparator />

          <CommandGroup heading="Extract">
            {quickActions.filter(a => a.category === 'extract').map(action => (
              <CommandItem
                key={action.id}
                onSelect={() => {
                  action.action()
                  setCommandOpen(false)
                }}
              >
                {action.icon}
                <span className="ml-2">{action.title}</span>
              </CommandItem>
            ))}
          </CommandGroup>

          <CommandSeparator />

          <CommandGroup heading="Navigate">
            {quickActions.filter(a => a.category === 'navigate').map(action => (
              <CommandItem
                key={action.id}
                onSelect={() => {
                  action.action()
                  setCommandOpen(false)
                }}
              >
                {action.icon}
                <span className="ml-2">{action.title}</span>
              </CommandItem>
            ))}
          </CommandGroup>

          <CommandSeparator />

          <CommandGroup heading="Settings">
            <CommandItem
              onSelect={() => {
                router.push('/settings')
                setCommandOpen(false)
              }}
            >
              <Settings className="h-4 w-4" />
              <span className="ml-2">Settings</span>
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  )
}

// Floating Quick Action Button (FAB style)
export function QuickActionFAB() {
  const router = useRouter()
  const [open, setOpen] = useState(false)

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            size="lg"
            className="h-14 w-14 rounded-full shadow-lg bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="h-6 w-6" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56" align="end" side="top">
          <DropdownMenuItem onClick={() => router.push('/extraction/new')}>
            <Zap className="mr-2 h-4 w-4" />
            <span>Extract Call</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => router.push('/loads/new')}>
            <Package className="mr-2 h-4 w-4" />
            <span>New Load</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => router.push('/calls/new')}>
            <Phone className="mr-2 h-4 w-4" />
            <span>Upload Call</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => router.push('/loads?status=needs_carrier')}>
            <AlertCircle className="mr-2 h-4 w-4 text-red-500" />
            <span>Find Carriers</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}