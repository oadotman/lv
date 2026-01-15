'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/components/ui/use-toast';
import {
  Sparkles,
  Search,
  Loader2,
  MessageCircle,
  TrendingUp,
  DollarSign,
  Phone,
  Star,
  Truck,
  Calendar,
  ChevronRight,
  HelpCircle,
  X,
  Send
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';

interface SearchResult {
  answer: string;
  data?: any[];
  suggestions?: string[];
  links?: Array<{ label: string; url: string }>;
  queryType: string;
  parsedQuery?: any;
}

interface NaturalLanguageSearchProps {
  embedded?: boolean;
  onResultClick?: (url: string) => void;
}

export function NaturalLanguageSearch({ embedded = false, onResultClick }: NaturalLanguageSearchProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [result, setResult] = useState<SearchResult | null>(null);
  const [showExamples, setShowExamples] = useState(false);
  const [recentQueries, setRecentQueries] = useState<string[]>([]);

  // Load recent queries from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('nl_recent_queries');
    if (stored) {
      setRecentQueries(JSON.parse(stored).slice(0, 5));
    }
  }, []);

  // Save query to recent
  const saveToRecent = (q: string) => {
    const updated = [q, ...recentQueries.filter(r => r !== q)].slice(0, 5);
    setRecentQueries(updated);
    localStorage.setItem('nl_recent_queries', JSON.stringify(updated));
  };

  const handleSearch = async () => {
    if (!query.trim()) {
      toast({
        title: 'Empty Query',
        description: 'Please enter a question or search term',
        variant: 'destructive',
      });
      return;
    }

    setSearching(true);
    setResult(null);
    saveToRecent(query);

    try {
      const response = await fetch('/api/carriers/nl-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      });

      const data = await response.json();

      if (response.ok) {
        setResult(data);

        // Auto-navigate to first link if it's a specific carrier query
        if (data.links?.length === 1 && data.queryType === 'info' && !embedded) {
          setTimeout(() => {
            router.push(data.links[0].url);
          }, 1000);
        }
      } else {
        throw new Error(data.error || 'Search failed');
      }
    } catch (error) {
      console.error('Error performing NL search:', error);
      toast({
        title: 'Search Failed',
        description: 'Failed to process your query. Please try again.',
        variant: 'destructive',
      });
      setResult({
        answer: "Sorry, I couldn't process your query. Please try rephrasing or use one of the example queries.",
        queryType: 'error'
      });
    } finally {
      setSearching(false);
    }
  };

  const handleExampleClick = (example: string) => {
    setQuery(example);
    setShowExamples(false);
    setTimeout(() => handleSearch(), 100);
  };

  const handleLinkClick = (url: string) => {
    if (onResultClick) {
      onResultClick(url);
    } else {
      router.push(url);
    }
  };

  const formatDataForDisplay = (data: any[], queryType: string) => {
    if (!data || data.length === 0) return null;

    switch (queryType) {
      case 'carriers':
        return (
          <div className="grid gap-2 mt-4">
            {data.slice(0, 5).map((carrier, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-3 bg-muted/50 rounded-lg hover:bg-muted cursor-pointer transition-colors"
                onClick={() => handleLinkClick(`/carriers/${carrier.id}`)}
              >
                <div className="flex items-center gap-3">
                  <Truck className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="font-medium">{carrier.carrier_name}</p>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      {carrier.mc_number && <span>MC# {carrier.mc_number}</span>}
                      {carrier.dispatch_phone && (
                        <>
                          <span>•</span>
                          <Phone className="h-3 w-3" />
                          <span>{carrier.dispatch_phone}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {carrier.internal_rating && (
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                      <span className="text-sm">{carrier.internal_rating}</span>
                    </div>
                  )}
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>
            ))}
          </div>
        );

      case 'rates':
        return (
          <div className="mt-4 p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="h-4 w-4 text-green-600" />
              <span className="font-medium">Rate Details</span>
            </div>
            {data.map((item, idx) => (
              <div key={idx} className="text-sm space-y-1">
                {item.origin_city && item.destination_city && (
                  <p>{item.origin_city} → {item.destination_city}</p>
                )}
                {item.carrier_name && <p>Carrier: {item.carrier_name}</p>}
                {item.rate && <p className="font-semibold">Rate: ${item.rate.toLocaleString()}</p>}
                {item.created_at && (
                  <p className="text-muted-foreground">
                    {format(new Date(item.created_at), 'MMM d, yyyy')}
                  </p>
                )}
              </div>
            ))}
          </div>
        );

      case 'history':
        return (
          <div className="grid gap-2 mt-4">
            {data.slice(0, 5).map((item, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-3 bg-muted/50 rounded-lg hover:bg-muted cursor-pointer transition-colors"
                onClick={() => {
                  const url = item.id ?
                    (item.carrier_name ? `/carriers/${item.id}` : `/calls/${item.id}`) :
                    '#';
                  if (url !== '#') handleLinkClick(url);
                }}
              >
                <div className="flex items-center gap-3">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="font-medium">
                      {item.carrier_name || item.title || 'Record'}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {item.created_at && format(new Date(item.created_at), 'MMM d, yyyy h:mm a')}
                    </p>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </div>
            ))}
          </div>
        );

      default:
        return null;
    }
  };

  const exampleQueries = [
    "Find carriers for Atlanta to Miami",
    "What's my average rate for Chicago to Dallas?",
    "Show me carriers with dry van equipment",
    "Cheapest carrier for Houston to Phoenix?",
    "Who runs reefer equipment?",
    "Show me carriers I haven't used in 30 days",
    "When did I last talk to ABC Trucking?",
    "What loads did I book last week?",
    "Show calls from yesterday"
  ];

  return (
    <div className={`${embedded ? '' : 'space-y-4'}`}>
      {/* Search Input */}
      <div className="relative">
        <div className="relative flex items-center">
          <Sparkles className="absolute left-3 h-5 w-5 text-purple-500" />
          <Input
            ref={inputRef}
            placeholder="Ask anything about your carriers, loads, or calls..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSearch();
            }}
            className="pl-10 pr-24 h-12 text-base"
          />
          <div className="absolute right-1 flex items-center gap-1">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowExamples(!showExamples)}
              className="h-8 w-8 p-0"
            >
              <HelpCircle className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              onClick={handleSearch}
              disabled={searching || !query.trim()}
              className="h-8"
            >
              {searching ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        {/* Example Queries Dropdown */}
        {showExamples && (
          <Card className="absolute top-full left-0 right-0 mt-2 z-50">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">Example Queries</CardTitle>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowExamples(false)}
                  className="h-6 w-6 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-1">
              {exampleQueries.map((example, idx) => (
                <button
                  key={idx}
                  onClick={() => handleExampleClick(example)}
                  className="w-full text-left p-2 text-sm hover:bg-muted rounded-md transition-colors"
                >
                  {example}
                </button>
              ))}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Recent Queries */}
      {!result && recentQueries.length > 0 && !showExamples && (
        <div className="flex flex-wrap gap-2">
          <span className="text-sm text-muted-foreground">Recent:</span>
          {recentQueries.map((q, idx) => (
            <Badge
              key={idx}
              variant="secondary"
              className="cursor-pointer hover:bg-muted"
              onClick={() => {
                setQuery(q);
                handleSearch();
              }}
            >
              {q.length > 30 ? q.substring(0, 30) + '...' : q}
            </Badge>
          ))}
        </div>
      )}

      {/* Search Results */}
      {result && (
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5 text-purple-500" />
                <CardTitle className="text-base">Answer</CardTitle>
              </div>
              {result.queryType && result.queryType !== 'unknown' && result.queryType !== 'error' && (
                <Badge variant="outline">{result.queryType}</Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Main Answer */}
            <p className="whitespace-pre-line">{result.answer}</p>

            {/* Links */}
            {result.links && result.links.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {result.links.map((link, idx) => (
                  <Button
                    key={idx}
                    variant="outline"
                    size="sm"
                    onClick={() => handleLinkClick(link.url)}
                    className="gap-2"
                  >
                    {link.label}
                    <ChevronRight className="h-3 w-3" />
                  </Button>
                ))}
              </div>
            )}

            {/* Data Display */}
            {result.data && formatDataForDisplay(result.data, result.queryType)}

            {/* Suggestions */}
            {result.suggestions && result.suggestions.length > 0 && (
              <div className="border-t pt-4">
                <p className="text-sm text-muted-foreground mb-2">Try asking:</p>
                <div className="space-y-1">
                  {result.suggestions.map((suggestion, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setQuery(suggestion);
                        handleSearch();
                      }}
                      className="block w-full text-left p-2 text-sm hover:bg-muted rounded-md transition-colors"
                    >
                      • {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Debug Info (can be removed in production) */}
            {process.env.NODE_ENV === 'development' && result.parsedQuery && (
              <details className="text-xs text-muted-foreground">
                <summary className="cursor-pointer">Debug Info</summary>
                <pre className="mt-2 p-2 bg-muted rounded overflow-x-auto">
                  {JSON.stringify(result.parsedQuery, null, 2)}
                </pre>
              </details>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}