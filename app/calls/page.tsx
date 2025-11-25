"use client";

import { useState, useMemo, useEffect } from "react";
import { TopBar } from "@/components/layout/TopBar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatDate, formatDuration } from "@/lib/utils";
import {
  Search,
  Download,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  Filter,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Eye,
  Trash2,
  Check,
  X,
} from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/lib/AuthContext";
import { createClient } from "@/lib/supabase/client";

interface Call {
  id: string;
  customer_name: string | null;
  sales_rep: string | null;
  call_date: string;
  duration: number | null;
  sentiment_type: string | null;
  sentiment_score: number | null;
  status: string;
  created_at: string;
}

export default function CallsPage() {
  const { user } = useAuth();
  const [calls, setCalls] = useState<Call[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRep, setSelectedRep] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedCallIds, setSelectedCallIds] = useState<string[]>([]);
  const itemsPerPage = 10;

  // Fetch calls from database
  useEffect(() => {
    if (!user) return;

    async function fetchCalls() {
      if (!user) return; // Additional TypeScript safety check

      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from('calls')
          .select('*')
          .eq('user_id', user.id)
          .is('deleted_at', null)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error fetching calls:', error);
        } else {
          setCalls(data || []);
        }
        setLoading(false);
      } catch (error) {
        console.error('Fetch calls error:', error);
        setLoading(false);
      }
    }

    fetchCalls();
  }, [user]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(searchInput);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Filter calls
  const filteredCalls = useMemo(() => {
    return calls.filter((call) => {
      const matchesSearch =
        (call.customer_name?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
        (call.sales_rep?.toLowerCase() || '').includes(searchQuery.toLowerCase());

      const matchesRep = selectedRep === "all" || call.sales_rep === selectedRep;

      return matchesSearch && matchesRep;
    });
  }, [calls, searchQuery, selectedRep]);

  const totalPages = Math.ceil(filteredCalls.length / itemsPerPage);

  const paginatedCalls = useMemo(() => {
    return filteredCalls.slice(
      (currentPage - 1) * itemsPerPage,
      currentPage * itemsPerPage
    );
  }, [filteredCalls, currentPage]);

  const uniqueReps = useMemo(() => {
    return Array.from(new Set(calls.map((c) => c.sales_rep).filter(Boolean)));
  }, [calls]);

  // Selection handlers
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedCallIds(paginatedCalls.map((call) => call.id));
    } else {
      setSelectedCallIds([]);
    }
  };

  const handleSelectCall = (callId: string, checked: boolean) => {
    if (checked) {
      setSelectedCallIds((prev) => [...prev, callId]);
    } else {
      setSelectedCallIds((prev) => prev.filter((id) => id !== callId));
    }
  };

  const handleClearSelection = () => {
    setSelectedCallIds([]);
  };

  const isAllSelected =
    paginatedCalls.length > 0 && selectedCallIds.length === paginatedCalls.length;
  const isSomeSelected =
    selectedCallIds.length > 0 && selectedCallIds.length < paginatedCalls.length;

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30 dark:from-slate-950 dark:via-slate-900 dark:to-blue-950/30">
        <TopBar />
        <div className="flex items-center justify-center p-8 lg:p-16">
          <div className="text-center">
            <Loader2 className="w-12 h-12 animate-spin text-violet-600 dark:text-violet-400 mx-auto mb-4" />
            <p className="text-slate-600 dark:text-slate-400 font-medium">Loading calls...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30 dark:from-slate-950 dark:via-slate-900 dark:to-blue-950/30">
      <TopBar />

      <div className="p-4 lg:p-8 space-y-6 animate-in fade-in duration-200">
        {/* Header */}
        <div className="relative group">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 via-indigo-600/10 to-violet-600/10 rounded-3xl blur-lg opacity-60 group-hover:opacity-80 transition-opacity duration-300" />
          <div className="relative bg-white dark:bg-slate-900 rounded-2xl p-8 border border-slate-200 dark:border-slate-700 shadow-xl">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div>
                <h1 className="text-3xl lg:text-4xl font-bold bg-gradient-to-r from-slate-900 via-blue-900 to-slate-900 dark:from-slate-100 dark:via-blue-400 dark:to-slate-100 bg-clip-text text-transparent tracking-tight mb-2">
                  Processed Calls
                </h1>
                <p className="text-slate-600 dark:text-slate-400 font-medium">
                  {filteredCalls.length} call{filteredCalls.length !== 1 ? 's' : ''} total
                </p>
              </div>
              <Button className="bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white shadow-lg shadow-emerald-500/30 hover:shadow-xl hover:shadow-emerald-500/50 transition-all duration-300 rounded-xl border-0 font-semibold group/btn">
                <Download className="w-4 h-4 mr-2 group-hover/btn:scale-110 transition-transform" />
                Export All Data
              </Button>
            </div>
          </div>
        </div>

        {/* Filters */}
        <Card className="border-0 shadow-xl rounded-2xl overflow-hidden">
          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row gap-4">
              {/* Search */}
              <div className="flex-1 relative group">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-violet-600 transition-colors z-10" />
                <Input
                  placeholder="Search by customer, sales rep..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="pl-12 pr-4 py-3.5 bg-slate-50 border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-violet-500/20 focus:border-violet-500 focus:bg-white transition-all placeholder:text-slate-400 text-base font-medium shadow-sm hover:shadow-md focus:shadow-lg"
                />
              </div>

              {/* Sales Rep Filter */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full lg:w-auto px-6 py-3 border-2 border-slate-200 hover:border-violet-300 hover:bg-violet-50 rounded-xl font-medium transition-all duration-200"
                  >
                    <Filter className="w-4 h-4 mr-2" />
                    Sales Rep: {selectedRep === "all" ? "All" : selectedRep}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="rounded-xl">
                  <DropdownMenuItem
                    onClick={() => setSelectedRep("all")}
                    className="rounded-lg"
                  >
                    All Reps
                  </DropdownMenuItem>
                  {uniqueReps.map((rep) => (
                    <DropdownMenuItem
                      key={rep}
                      onClick={() => setSelectedRep(rep!)}
                      className="rounded-lg"
                    >
                      {rep}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </CardContent>
        </Card>

        {/* Bulk Actions */}
        {selectedCallIds.length > 0 && (
          <div className="bg-purple-50 border-2 border-purple-300 rounded-2xl p-4 shadow-lg animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center">
                  <Check className="w-5 h-5 text-white" />
                </div>
                <span className="text-sm font-semibold text-purple-900">
                  {selectedCallIds.length} call{selectedCallIds.length !== 1 ? 's' : ''} selected
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearSelection}
                  className="text-purple-600 hover:text-purple-700 hover:bg-purple-100 rounded-lg"
                >
                  <X className="w-4 h-4 mr-1" />
                  Clear
                </Button>
                <Button
                  size="sm"
                  className="bg-purple-600 hover:bg-purple-700 text-white rounded-lg"
                >
                  <Download className="w-4 h-4 mr-1" />
                  Export Selected
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-300 rounded-lg"
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  Delete Selected
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Calls Table */}
        <Card className="border-0 shadow-2xl rounded-2xl overflow-hidden">
          <CardContent className="p-0">
            {filteredCalls.length === 0 ? (
              <div className="text-center py-20 px-6">
                <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-violet-100 to-purple-100 flex items-center justify-center">
                  <Search className="w-12 h-12 text-violet-600" />
                </div>
                <h3 className="text-2xl font-bold mb-3 text-slate-900">
                  {searchQuery || selectedRep !== 'all' ? 'No calls found' : 'No calls yet'}
                </h3>
                <p className="text-slate-600 mb-8 max-w-md mx-auto text-lg">
                  {searchQuery || selectedRep !== 'all'
                    ? 'Try adjusting your search filters'
                    : 'Upload your first call recording to get started'}
                </p>
                {searchQuery || selectedRep !== 'all' ? (
                  <Button
                    onClick={() => {
                      setSearchInput('');
                      setSelectedRep('all');
                    }}
                    className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white shadow-xl rounded-xl px-8 py-3 text-base border-0"
                  >
                    Clear Filters
                  </Button>
                ) : null}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gradient-to-r from-slate-50 to-slate-100/50">
                    <tr className="text-left">
                      <th className="px-6 py-4 w-12">
                        <Checkbox
                          checked={isAllSelected || isSomeSelected}
                          onCheckedChange={handleSelectAll}
                          className="rounded border-slate-300"
                        />
                      </th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-700 uppercase tracking-wider">
                        Customer
                      </th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-700 uppercase tracking-wider">
                        Sales Rep
                      </th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-700 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-700 uppercase tracking-wider">
                        Duration
                      </th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-700 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-700 uppercase tracking-wider text-right">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {paginatedCalls.map((call, index) => (
                      <tr
                        key={call.id}
                        className="group hover:bg-gradient-to-r hover:from-violet-50/30 hover:to-transparent transition-all duration-200"
                        style={{ animationDelay: `${index * 30}ms` }}
                      >
                        <td className="px-6 py-5">
                          <Checkbox
                            checked={selectedCallIds.includes(call.id)}
                            onCheckedChange={(checked) =>
                              handleSelectCall(call.id, checked as boolean)
                            }
                            className="rounded border-slate-300"
                          />
                        </td>
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-100 to-purple-100 flex items-center justify-center flex-shrink-0">
                              <span className="text-sm font-bold text-violet-600">
                                {call.customer_name ? call.customer_name.charAt(0) : '?'}
                              </span>
                            </div>
                            <div>
                              <p className="font-semibold text-slate-900">
                                {call.customer_name || 'Unknown Customer'}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-5 text-sm font-medium text-slate-600">
                          {call.sales_rep || 'Unknown Rep'}
                        </td>
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-2 text-sm font-medium text-slate-600">
                            <Calendar className="w-4 h-4 text-slate-400" />
                            {formatDate(call.call_date || call.created_at)}
                          </div>
                        </td>
                        <td className="px-6 py-5 text-sm font-medium text-slate-600">
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-slate-400" />
                            {call.duration ? formatDuration(call.duration) : 'N/A'}
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          {call.status === "completed" && (
                            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-100 text-emerald-700 rounded-lg font-medium text-sm border border-emerald-200">
                              <CheckCircle2 className="w-4 h-4" />
                              Completed
                            </div>
                          )}
                          {(call.status === "processing" ||
                            call.status === "transcribing" ||
                            call.status === "extracting") && (
                            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-amber-100 text-amber-700 rounded-lg font-medium text-sm border border-amber-200">
                              <Loader2 className="w-4 h-4 animate-spin" />
                              Processing
                            </div>
                          )}
                          {call.status === "failed" && (
                            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-red-100 text-red-700 rounded-lg font-medium text-sm border border-red-200">
                              <AlertCircle className="w-4 h-4" />
                              Failed
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-5 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Link href={`/calls/${call.id}`}>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-violet-600 hover:text-violet-700 hover:bg-violet-50 rounded-lg font-medium transition-all duration-200"
                              >
                                <Eye className="w-4 h-4 mr-1.5" />
                                View
                              </Button>
                            </Link>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="hover:bg-slate-100 rounded-lg"
                                >
                                  <MoreVertical className="w-4 h-4 text-slate-400" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="rounded-xl">
                                <DropdownMenuItem className="rounded-lg">
                                  <Download className="w-4 h-4 mr-2" />
                                  Export
                                </DropdownMenuItem>
                                <DropdownMenuItem className="rounded-lg text-red-600">
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 bg-white rounded-2xl border border-slate-200 shadow-lg">
            <div className="text-sm text-slate-600 font-medium">
              Showing{" "}
              <span className="font-bold text-slate-900">
                {(currentPage - 1) * itemsPerPage + 1}
              </span>{" "}
              to{" "}
              <span className="font-bold text-slate-900">
                {Math.min(currentPage * itemsPerPage, filteredCalls.length)}
              </span>{" "}
              of{" "}
              <span className="font-bold text-slate-900">
                {filteredCalls.length}
              </span>{" "}
              calls
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="rounded-lg border-2"
              >
                <ChevronLeft className="w-4 h-4" />
                Previous
              </Button>
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }

                  return (
                    <Button
                      key={pageNum}
                      variant={currentPage === pageNum ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCurrentPage(pageNum)}
                      className={`w-10 h-10 rounded-lg border-2 ${
                        currentPage === pageNum
                          ? "bg-violet-600 text-white border-violet-600"
                          : ""
                      }`}
                    >
                      {pageNum}
                    </Button>
                  );
                })}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="rounded-lg border-2"
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
