"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { mockTemplates } from "@/lib/mockData";
import {
  FileText,
  Search,
  Plus,
  Edit2,
  Trash2,
  Eye,
  Copy,
  Clock,
  BarChart3,
  X,
  TrendingUp,
  Loader2,
  Save,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetClose,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Template, TemplateField } from "@/lib/types";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuth } from "@/lib/AuthContext";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/ui/use-toast";

// =====================================================
// INTERFACES
// =====================================================

interface TemplateStats {
  [templateId: string]: {
    usageCount: number;
    lastUsed: string | null;
  };
}

interface CustomTemplate {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  category: string;
  fields: TemplateField[];
  field_count: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export default function TemplatesPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"most-used" | "recent" | "alphabetical" | "newest">("most-used");
  const [filterCategory, setFilterCategory] = useState<"all" | "standard" | "custom">("all");
  const [templateStats, setTemplateStats] = useState<TemplateStats>({});
  const [customTemplates, setCustomTemplates] = useState<CustomTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Create/Edit Template Dialog
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<CustomTemplate | null>(null);
  const [templateForm, setTemplateForm] = useState({
    name: "",
    description: "",
    fields: [] as TemplateField[]
  });
  const [newField, setNewField] = useState({
    fieldName: "",
    fieldType: "text" as "text" | "number" | "date" | "picklist" | "textarea" | "email",
    description: "",
    picklistValues: [] as string[]
  });

  // =====================================================
  // FETCH TEMPLATES AND STATS
  // =====================================================

  useEffect(() => {
    if (!user) {
      setLoading(false); // Set loading to false if no user
      return;
    }

    let isMounted = true; // Add mounted flag

    async function fetchData() {
      if (!user || !isMounted) return; // Check both user and mounted state

      setLoading(true); // Ensure loading is set
      try {
        const supabase = createClient();

        // Fetch custom templates with their fields
        const { data: customData, error: customError } = await supabase
          .from('custom_templates')
          .select('*, template_fields(*)')
          .eq('user_id', user.id)
          .is('deleted_at', null)
          .order('created_at', { ascending: false });

        if (customError) {
          console.error('Error fetching custom templates:', customError);
        } else {
          // Transform fields to match frontend format
          const formattedTemplates = (customData || []).map(template => ({
            ...template,
            fields: template.template_fields?.map((f: any) => ({
              id: f.id,
              fieldName: f.field_name,
              fieldType: f.field_type,
              description: f.description,
              picklistValues: f.picklist_values,
              required: f.is_required
            })) || []
          }));
          setCustomTemplates(formattedTemplates);
        }

        // Fetch call stats for usage tracking
        const { data: callsData, error: callsError } = await supabase
          .from('calls')
          .select('id, created_at, template_id')
          .eq('user_id', user.id)
          .is('deleted_at', null)
          .order('created_at', { ascending: false });

        if (!callsError && callsData) {
          const stats: TemplateStats = {};

          // Calculate stats for standard templates (simulated)
          mockTemplates.forEach(template => {
            const callCount = callsData.length || 0;
            let usageCount = 0;
            if (template.category === 'standard') {
              usageCount = Math.floor(callCount * (template.usageCount || 0) / 100);
            }

            stats[template.id] = {
              usageCount: usageCount,
              lastUsed: callCount > 0 && callsData ? callsData[0].created_at : null
            };
          });

          // Calculate stats for custom templates
          customData?.forEach(template => {
            const templateCalls = callsData.filter(call => call.template_id === template.id);
            stats[template.id] = {
              usageCount: templateCalls.length,
              lastUsed: templateCalls.length > 0 ? templateCalls[0].created_at : null
            };
          });

          setTemplateStats(stats);
        }

        if (isMounted) {
          setLoading(false);
        }
      } catch (err) {
        console.error('Error fetching templates:', err);
        if (isMounted) {
          setLoading(false); // ALWAYS set loading to false in error case
        }
      }
    }

    fetchData();

    // Cleanup on unmount
    return () => {
      isMounted = false; // Mark as unmounted
    };
  }, [user]);

  // =====================================================
  // TEMPLATE CRUD OPERATIONS
  // =====================================================

  const handleCreateTemplate = async () => {
    if (!user || !templateForm.name.trim()) {
      toast({
        title: "Validation Error",
        description: "Template name is required",
        variant: "destructive"
      });
      return;
    }

    try {
      const supabase = createClient();

      // First, create the template without fields
      const { data: templateData, error: templateError } = await supabase
        .from('custom_templates')
        .insert({
          user_id: user.id,
          name: templateForm.name,
          description: templateForm.description,
          category: 'custom',
          field_count: templateForm.fields.length
        })
        .select()
        .single();

      if (templateError) throw templateError;

      // Then, insert fields separately if there are any
      if (templateForm.fields.length > 0) {
        const fieldsToInsert = templateForm.fields.map((field, index) => ({
          template_id: templateData.id,
          field_name: field.fieldName,
          field_type: field.fieldType,
          description: field.description || '',
          is_required: false, // Default to false since the interface doesn't have this property
          sort_order: index,
          picklist_values: field.picklistValues || null
        }));

        const { error: fieldsError } = await supabase
          .from('template_fields')
          .insert(fieldsToInsert);

        if (fieldsError) {
          // If fields insert fails, delete the template
          await supabase
            .from('custom_templates')
            .delete()
            .eq('id', templateData.id);
          throw fieldsError;
        }
      }

      // Fetch the complete template with fields
      const { data: completeTemplate, error: fetchError } = await supabase
        .from('custom_templates')
        .select('*, template_fields(*)')
        .eq('id', templateData.id)
        .single();

      if (fetchError) throw fetchError;

      // Transform fields to match frontend format
      const formattedTemplate = {
        ...completeTemplate,
        fields: completeTemplate.template_fields?.map((f: any) => ({
          id: f.id,
          fieldName: f.field_name,
          fieldType: f.field_type,
          description: f.description,
          picklistValues: f.picklist_values,
          required: f.is_required
        })) || []
      };

      setCustomTemplates(prev => [formattedTemplate, ...prev]);
      setIsCreateDialogOpen(false);
      setTemplateForm({ name: "", description: "", fields: [] });

      toast({
        title: "✓ Template Created",
        description: `${templateForm.name} has been created successfully.`
      });
    } catch (err: any) {
      console.error('Error creating template:', err);
      toast({
        title: "Error",
        description: err.message || "Failed to create template",
        variant: "destructive"
      });
    }
  };

  const handleUpdateTemplate = async () => {
    if (!editingTemplate || !templateForm.name.trim()) {
      toast({
        title: "Validation Error",
        description: "Template name is required",
        variant: "destructive"
      });
      return;
    }

    try {
      const supabase = createClient();

      // First, update the template metadata
      const { data: updatedTemplate, error: updateError } = await supabase
        .from('custom_templates')
        .update({
          name: templateForm.name,
          description: templateForm.description,
          field_count: templateForm.fields.length
        })
        .eq('id', editingTemplate.id)
        .select()
        .single();

      if (updateError) throw updateError;

      // Delete existing fields
      const { error: deleteError } = await supabase
        .from('template_fields')
        .delete()
        .eq('template_id', editingTemplate.id);

      if (deleteError) throw deleteError;

      // Insert new fields
      if (templateForm.fields.length > 0) {
        const fieldsToInsert = templateForm.fields.map((field, index) => ({
          template_id: editingTemplate.id,
          field_name: field.fieldName,
          field_type: field.fieldType,
          description: field.description || '',
          is_required: false, // Default to false since the interface doesn't have this property
          sort_order: index,
          picklist_values: field.picklistValues || null
        }));

        const { error: fieldsError } = await supabase
          .from('template_fields')
          .insert(fieldsToInsert);

        if (fieldsError) throw fieldsError;
      }

      // Fetch the complete updated template with fields
      const { data: completeTemplate, error: fetchError } = await supabase
        .from('custom_templates')
        .select('*, template_fields(*)')
        .eq('id', editingTemplate.id)
        .single();

      if (fetchError) throw fetchError;

      // Transform fields to match frontend format
      const formattedTemplate = {
        ...completeTemplate,
        fields: completeTemplate.template_fields?.map((f: any) => ({
          id: f.id,
          fieldName: f.field_name,
          fieldType: f.field_type,
          description: f.description,
          picklistValues: f.picklist_values,
          required: f.is_required
        })) || []
      };

      setCustomTemplates(prev =>
        prev.map(t => t.id === formattedTemplate.id ? formattedTemplate : t)
      );
      setIsEditDialogOpen(false);
      setEditingTemplate(null);
      setTemplateForm({ name: "", description: "", fields: [] });

      toast({
        title: "✓ Template Updated",
        description: `${templateForm.name} has been updated successfully.`
      });
    } catch (err: any) {
      console.error('Error updating template:', err);
      toast({
        title: "Error",
        description: err.message || "Failed to update template",
        variant: "destructive"
      });
    }
  };

  const handleDeleteTemplate = async (templateId: string) => {
    if (!confirm("Are you sure you want to delete this template?")) return;

    try {
      if (!user) {
        toast({
          title: "Error",
          description: "You must be logged in to delete templates",
          variant: "destructive"
        });
        return;
      }

      const supabase = createClient();

      const { error } = await supabase
        .from('custom_templates')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', templateId)
        .eq('user_id', user.id);  // Explicitly filter by user_id

      if (error) throw error;

      setCustomTemplates(prev => prev.filter(t => t.id !== templateId));
      setSelectedTemplate(null);

      toast({
        title: "✓ Template Deleted",
        description: "Template has been deleted successfully."
      });
    } catch (err: any) {
      console.error('Error deleting template:', err);
      toast({
        title: "Error",
        description: err.message || "Failed to delete template",
        variant: "destructive"
      });
    }
  };

  const handleDuplicateTemplate = async (template: Template | CustomTemplate) => {
    setTemplateForm({
      name: `${template.name} (Copy)`,
      description: 'description' in template ? template.description || "" : "",
      fields: template.fields
    });
    setIsCreateDialogOpen(true);
  };

  // =====================================================
  // FIELD MANAGEMENT
  // =====================================================

  const handleAddField = () => {
    if (!newField.fieldName.trim()) {
      toast({
        title: "Validation Error",
        description: "Field name is required",
        variant: "destructive"
      });
      return;
    }

    const field: TemplateField = {
      id: `field_${Date.now()}`,
      fieldName: newField.fieldName,
      fieldType: newField.fieldType,
      description: newField.description,
      picklistValues: newField.fieldType === 'picklist' ? newField.picklistValues : undefined
    };

    setTemplateForm(prev => ({
      ...prev,
      fields: [...prev.fields, field]
    }));

    setNewField({
      fieldName: "",
      fieldType: "text",
      description: "",
      picklistValues: []
    });
  };

  const handleRemoveField = (fieldId: string) => {
    setTemplateForm(prev => ({
      ...prev,
      fields: prev.fields.filter(f => f.id !== fieldId)
    }));
  };

  // =====================================================
  // MERGE TEMPLATES WITH STATS
  // =====================================================

  const allTemplates = useMemo(() => {
    const standardWithStats = mockTemplates.map(template => {
      const stats = templateStats[template.id];
      return {
        ...template,
        usageCount: stats?.usageCount || 0,
        lastModified: stats?.lastUsed || template.lastModified
      };
    });

    const customWithStats = customTemplates.map(template => {
      const stats = templateStats[template.id];
      return {
        ...template,
        usageCount: stats?.usageCount || 0,
        lastModified: stats?.lastUsed || template.updated_at
      };
    });

    return [...standardWithStats, ...customWithStats];
  }, [mockTemplates, customTemplates, templateStats]);

  // =====================================================
  // FILTER AND SORT TEMPLATES
  // =====================================================

  const filteredTemplates = useMemo(() => {
    let result = allTemplates.filter((template) =>
      template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.fields.some(field =>
        field.fieldName.toLowerCase().includes(searchQuery.toLowerCase())
      )
    );

    // Apply category filter
    if (filterCategory !== "all") {
      result = result.filter(t => t.category === filterCategory);
    }

    // Apply sorting
    switch (sortBy) {
      case "most-used":
        result.sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0));
        break;
      case "recent":
        result.sort((a, b) =>
          new Date(b.lastModified || "").getTime() - new Date(a.lastModified || "").getTime()
        );
        break;
      case "alphabetical":
        result.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case "newest":
        result.sort((a, b) =>
          new Date(b.lastModified || "").getTime() - new Date(a.lastModified || "").getTime()
        );
        break;
    }

    return result;
  }, [allTemplates, searchQuery, sortBy, filterCategory]);

  // Group templates by category
  const standardTemplates = useMemo(() =>
    filteredTemplates.filter((t) => t.category === "standard"),
    [filteredTemplates]
  );

  const customTemplatesList = useMemo(() =>
    filteredTemplates.filter((t) => t.category === "custom"),
    [filteredTemplates]
  );

  // =====================================================
  // KEYBOARD SHORTCUTS
  // =====================================================

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // "/" to focus search
      if (e.key === "/" && !selectedTemplate && !isCreateDialogOpen && !isEditDialogOpen) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      // Escape to clear search or close modal
      if (e.key === "Escape") {
        if (selectedTemplate) {
          setSelectedTemplate(null);
        } else if (searchQuery) {
          setSearchQuery("");
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedTemplate, searchQuery, isCreateDialogOpen, isEditDialogOpen]);

  // Template icons config
  const getTemplateIcon = (templateName: string) => {
    if (templateName.includes("Salesforce")) {
      return { bg: "bg-blue-100", iconColor: "text-blue-600", icon: <FileText className="w-6 h-6" /> };
    } else if (templateName.includes("HubSpot")) {
      return { bg: "bg-orange-100", iconColor: "text-orange-600", icon: <FileText className="w-6 h-6" /> };
    } else if (templateName.includes("Pipedrive")) {
      return { bg: "bg-green-100", iconColor: "text-green-600", icon: <FileText className="w-6 h-6" /> };
    } else {
      return { bg: "bg-purple-100", iconColor: "text-purple-600", icon: <FileText className="w-6 h-6" /> };
    }
  };

  // =====================================================
  // TEMPLATE CARD COMPONENT
  // =====================================================

  const TemplateCard = ({ template }: { template: any }) => {
    const iconConfig = getTemplateIcon(template.name);
    const hasUsageTrend = template.usageCount && template.usageCount > 5;
    const isCustom = template.category === 'custom';

    return (
      <div
        onClick={() => setSelectedTemplate(template)}
        className="group relative bg-white border border-gray-200 rounded-xl p-6 cursor-pointer transition-all duration-300 hover:shadow-lg hover:-translate-y-1 shadow-sm"
      >
        {/* Icon */}
        <div className="flex justify-center mb-4">
          <div className={cn(
            "w-16 h-16 rounded-full flex items-center justify-center",
            iconConfig.bg
          )}>
            <div className={iconConfig.iconColor}>
              {iconConfig.icon}
            </div>
          </div>
        </div>

        {/* Template Name */}
        <h3 className="text-lg font-semibold text-gray-900 text-center mb-2 line-clamp-1">
          {template.name}
        </h3>

        {/* Stats Line */}
        <div className="flex items-center justify-center gap-2 text-sm text-gray-500 mb-4">
          <span>{template.field_count || template.fieldCount} fields</span>
          <span>•</span>
          {template.usageCount && template.usageCount > 0 ? (
            <span className="flex items-center gap-1">
              {template.usageCount} calls
              {hasUsageTrend && <TrendingUp className="w-3 h-3 text-green-500" />}
            </span>
          ) : (
            <span>Not used yet</span>
          )}
        </div>

        {/* Hover Action Buttons */}
        <div className="absolute bottom-6 left-0 right-0 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedTemplate(template);
                  }}
                  className="p-2 bg-white rounded-lg shadow-md hover:bg-gray-50 transition-colors"
                >
                  <Eye className="w-4 h-4 text-gray-600" />
                </button>
              </TooltipTrigger>
              <TooltipContent>Preview template</TooltipContent>
            </Tooltip>

            {isCustom && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingTemplate(template);
                      setTemplateForm({
                        name: template.name,
                        description: template.description || "",
                        fields: template.fields
                      });
                      setIsEditDialogOpen(true);
                    }}
                    className="p-2 bg-white rounded-lg shadow-md hover:bg-gray-50 transition-colors"
                  >
                    <Edit2 className="w-4 h-4 text-gray-600" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>Edit template</TooltipContent>
              </Tooltip>
            )}

            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDuplicateTemplate(template);
                  }}
                  className="p-2 bg-white rounded-lg shadow-md hover:bg-gray-50 transition-colors"
                >
                  <Copy className="w-4 h-4 text-gray-600" />
                </button>
              </TooltipTrigger>
              <TooltipContent>Duplicate template</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
    );
  };

  // =====================================================
  // EMPTY STATE CARD COMPONENT
  // =====================================================

  const EmptyStateCard = () => {
    return (
      <div
        onClick={() => setIsCreateDialogOpen(true)}
        className="group bg-gray-50 border-2 border-dashed border-gray-300 rounded-xl p-6 cursor-pointer transition-all duration-300 hover:bg-purple-50 hover:border-purple-400 flex flex-col items-center justify-center min-h-[240px]"
      >
        <div className="w-12 h-12 flex items-center justify-center mb-4 text-purple-600 group-hover:scale-110 transition-transform duration-300">
          <Plus className="w-12 h-12" />
        </div>
        <h3 className="font-semibold text-gray-900 mb-2">Create Custom Template</h3>
        <p className="text-sm text-gray-500 text-center max-w-xs">
          Map to your exact CRM fields in 5 minutes
        </p>
      </div>
    );
  };

  // =====================================================
  // LOADING STATE
  // =====================================================

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30">
        <div className="flex items-center justify-center p-8 lg:p-16">
          <div className="text-center">
            <Loader2 className="w-12 h-12 animate-spin text-violet-600 mx-auto mb-4" />
            <p className="text-slate-600 font-medium">Loading templates...</p>
          </div>
        </div>
      </div>
    );
  }

  // =====================================================
  // MAIN RENDER
  // =====================================================

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30">
      <div className="px-8 py-6">
        {/* Header Section */}
        <div className="mb-10">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Templates</h1>
          <p className="text-base text-gray-600 mb-6">
            Manage your CRM field mappings and output formats
          </p>

          {/* Search and Create Button Row */}
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            {/* Search Input */}
            <div className="relative w-full sm:max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                ref={searchInputRef}
                placeholder="Search templates..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 border-gray-300 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              />
            </div>

            {/* Sort Dropdown and Create Button */}
            <div className="flex gap-3 w-full sm:w-auto">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="flex-1 sm:flex-initial">
                    Sort by: {sortBy === "most-used" ? "Most Used" : sortBy === "recent" ? "Recently Modified" : sortBy === "alphabetical" ? "Alphabetical" : "Newest First"}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setSortBy("most-used")}>
                    Most Used
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSortBy("recent")}>
                    Recently Modified
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSortBy("alphabetical")}>
                    Alphabetical
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSortBy("newest")}>
                    Newest First
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Button
                onClick={() => setIsCreateDialogOpen(true)}
                className="bg-purple-600 hover:bg-purple-700 text-white flex-1 sm:flex-initial"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Custom Template
              </Button>
            </div>
          </div>

          {/* Filter Chips */}
          <div className="flex gap-2 mt-4">
            <button
              onClick={() => setFilterCategory("all")}
              className={cn(
                "px-4 py-1.5 rounded-full text-sm font-medium transition-colors",
                filterCategory === "all"
                  ? "bg-purple-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              )}
            >
              All
            </button>
            <button
              onClick={() => setFilterCategory("standard")}
              className={cn(
                "px-4 py-1.5 rounded-full text-sm font-medium transition-colors",
                filterCategory === "standard"
                  ? "bg-purple-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              )}
            >
              Standard CRMs
            </button>
            <button
              onClick={() => setFilterCategory("custom")}
              className={cn(
                "px-4 py-1.5 rounded-full text-sm font-medium transition-colors",
                filterCategory === "custom"
                  ? "bg-purple-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              )}
            >
              Custom
            </button>
          </div>
        </div>

        {/* Search Results Count */}
        {searchQuery && (
          <p className="text-sm text-gray-600 mb-4">
            Showing {filteredTemplates.length} of {allTemplates.length} templates
          </p>
        )}

        {/* No Results State */}
        {filteredTemplates.length === 0 && searchQuery && (
          <div className="text-center py-12">
            <p className="text-gray-600 mb-2">No templates found.</p>
            <p className="text-sm text-gray-500">Try different keywords or create a custom template.</p>
          </div>
        )}

        {/* Section 1: STANDARD CRM TEMPLATES */}
        {(filterCategory === "all" || filterCategory === "standard") && standardTemplates.length > 0 && (
          <div className="mb-16">
            <div className="flex items-center gap-3 mb-6">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
                STANDARD CRM TEMPLATES
              </h2>
              <div className="flex-1 border-b border-gray-200" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {standardTemplates.map((template) => (
                <TemplateCard key={template.id} template={template} />
              ))}
            </div>
          </div>
        )}

        {/* Section 2: YOUR CUSTOM TEMPLATES */}
        {(filterCategory === "all" || filterCategory === "custom") && (
          <div>
            <div className="flex items-center gap-3 mb-6">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
                YOUR CUSTOM TEMPLATES
              </h2>
              <div className="flex-1 border-b border-gray-200" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Empty State Card */}
              <EmptyStateCard />

              {/* Custom Templates */}
              {customTemplatesList.map((template) => (
                <TemplateCard key={template.id} template={template} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ===================================================== */}
      {/* CREATE TEMPLATE DIALOG */}
      {/* ===================================================== */}

      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Custom Template</DialogTitle>
            <DialogDescription>
              Define custom CRM fields to extract from your calls
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Template Name */}
            <div>
              <Label htmlFor="template-name">Template Name *</Label>
              <Input
                id="template-name"
                placeholder="e.g., Custom CRM Template"
                value={templateForm.name}
                onChange={(e) => setTemplateForm(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>

            {/* Template Description */}
            <div>
              <Label htmlFor="template-description">Description</Label>
              <Textarea
                id="template-description"
                placeholder="Brief description of this template"
                value={templateForm.description}
                onChange={(e) => setTemplateForm(prev => ({ ...prev, description: e.target.value }))}
              />
            </div>

            {/* Fields List */}
            <div>
              <Label>Fields ({templateForm.fields.length})</Label>
              <div className="space-y-2 mt-2">
                {templateForm.fields.map((field, index) => (
                  <div key={field.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-sm">{field.fieldName}</p>
                      <p className="text-xs text-gray-500">{field.fieldType} • {field.description}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveField(field.id)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            {/* Add New Field */}
            <div className="border-t pt-4">
              <Label className="mb-2 block">Add Field</Label>
              <div className="grid grid-cols-2 gap-3">
                <Input
                  placeholder="Field Name"
                  value={newField.fieldName}
                  onChange={(e) => setNewField(prev => ({ ...prev, fieldName: e.target.value }))}
                />
                <Select
                  value={newField.fieldType}
                  onValueChange={(value: any) => setNewField(prev => ({ ...prev, fieldType: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="text">Text</SelectItem>
                    <SelectItem value="number">Number</SelectItem>
                    <SelectItem value="date">Date</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="textarea">Long Text</SelectItem>
                    <SelectItem value="picklist">Picklist</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Textarea
                placeholder="Field Description"
                className="mt-2"
                value={newField.description}
                onChange={(e) => setNewField(prev => ({ ...prev, description: e.target.value }))}
              />
              <Button
                onClick={handleAddField}
                variant="outline"
                className="mt-2 w-full"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Field
              </Button>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateTemplate} className="bg-purple-600 hover:bg-purple-700">
              <Save className="w-4 h-4 mr-2" />
              Create Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===================================================== */}
      {/* EDIT TEMPLATE DIALOG */}
      {/* ===================================================== */}

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Template</DialogTitle>
            <DialogDescription>
              Update your custom CRM field mapping
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Template Name */}
            <div>
              <Label htmlFor="edit-template-name">Template Name *</Label>
              <Input
                id="edit-template-name"
                placeholder="e.g., Custom CRM Template"
                value={templateForm.name}
                onChange={(e) => setTemplateForm(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>

            {/* Template Description */}
            <div>
              <Label htmlFor="edit-template-description">Description</Label>
              <Textarea
                id="edit-template-description"
                placeholder="Brief description of this template"
                value={templateForm.description}
                onChange={(e) => setTemplateForm(prev => ({ ...prev, description: e.target.value }))}
              />
            </div>

            {/* Fields List */}
            <div>
              <Label>Fields ({templateForm.fields.length})</Label>
              <div className="space-y-2 mt-2">
                {templateForm.fields.map((field, index) => (
                  <div key={field.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-sm">{field.fieldName}</p>
                      <p className="text-xs text-gray-500">{field.fieldType} • {field.description}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveField(field.id)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            {/* Add New Field */}
            <div className="border-t pt-4">
              <Label className="mb-2 block">Add Field</Label>
              <div className="grid grid-cols-2 gap-3">
                <Input
                  placeholder="Field Name"
                  value={newField.fieldName}
                  onChange={(e) => setNewField(prev => ({ ...prev, fieldName: e.target.value }))}
                />
                <Select
                  value={newField.fieldType}
                  onValueChange={(value: any) => setNewField(prev => ({ ...prev, fieldType: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="text">Text</SelectItem>
                    <SelectItem value="number">Number</SelectItem>
                    <SelectItem value="date">Date</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="textarea">Long Text</SelectItem>
                    <SelectItem value="picklist">Picklist</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Textarea
                placeholder="Field Description"
                className="mt-2"
                value={newField.description}
                onChange={(e) => setNewField(prev => ({ ...prev, description: e.target.value }))}
              />
              <Button
                onClick={handleAddField}
                variant="outline"
                className="mt-2 w-full"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Field
              </Button>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateTemplate} className="bg-purple-600 hover:bg-purple-700">
              <Save className="w-4 h-4 mr-2" />
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===================================================== */}
      {/* TEMPLATE DETAIL SHEET */}
      {/* ===================================================== */}

      <Sheet open={!!selectedTemplate} onOpenChange={(open) => !open && setSelectedTemplate(null)}>
        <SheetContent className="w-full sm:w-[600px] flex flex-col p-0">
          {selectedTemplate && (
            <>
              <SheetHeader className="px-6 py-5 border-b border-gray-200">
                <SheetTitle className="text-2xl font-bold text-gray-900">
                  {selectedTemplate.name}
                </SheetTitle>
              </SheetHeader>
              {/* Stats and Actions */}
              <div className="px-6 py-3 border-b border-gray-200">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 text-sm text-gray-600">
                      <span className="flex items-center gap-1">
                        <FileText className="w-4 h-4" />
                        {selectedTemplate.fieldCount || selectedTemplate.fields?.length || 0} fields
                      </span>
                      <span>•</span>
                      {selectedTemplate.usageCount && selectedTemplate.usageCount > 0 ? (
                        <>
                          <span className="flex items-center gap-1">
                            <BarChart3 className="w-4 h-4" />
                            Used in {selectedTemplate.usageCount} calls
                          </span>
                          <span>•</span>
                        </>
                      ) : (
                        <>
                          <span className="text-gray-500">Not used yet</span>
                          <span>•</span>
                        </>
                      )}
                      {selectedTemplate.lastModified && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          Updated {new Date(selectedTemplate.lastModified).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                      )}
                    </div>
                  </div>
                  <SheetClose className="rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-secondary">
                    <X className="h-5 w-5" />
                    <span className="sr-only">Close</span>
                  </SheetClose>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">
                    <Eye className="w-4 h-4 mr-2" />
                    Preview Output
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDuplicateTemplate(selectedTemplate)}
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    Duplicate
                  </Button>
                  {selectedTemplate.category === 'custom' && (
                    <Button
                      size="sm"
                      className="bg-purple-600 hover:bg-purple-700 text-white"
                      onClick={() => {
                        setEditingTemplate(selectedTemplate as unknown as CustomTemplate);
                        setTemplateForm({
                          name: selectedTemplate.name,
                          description: (selectedTemplate as any).description || "",
                          fields: selectedTemplate.fields
                        });
                        setSelectedTemplate(null);
                        setIsEditDialogOpen(true);
                      }}
                    >
                      <Edit2 className="w-4 h-4 mr-2" />
                      Edit
                    </Button>
                  )}
                </div>
              </div>

              {/* Fields List - Scrollable */}
              <div className="flex-1 overflow-y-auto px-6 py-4">
                <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-3">
                  Template Fields
                </h3>
                <div className="space-y-2">
                  {selectedTemplate.fields.map((field, index) => (
                    <div
                      key={field.id}
                      className={cn(
                        "group p-4 rounded-lg transition-colors",
                        index % 2 === 0 ? "bg-gray-50" : "bg-white"
                      )}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-semibold text-gray-900">{field.fieldName}</h4>
                            <Badge variant="outline" className="text-xs">
                              {field.fieldType}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600">{field.description}</p>
                          {field.picklistValues && (
                            <div className="mt-2 flex flex-wrap gap-1">
                              {field.picklistValues.map((value) => (
                                <span
                                  key={value}
                                  className="text-xs px-2 py-0.5 bg-gray-200 text-gray-700 rounded"
                                >
                                  {value}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Footer - Fixed */}
              {selectedTemplate.category === 'custom' && (
                <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between bg-white">
                  <Button
                    variant="ghost"
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    onClick={() => {
                      handleDeleteTemplate(selectedTemplate.id);
                    }}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete Template
                  </Button>
                  <Button
                    className="bg-purple-600 hover:bg-purple-700 text-white"
                    onClick={() => {
                      setEditingTemplate(selectedTemplate as unknown as CustomTemplate);
                      setTemplateForm({
                        name: selectedTemplate.name,
                        description: (selectedTemplate as any).description || "",
                        fields: selectedTemplate.fields
                      });
                      setSelectedTemplate(null);
                      setIsEditDialogOpen(true);
                    }}
                  >
                    <Edit2 className="w-4 h-4 mr-2" />
                    Edit Template
                  </Button>
                </div>
              )}
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
