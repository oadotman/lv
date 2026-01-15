public schema.md
[
  {
    "table_name": "agent_cache",
    "column_name": "id",
    "data_type": "uuid",
    "is_nullable": "NO"
  },
  {
    "table_name": "agent_cache",
    "column_name": "cache_key",
    "data_type": "text",
    "is_nullable": "NO"
  },
  {
    "table_name": "agent_cache",
    "column_name": "agent_name",
    "data_type": "text",
    "is_nullable": "NO"
  },
  {
    "table_name": "agent_cache",
    "column_name": "organization_id",
    "data_type": "uuid",
    "is_nullable": "YES"
  },
  {
    "table_name": "agent_cache",
    "column_name": "cached_result",
    "data_type": "jsonb",
    "is_nullable": "NO"
  },
  {
    "table_name": "agent_cache",
    "column_name": "input_hash",
    "data_type": "text",
    "is_nullable": "NO"
  },
  {
    "table_name": "agent_cache",
    "column_name": "hit_count",
    "data_type": "integer",
    "is_nullable": "YES"
  },
  {
    "table_name": "agent_cache",
    "column_name": "last_accessed",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "agent_cache",
    "column_name": "expires_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "NO"
  },
  {
    "table_name": "agent_cache",
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "agent_configurations",
    "column_name": "id",
    "data_type": "uuid",
    "is_nullable": "NO"
  },
  {
    "table_name": "agent_configurations",
    "column_name": "organization_id",
    "data_type": "uuid",
    "is_nullable": "YES"
  },
  {
    "table_name": "agent_configurations",
    "column_name": "agent_name",
    "data_type": "text",
    "is_nullable": "NO"
  },
  {
    "table_name": "agent_configurations",
    "column_name": "config_data",
    "data_type": "jsonb",
    "is_nullable": "NO"
  },
  {
    "table_name": "agent_configurations",
    "column_name": "prompt_template",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "agent_configurations",
    "column_name": "model_settings",
    "data_type": "jsonb",
    "is_nullable": "YES"
  },
  {
    "table_name": "agent_configurations",
    "column_name": "version",
    "data_type": "integer",
    "is_nullable": "YES"
  },
  {
    "table_name": "agent_configurations",
    "column_name": "is_active",
    "data_type": "boolean",
    "is_nullable": "YES"
  },
  {
    "table_name": "agent_configurations",
    "column_name": "max_retries",
    "data_type": "integer",
    "is_nullable": "YES"
  },
  {
    "table_name": "agent_configurations",
    "column_name": "timeout_ms",
    "data_type": "integer",
    "is_nullable": "YES"
  },
  {
    "table_name": "agent_configurations",
    "column_name": "cache_ttl_seconds",
    "data_type": "integer",
    "is_nullable": "YES"
  },
  {
    "table_name": "agent_configurations",
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "agent_configurations",
    "column_name": "updated_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "agent_configurations",
    "column_name": "created_by",
    "data_type": "uuid",
    "is_nullable": "YES"
  },
  {
    "table_name": "agent_dependencies",
    "column_name": "id",
    "data_type": "uuid",
    "is_nullable": "NO"
  },
  {
    "table_name": "agent_dependencies",
    "column_name": "agent_name",
    "data_type": "text",
    "is_nullable": "NO"
  },
  {
    "table_name": "agent_dependencies",
    "column_name": "depends_on_agent",
    "data_type": "text",
    "is_nullable": "NO"
  },
  {
    "table_name": "agent_dependencies",
    "column_name": "dependency_type",
    "data_type": "text",
    "is_nullable": "NO"
  },
  {
    "table_name": "agent_dependencies",
    "column_name": "execution_order",
    "data_type": "integer",
    "is_nullable": "YES"
  },
  {
    "table_name": "agent_dependencies",
    "column_name": "can_run_parallel",
    "data_type": "boolean",
    "is_nullable": "YES"
  },
  {
    "table_name": "agent_dependencies",
    "column_name": "timeout_ms",
    "data_type": "integer",
    "is_nullable": "YES"
  },
  {
    "table_name": "agent_dependencies",
    "column_name": "fail_on_dependency_error",
    "data_type": "boolean",
    "is_nullable": "YES"
  },
  {
    "table_name": "agent_dependencies",
    "column_name": "fallback_strategy",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "agent_dependencies",
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "agent_dependencies",
    "column_name": "updated_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "agent_error_logs",
    "column_name": "id",
    "data_type": "uuid",
    "is_nullable": "NO"
  },
  {
    "table_name": "agent_error_logs",
    "column_name": "call_id",
    "data_type": "uuid",
    "is_nullable": "YES"
  },
  {
    "table_name": "agent_error_logs",
    "column_name": "organization_id",
    "data_type": "uuid",
    "is_nullable": "NO"
  },
  {
    "table_name": "agent_error_logs",
    "column_name": "agent_name",
    "data_type": "text",
    "is_nullable": "NO"
  },
  {
    "table_name": "agent_error_logs",
    "column_name": "agent_version",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "agent_error_logs",
    "column_name": "execution_id",
    "data_type": "uuid",
    "is_nullable": "YES"
  },
  {
    "table_name": "agent_error_logs",
    "column_name": "error_type",
    "data_type": "text",
    "is_nullable": "NO"
  },
  {
    "table_name": "agent_error_logs",
    "column_name": "error_message",
    "data_type": "text",
    "is_nullable": "NO"
  },
  {
    "table_name": "agent_error_logs",
    "column_name": "error_code",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "agent_error_logs",
    "column_name": "stack_trace",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "agent_error_logs",
    "column_name": "input_data",
    "data_type": "jsonb",
    "is_nullable": "YES"
  },
  {
    "table_name": "agent_error_logs",
    "column_name": "partial_output",
    "data_type": "jsonb",
    "is_nullable": "YES"
  },
  {
    "table_name": "agent_error_logs",
    "column_name": "retry_attempt",
    "data_type": "integer",
    "is_nullable": "YES"
  },
  {
    "table_name": "agent_error_logs",
    "column_name": "recovery_attempted",
    "data_type": "boolean",
    "is_nullable": "YES"
  },
  {
    "table_name": "agent_error_logs",
    "column_name": "recovery_successful",
    "data_type": "boolean",
    "is_nullable": "YES"
  },
  {
    "table_name": "agent_error_logs",
    "column_name": "recovery_method",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "agent_error_logs",
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "agent_execution_logs",
    "column_name": "id",
    "data_type": "uuid",
    "is_nullable": "NO"
  },
  {
    "table_name": "agent_execution_logs",
    "column_name": "call_id",
    "data_type": "uuid",
    "is_nullable": "NO"
  },
  {
    "table_name": "agent_execution_logs",
    "column_name": "organization_id",
    "data_type": "uuid",
    "is_nullable": "NO"
  },
  {
    "table_name": "agent_execution_logs",
    "column_name": "agent_name",
    "data_type": "text",
    "is_nullable": "NO"
  },
  {
    "table_name": "agent_execution_logs",
    "column_name": "agent_version",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "agent_execution_logs",
    "column_name": "execution_time_ms",
    "data_type": "integer",
    "is_nullable": "NO"
  },
  {
    "table_name": "agent_execution_logs",
    "column_name": "tokens_used",
    "data_type": "integer",
    "is_nullable": "YES"
  },
  {
    "table_name": "agent_execution_logs",
    "column_name": "success",
    "data_type": "boolean",
    "is_nullable": "NO"
  },
  {
    "table_name": "agent_execution_logs",
    "column_name": "error_message",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "agent_execution_logs",
    "column_name": "error_type",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "agent_execution_logs",
    "column_name": "retry_count",
    "data_type": "integer",
    "is_nullable": "YES"
  },
  {
    "table_name": "agent_execution_logs",
    "column_name": "input_hash",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "agent_execution_logs",
    "column_name": "output_hash",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "agent_execution_logs",
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "agent_feature_flags",
    "column_name": "id",
    "data_type": "uuid",
    "is_nullable": "NO"
  },
  {
    "table_name": "agent_feature_flags",
    "column_name": "organization_id",
    "data_type": "uuid",
    "is_nullable": "YES"
  },
  {
    "table_name": "agent_feature_flags",
    "column_name": "multi_agent_enabled",
    "data_type": "boolean",
    "is_nullable": "YES"
  },
  {
    "table_name": "agent_feature_flags",
    "column_name": "validation_agent_enabled",
    "data_type": "boolean",
    "is_nullable": "YES"
  },
  {
    "table_name": "agent_feature_flags",
    "column_name": "summary_agent_enabled",
    "data_type": "boolean",
    "is_nullable": "YES"
  },
  {
    "table_name": "agent_feature_flags",
    "column_name": "rollout_percentage",
    "data_type": "integer",
    "is_nullable": "YES"
  },
  {
    "table_name": "agent_feature_flags",
    "column_name": "comparison_mode",
    "data_type": "boolean",
    "is_nullable": "YES"
  },
  {
    "table_name": "agent_feature_flags",
    "column_name": "enabled_agents",
    "data_type": "ARRAY",
    "is_nullable": "YES"
  },
  {
    "table_name": "agent_feature_flags",
    "column_name": "disabled_agents",
    "data_type": "ARRAY",
    "is_nullable": "YES"
  },
  {
    "table_name": "agent_feature_flags",
    "column_name": "config_overrides",
    "data_type": "jsonb",
    "is_nullable": "YES"
  },
  {
    "table_name": "agent_feature_flags",
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "agent_feature_flags",
    "column_name": "updated_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "agent_outputs",
    "column_name": "id",
    "data_type": "uuid",
    "is_nullable": "NO"
  },
  {
    "table_name": "agent_outputs",
    "column_name": "call_id",
    "data_type": "uuid",
    "is_nullable": "NO"
  },
  {
    "table_name": "agent_outputs",
    "column_name": "organization_id",
    "data_type": "uuid",
    "is_nullable": "NO"
  },
  {
    "table_name": "agent_outputs",
    "column_name": "agent_name",
    "data_type": "text",
    "is_nullable": "NO"
  },
  {
    "table_name": "agent_outputs",
    "column_name": "agent_version",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "agent_outputs",
    "column_name": "execution_id",
    "data_type": "uuid",
    "is_nullable": "YES"
  },
  {
    "table_name": "agent_outputs",
    "column_name": "output_data",
    "data_type": "jsonb",
    "is_nullable": "NO"
  },
  {
    "table_name": "agent_outputs",
    "column_name": "output_type",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "agent_outputs",
    "column_name": "confidence",
    "data_type": "numeric",
    "is_nullable": "YES"
  },
  {
    "table_name": "agent_outputs",
    "column_name": "quality_score",
    "data_type": "numeric",
    "is_nullable": "YES"
  },
  {
    "table_name": "agent_outputs",
    "column_name": "completeness",
    "data_type": "numeric",
    "is_nullable": "YES"
  },
  {
    "table_name": "agent_outputs",
    "column_name": "validation_status",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "agent_outputs",
    "column_name": "validation_errors",
    "data_type": "jsonb",
    "is_nullable": "YES"
  },
  {
    "table_name": "agent_outputs",
    "column_name": "manual_review_required",
    "data_type": "boolean",
    "is_nullable": "YES"
  },
  {
    "table_name": "agent_outputs",
    "column_name": "has_corrections",
    "data_type": "boolean",
    "is_nullable": "YES"
  },
  {
    "table_name": "agent_outputs",
    "column_name": "correction_count",
    "data_type": "integer",
    "is_nullable": "YES"
  },
  {
    "table_name": "agent_outputs",
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "agent_outputs",
    "column_name": "updated_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "agent_performance_metrics",
    "column_name": "id",
    "data_type": "uuid",
    "is_nullable": "NO"
  },
  {
    "table_name": "agent_performance_metrics",
    "column_name": "organization_id",
    "data_type": "uuid",
    "is_nullable": "NO"
  },
  {
    "table_name": "agent_performance_metrics",
    "column_name": "metric_date",
    "data_type": "date",
    "is_nullable": "NO"
  },
  {
    "table_name": "agent_performance_metrics",
    "column_name": "metric_hour",
    "data_type": "integer",
    "is_nullable": "YES"
  },
  {
    "table_name": "agent_performance_metrics",
    "column_name": "agent_name",
    "data_type": "text",
    "is_nullable": "NO"
  },
  {
    "table_name": "agent_performance_metrics",
    "column_name": "total_executions",
    "data_type": "integer",
    "is_nullable": "YES"
  },
  {
    "table_name": "agent_performance_metrics",
    "column_name": "successful_executions",
    "data_type": "integer",
    "is_nullable": "YES"
  },
  {
    "table_name": "agent_performance_metrics",
    "column_name": "failed_executions",
    "data_type": "integer",
    "is_nullable": "YES"
  },
  {
    "table_name": "agent_performance_metrics",
    "column_name": "avg_execution_time_ms",
    "data_type": "integer",
    "is_nullable": "YES"
  },
  {
    "table_name": "agent_performance_metrics",
    "column_name": "min_execution_time_ms",
    "data_type": "integer",
    "is_nullable": "YES"
  },
  {
    "table_name": "agent_performance_metrics",
    "column_name": "max_execution_time_ms",
    "data_type": "integer",
    "is_nullable": "YES"
  },
  {
    "table_name": "agent_performance_metrics",
    "column_name": "p50_execution_time_ms",
    "data_type": "integer",
    "is_nullable": "YES"
  },
  {
    "table_name": "agent_performance_metrics",
    "column_name": "p95_execution_time_ms",
    "data_type": "integer",
    "is_nullable": "YES"
  },
  {
    "table_name": "agent_performance_metrics",
    "column_name": "p99_execution_time_ms",
    "data_type": "integer",
    "is_nullable": "YES"
  },
  {
    "table_name": "agent_performance_metrics",
    "column_name": "total_tokens_used",
    "data_type": "integer",
    "is_nullable": "YES"
  },
  {
    "table_name": "agent_performance_metrics",
    "column_name": "avg_tokens_per_execution",
    "data_type": "integer",
    "is_nullable": "YES"
  },
  {
    "table_name": "agent_performance_metrics",
    "column_name": "avg_confidence",
    "data_type": "numeric",
    "is_nullable": "YES"
  },
  {
    "table_name": "agent_performance_metrics",
    "column_name": "avg_quality_score",
    "data_type": "numeric",
    "is_nullable": "YES"
  },
  {
    "table_name": "agent_performance_metrics",
    "column_name": "avg_completeness",
    "data_type": "numeric",
    "is_nullable": "YES"
  },
  {
    "table_name": "agent_performance_metrics",
    "column_name": "timeout_count",
    "data_type": "integer",
    "is_nullable": "YES"
  },
  {
    "table_name": "agent_performance_metrics",
    "column_name": "api_error_count",
    "data_type": "integer",
    "is_nullable": "YES"
  },
  {
    "table_name": "agent_performance_metrics",
    "column_name": "validation_error_count",
    "data_type": "integer",
    "is_nullable": "YES"
  },
  {
    "table_name": "agent_performance_metrics",
    "column_name": "estimated_cost",
    "data_type": "numeric",
    "is_nullable": "YES"
  },
  {
    "table_name": "agent_performance_metrics",
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "agent_performance_metrics",
    "column_name": "updated_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "audit_logs",
    "column_name": "id",
    "data_type": "uuid",
    "is_nullable": "NO"
  },
  {
    "table_name": "audit_logs",
    "column_name": "user_id",
    "data_type": "uuid",
    "is_nullable": "YES"
  },
  {
    "table_name": "audit_logs",
    "column_name": "action",
    "data_type": "text",
    "is_nullable": "NO"
  },
  {
    "table_name": "audit_logs",
    "column_name": "resource_type",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "audit_logs",
    "column_name": "resource_id",
    "data_type": "uuid",
    "is_nullable": "YES"
  },
  {
    "table_name": "audit_logs",
    "column_name": "metadata",
    "data_type": "jsonb",
    "is_nullable": "YES"
  },
  {
    "table_name": "audit_logs",
    "column_name": "ip_address",
    "data_type": "inet",
    "is_nullable": "YES"
  },
  {
    "table_name": "audit_logs",
    "column_name": "user_agent",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "audit_logs",
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "call_edits",
    "column_name": "id",
    "data_type": "uuid",
    "is_nullable": "NO"
  },
  {
    "table_name": "call_edits",
    "column_name": "call_id",
    "data_type": "uuid",
    "is_nullable": "NO"
  },
  {
    "table_name": "call_edits",
    "column_name": "user_id",
    "data_type": "uuid",
    "is_nullable": "NO"
  },
  {
    "table_name": "call_edits",
    "column_name": "edit_type",
    "data_type": "text",
    "is_nullable": "NO"
  },
  {
    "table_name": "call_edits",
    "column_name": "field_name",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "call_edits",
    "column_name": "old_value",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "call_edits",
    "column_name": "new_value",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "call_edits",
    "column_name": "edit_reason",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "call_edits",
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "call_edits",
    "column_name": "updated_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "call_fields",
    "column_name": "id",
    "data_type": "uuid",
    "is_nullable": "NO"
  },
  {
    "table_name": "call_fields",
    "column_name": "call_id",
    "data_type": "uuid",
    "is_nullable": "NO"
  },
  {
    "table_name": "call_fields",
    "column_name": "template_id",
    "data_type": "uuid",
    "is_nullable": "YES"
  },
  {
    "table_name": "call_fields",
    "column_name": "field_name",
    "data_type": "text",
    "is_nullable": "NO"
  },
  {
    "table_name": "call_fields",
    "column_name": "field_value",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "call_fields",
    "column_name": "confidence_score",
    "data_type": "numeric",
    "is_nullable": "YES"
  },
  {
    "table_name": "call_fields",
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "call_fields",
    "column_name": "field_type",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "call_fields",
    "column_name": "source",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "call_insights",
    "column_name": "id",
    "data_type": "uuid",
    "is_nullable": "NO"
  },
  {
    "table_name": "call_insights",
    "column_name": "call_id",
    "data_type": "uuid",
    "is_nullable": "NO"
  },
  {
    "table_name": "call_insights",
    "column_name": "insight_type",
    "data_type": "text",
    "is_nullable": "NO"
  },
  {
    "table_name": "call_insights",
    "column_name": "insight_text",
    "data_type": "text",
    "is_nullable": "NO"
  },
  {
    "table_name": "call_insights",
    "column_name": "confidence_score",
    "data_type": "numeric",
    "is_nullable": "YES"
  },
  {
    "table_name": "call_insights",
    "column_name": "timestamp_in_call",
    "data_type": "numeric",
    "is_nullable": "YES"
  },
  {
    "table_name": "call_insights",
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "call_notes",
    "column_name": "id",
    "data_type": "uuid",
    "is_nullable": "NO"
  },
  {
    "table_name": "call_notes",
    "column_name": "call_id",
    "data_type": "uuid",
    "is_nullable": "NO"
  },
  {
    "table_name": "call_notes",
    "column_name": "user_id",
    "data_type": "uuid",
    "is_nullable": "NO"
  },
  {
    "table_name": "call_notes",
    "column_name": "note_text",
    "data_type": "text",
    "is_nullable": "NO"
  },
  {
    "table_name": "call_notes",
    "column_name": "note_type",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "call_notes",
    "column_name": "is_internal",
    "data_type": "boolean",
    "is_nullable": "YES"
  },
  {
    "table_name": "call_notes",
    "column_name": "is_pinned",
    "data_type": "boolean",
    "is_nullable": "YES"
  },
  {
    "table_name": "call_notes",
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "call_notes",
    "column_name": "updated_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "calls",
    "column_name": "id",
    "data_type": "uuid",
    "is_nullable": "NO"
  },
  {
    "table_name": "calls",
    "column_name": "user_id",
    "data_type": "uuid",
    "is_nullable": "NO"
  },
  {
    "table_name": "calls",
    "column_name": "organization_id",
    "data_type": "uuid",
    "is_nullable": "YES"
  },
  {
    "table_name": "calls",
    "column_name": "file_name",
    "data_type": "text",
    "is_nullable": "NO"
  },
  {
    "table_name": "calls",
    "column_name": "file_size",
    "data_type": "bigint",
    "is_nullable": "NO"
  },
  {
    "table_name": "calls",
    "column_name": "file_url",
    "data_type": "text",
    "is_nullable": "NO"
  },
  {
    "table_name": "calls",
    "column_name": "audio_url",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "calls",
    "column_name": "mime_type",
    "data_type": "text",
    "is_nullable": "NO"
  },
  {
    "table_name": "calls",
    "column_name": "customer_name",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "calls",
    "column_name": "customer_email",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "calls",
    "column_name": "customer_phone",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "calls",
    "column_name": "customer_company",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "calls",
    "column_name": "sales_rep",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "calls",
    "column_name": "call_date",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "calls",
    "column_name": "call_type",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "calls",
    "column_name": "duration",
    "data_type": "integer",
    "is_nullable": "YES"
  },
  {
    "table_name": "calls",
    "column_name": "sentiment_type",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "calls",
    "column_name": "sentiment_score",
    "data_type": "numeric",
    "is_nullable": "YES"
  },
  {
    "table_name": "calls",
    "column_name": "summary",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "calls",
    "column_name": "status",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "calls",
    "column_name": "uploaded_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "calls",
    "column_name": "processing_started_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "calls",
    "column_name": "processing_completed_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "calls",
    "column_name": "assemblyai_transcript_id",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "calls",
    "column_name": "assemblyai_error",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "calls",
    "column_name": "deleted_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "calls",
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "calls",
    "column_name": "updated_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "calls",
    "column_name": "metadata",
    "data_type": "jsonb",
    "is_nullable": "YES"
  },
  {
    "table_name": "calls",
    "column_name": "assemblyai_audio_url",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "calls",
    "column_name": "processed_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "calls",
    "column_name": "transcription_quality_score",
    "data_type": "integer",
    "is_nullable": "YES"
  },
  {
    "table_name": "calls",
    "column_name": "requires_review",
    "data_type": "boolean",
    "is_nullable": "YES"
  },
  {
    "table_name": "calls",
    "column_name": "review_trigger_reason",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "calls",
    "column_name": "approval_status",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "calls",
    "column_name": "auto_approved",
    "data_type": "boolean",
    "is_nullable": "YES"
  },
  {
    "table_name": "calls",
    "column_name": "reviewed_by",
    "data_type": "uuid",
    "is_nullable": "YES"
  },
  {
    "table_name": "calls",
    "column_name": "reviewed_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "calls",
    "column_name": "review_notes",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "calls",
    "column_name": "extraction_quality_score",
    "data_type": "numeric",
    "is_nullable": "YES"
  },
  {
    "table_name": "calls",
    "column_name": "low_confidence_fields_count",
    "data_type": "integer",
    "is_nullable": "YES"
  },
  {
    "table_name": "calls",
    "column_name": "processing_progress",
    "data_type": "integer",
    "is_nullable": "YES"
  },
  {
    "table_name": "calls",
    "column_name": "processing_message",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "calls",
    "column_name": "trim_start",
    "data_type": "numeric",
    "is_nullable": "YES"
  },
  {
    "table_name": "calls",
    "column_name": "trim_end",
    "data_type": "numeric",
    "is_nullable": "YES"
  },
  {
    "table_name": "calls",
    "column_name": "duration_minutes",
    "data_type": "integer",
    "is_nullable": "YES"
  },
  {
    "table_name": "calls",
    "column_name": "next_steps",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "calls",
    "column_name": "template_id",
    "data_type": "uuid",
    "is_nullable": "YES"
  },
  {
    "table_name": "calls",
    "column_name": "processing_attempts",
    "data_type": "integer",
    "is_nullable": "YES"
  },
  {
    "table_name": "calls",
    "column_name": "processing_error",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "calls",
    "column_name": "last_processing_attempt",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "calls",
    "column_name": "typed_notes",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "calls",
    "column_name": "visibility",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "calls",
    "column_name": "phone_number_id",
    "data_type": "uuid",
    "is_nullable": "YES"
  },
  {
    "table_name": "carrier_interactions",
    "column_name": "id",
    "data_type": "uuid",
    "is_nullable": "NO"
  },
  {
    "table_name": "carrier_interactions",
    "column_name": "organization_id",
    "data_type": "uuid",
    "is_nullable": "NO"
  },
  {
    "table_name": "carrier_interactions",
    "column_name": "carrier_id",
    "data_type": "uuid",
    "is_nullable": "NO"
  },
  {
    "table_name": "carrier_interactions",
    "column_name": "call_id",
    "data_type": "uuid",
    "is_nullable": "YES"
  },
  {
    "table_name": "carrier_interactions",
    "column_name": "interaction_type",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "carrier_interactions",
    "column_name": "interaction_date",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "carrier_interactions",
    "column_name": "user_id",
    "data_type": "uuid",
    "is_nullable": "NO"
  },
  {
    "table_name": "carrier_interactions",
    "column_name": "notes",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "carrier_interactions",
    "column_name": "rate_discussed",
    "data_type": "numeric",
    "is_nullable": "YES"
  },
  {
    "table_name": "carrier_interactions",
    "column_name": "lane_discussed",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "carrier_interactions",
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "carrier_verifications",
    "column_name": "id",
    "data_type": "uuid",
    "is_nullable": "NO"
  },
  {
    "table_name": "carrier_verifications",
    "column_name": "carrier_id",
    "data_type": "uuid",
    "is_nullable": "YES"
  },
  {
    "table_name": "carrier_verifications",
    "column_name": "mc_number",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "carrier_verifications",
    "column_name": "dot_number",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "carrier_verifications",
    "column_name": "legal_name",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "carrier_verifications",
    "column_name": "dba_name",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "carrier_verifications",
    "column_name": "physical_address",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "carrier_verifications",
    "column_name": "physical_city",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "carrier_verifications",
    "column_name": "physical_state",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "carrier_verifications",
    "column_name": "physical_zip",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "carrier_verifications",
    "column_name": "phone",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "carrier_verifications",
    "column_name": "email",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "carrier_verifications",
    "column_name": "operating_status",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "carrier_verifications",
    "column_name": "entity_type",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "carrier_verifications",
    "column_name": "operation_classification",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "carrier_verifications",
    "column_name": "cargo_carried",
    "data_type": "jsonb",
    "is_nullable": "YES"
  },
  {
    "table_name": "carrier_verifications",
    "column_name": "authority_date",
    "data_type": "date",
    "is_nullable": "YES"
  },
  {
    "table_name": "carrier_verifications",
    "column_name": "common_authority_date",
    "data_type": "date",
    "is_nullable": "YES"
  },
  {
    "table_name": "carrier_verifications",
    "column_name": "contract_authority_date",
    "data_type": "date",
    "is_nullable": "YES"
  },
  {
    "table_name": "carrier_verifications",
    "column_name": "broker_authority_date",
    "data_type": "date",
    "is_nullable": "YES"
  },
  {
    "table_name": "carrier_verifications",
    "column_name": "safety_rating",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "carrier_verifications",
    "column_name": "safety_rating_date",
    "data_type": "date",
    "is_nullable": "YES"
  },
  {
    "table_name": "carrier_verifications",
    "column_name": "safety_review_date",
    "data_type": "date",
    "is_nullable": "YES"
  },
  {
    "table_name": "carrier_verifications",
    "column_name": "out_of_service_date",
    "data_type": "date",
    "is_nullable": "YES"
  },
  {
    "table_name": "carrier_verifications",
    "column_name": "mcs150_date",
    "data_type": "date",
    "is_nullable": "YES"
  },
  {
    "table_name": "carrier_verifications",
    "column_name": "mcs150_mileage",
    "data_type": "integer",
    "is_nullable": "YES"
  },
  {
    "table_name": "carrier_verifications",
    "column_name": "bipd_insurance_on_file",
    "data_type": "boolean",
    "is_nullable": "YES"
  },
  {
    "table_name": "carrier_verifications",
    "column_name": "bipd_required",
    "data_type": "numeric",
    "is_nullable": "YES"
  },
  {
    "table_name": "carrier_verifications",
    "column_name": "bipd_on_file",
    "data_type": "numeric",
    "is_nullable": "YES"
  },
  {
    "table_name": "carrier_verifications",
    "column_name": "cargo_insurance_on_file",
    "data_type": "boolean",
    "is_nullable": "YES"
  },
  {
    "table_name": "carrier_verifications",
    "column_name": "cargo_required",
    "data_type": "numeric",
    "is_nullable": "YES"
  },
  {
    "table_name": "carrier_verifications",
    "column_name": "cargo_on_file",
    "data_type": "numeric",
    "is_nullable": "YES"
  },
  {
    "table_name": "carrier_verifications",
    "column_name": "bond_insurance_on_file",
    "data_type": "boolean",
    "is_nullable": "YES"
  },
  {
    "table_name": "carrier_verifications",
    "column_name": "bond_required",
    "data_type": "numeric",
    "is_nullable": "YES"
  },
  {
    "table_name": "carrier_verifications",
    "column_name": "bond_on_file",
    "data_type": "numeric",
    "is_nullable": "YES"
  },
  {
    "table_name": "carrier_verifications",
    "column_name": "vehicle_inspections",
    "data_type": "integer",
    "is_nullable": "YES"
  },
  {
    "table_name": "carrier_verifications",
    "column_name": "vehicle_oos",
    "data_type": "integer",
    "is_nullable": "YES"
  },
  {
    "table_name": "carrier_verifications",
    "column_name": "vehicle_oos_rate",
    "data_type": "numeric",
    "is_nullable": "YES"
  },
  {
    "table_name": "carrier_verifications",
    "column_name": "driver_inspections",
    "data_type": "integer",
    "is_nullable": "YES"
  },
  {
    "table_name": "carrier_verifications",
    "column_name": "driver_oos",
    "data_type": "integer",
    "is_nullable": "YES"
  },
  {
    "table_name": "carrier_verifications",
    "column_name": "driver_oos_rate",
    "data_type": "numeric",
    "is_nullable": "YES"
  },
  {
    "table_name": "carrier_verifications",
    "column_name": "hazmat_inspections",
    "data_type": "integer",
    "is_nullable": "YES"
  },
  {
    "table_name": "carrier_verifications",
    "column_name": "hazmat_oos",
    "data_type": "integer",
    "is_nullable": "YES"
  },
  {
    "table_name": "carrier_verifications",
    "column_name": "hazmat_oos_rate",
    "data_type": "numeric",
    "is_nullable": "YES"
  },
  {
    "table_name": "carrier_verifications",
    "column_name": "fatal_crashes",
    "data_type": "integer",
    "is_nullable": "YES"
  },
  {
    "table_name": "carrier_verifications",
    "column_name": "injury_crashes",
    "data_type": "integer",
    "is_nullable": "YES"
  },
  {
    "table_name": "carrier_verifications",
    "column_name": "tow_crashes",
    "data_type": "integer",
    "is_nullable": "YES"
  },
  {
    "table_name": "carrier_verifications",
    "column_name": "total_crashes",
    "data_type": "integer",
    "is_nullable": "YES"
  },
  {
    "table_name": "carrier_verifications",
    "column_name": "power_units",
    "data_type": "integer",
    "is_nullable": "YES"
  },
  {
    "table_name": "carrier_verifications",
    "column_name": "drivers",
    "data_type": "integer",
    "is_nullable": "YES"
  },
  {
    "table_name": "carrier_verifications",
    "column_name": "risk_level",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "carrier_verifications",
    "column_name": "risk_score",
    "data_type": "numeric",
    "is_nullable": "YES"
  },
  {
    "table_name": "carrier_verifications",
    "column_name": "warnings",
    "data_type": "jsonb",
    "is_nullable": "YES"
  },
  {
    "table_name": "carrier_verifications",
    "column_name": "verified_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "carrier_verifications",
    "column_name": "expires_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "carrier_verifications",
    "column_name": "verification_source",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "carrier_verifications",
    "column_name": "raw_response",
    "data_type": "jsonb",
    "is_nullable": "YES"
  },
  {
    "table_name": "carrier_verifications",
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "carrier_verifications",
    "column_name": "updated_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "carriers",
    "column_name": "id",
    "data_type": "uuid",
    "is_nullable": "NO"
  },
  {
    "table_name": "carriers",
    "column_name": "organization_id",
    "data_type": "uuid",
    "is_nullable": "NO"
  },
  {
    "table_name": "carriers",
    "column_name": "carrier_name",
    "data_type": "text",
    "is_nullable": "NO"
  },
  {
    "table_name": "carriers",
    "column_name": "mc_number",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "carriers",
    "column_name": "dot_number",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "carriers",
    "column_name": "dispatcher_name",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "carriers",
    "column_name": "dispatcher_phone",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "carriers",
    "column_name": "dispatcher_email",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "carriers",
    "column_name": "driver_name",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "carriers",
    "column_name": "driver_phone",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "carriers",
    "column_name": "address",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "carriers",
    "column_name": "city",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "carriers",
    "column_name": "state",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "carriers",
    "column_name": "zip",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "carriers",
    "column_name": "equipment_types",
    "data_type": "ARRAY",
    "is_nullable": "YES"
  },
  {
    "table_name": "carriers",
    "column_name": "preferred_lanes",
    "data_type": "jsonb",
    "is_nullable": "YES"
  },
  {
    "table_name": "carriers",
    "column_name": "rating",
    "data_type": "numeric",
    "is_nullable": "YES"
  },
  {
    "table_name": "carriers",
    "column_name": "on_time_percentage",
    "data_type": "numeric",
    "is_nullable": "YES"
  },
  {
    "table_name": "carriers",
    "column_name": "total_loads",
    "data_type": "integer",
    "is_nullable": "YES"
  },
  {
    "table_name": "carriers",
    "column_name": "completed_loads",
    "data_type": "integer",
    "is_nullable": "YES"
  },
  {
    "table_name": "carriers",
    "column_name": "cancelled_loads",
    "data_type": "integer",
    "is_nullable": "YES"
  },
  {
    "table_name": "carriers",
    "column_name": "average_rate",
    "data_type": "numeric",
    "is_nullable": "YES"
  },
  {
    "table_name": "carriers",
    "column_name": "last_rate",
    "data_type": "numeric",
    "is_nullable": "YES"
  },
  {
    "table_name": "carriers",
    "column_name": "total_revenue",
    "data_type": "numeric",
    "is_nullable": "YES"
  },
  {
    "table_name": "carriers",
    "column_name": "status",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "carriers",
    "column_name": "insurance_on_file",
    "data_type": "boolean",
    "is_nullable": "YES"
  },
  {
    "table_name": "carriers",
    "column_name": "w9_on_file",
    "data_type": "boolean",
    "is_nullable": "YES"
  },
  {
    "table_name": "carriers",
    "column_name": "authority_on_file",
    "data_type": "boolean",
    "is_nullable": "YES"
  },
  {
    "table_name": "carriers",
    "column_name": "notes",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "carriers",
    "column_name": "tags",
    "data_type": "ARRAY",
    "is_nullable": "YES"
  },
  {
    "table_name": "carriers",
    "column_name": "auto_created",
    "data_type": "boolean",
    "is_nullable": "YES"
  },
  {
    "table_name": "carriers",
    "column_name": "source_call_ids",
    "data_type": "ARRAY",
    "is_nullable": "YES"
  },
  {
    "table_name": "carriers",
    "column_name": "last_used_date",
    "data_type": "date",
    "is_nullable": "YES"
  },
  {
    "table_name": "carriers",
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "carriers",
    "column_name": "created_by",
    "data_type": "uuid",
    "is_nullable": "YES"
  },
  {
    "table_name": "carriers",
    "column_name": "updated_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "carriers",
    "column_name": "updated_by",
    "data_type": "uuid",
    "is_nullable": "YES"
  },
  {
    "table_name": "carriers",
    "column_name": "dba_name",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "carriers",
    "column_name": "factoring_company",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "carriers",
    "column_name": "payment_instructions",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "carriers",
    "column_name": "insurance_expiration",
    "data_type": "date",
    "is_nullable": "YES"
  },
  {
    "table_name": "carriers",
    "column_name": "insurance_amount",
    "data_type": "numeric",
    "is_nullable": "YES"
  },
  {
    "table_name": "carriers",
    "column_name": "cargo_insurance",
    "data_type": "numeric",
    "is_nullable": "YES"
  },
  {
    "table_name": "carriers",
    "column_name": "average_rate_per_mile",
    "data_type": "numeric",
    "is_nullable": "YES"
  },
  {
    "table_name": "carriers",
    "column_name": "internal_rating",
    "data_type": "integer",
    "is_nullable": "YES"
  },
  {
    "table_name": "carriers",
    "column_name": "last_contact_date",
    "data_type": "date",
    "is_nullable": "YES"
  },
  {
    "table_name": "carriers",
    "column_name": "last_contact_by",
    "data_type": "uuid",
    "is_nullable": "YES"
  },
  {
    "table_name": "carriers",
    "column_name": "last_verification_id",
    "data_type": "uuid",
    "is_nullable": "YES"
  },
  {
    "table_name": "carriers",
    "column_name": "last_verification_date",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "carriers",
    "column_name": "verification_status",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "carriers",
    "column_name": "verification_warnings",
    "data_type": "jsonb",
    "is_nullable": "YES"
  },
  {
    "table_name": "click_to_call_sessions",
    "column_name": "id",
    "data_type": "uuid",
    "is_nullable": "NO"
  },
  {
    "table_name": "click_to_call_sessions",
    "column_name": "user_id",
    "data_type": "uuid",
    "is_nullable": "NO"
  },
  {
    "table_name": "click_to_call_sessions",
    "column_name": "organization_id",
    "data_type": "uuid",
    "is_nullable": "YES"
  },
  {
    "table_name": "click_to_call_sessions",
    "column_name": "twilio_call_sid",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "click_to_call_sessions",
    "column_name": "from_number",
    "data_type": "text",
    "is_nullable": "NO"
  },
  {
    "table_name": "click_to_call_sessions",
    "column_name": "to_number",
    "data_type": "text",
    "is_nullable": "NO"
  },
  {
    "table_name": "click_to_call_sessions",
    "column_name": "contact_id",
    "data_type": "uuid",
    "is_nullable": "YES"
  },
  {
    "table_name": "click_to_call_sessions",
    "column_name": "contact_type",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "click_to_call_sessions",
    "column_name": "status",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "click_to_call_sessions",
    "column_name": "initiated_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "click_to_call_sessions",
    "column_name": "connected_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "click_to_call_sessions",
    "column_name": "ended_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "click_to_call_sessions",
    "column_name": "duration",
    "data_type": "integer",
    "is_nullable": "YES"
  },
  {
    "table_name": "click_to_call_sessions",
    "column_name": "notes",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "click_to_call_sessions",
    "column_name": "metadata",
    "data_type": "jsonb",
    "is_nullable": "YES"
  },
  {
    "table_name": "compliance_mode_changes",
    "column_name": "id",
    "data_type": "uuid",
    "is_nullable": "NO"
  },
  {
    "table_name": "compliance_mode_changes",
    "column_name": "organization_id",
    "data_type": "uuid",
    "is_nullable": "NO"
  },
  {
    "table_name": "compliance_mode_changes",
    "column_name": "user_id",
    "data_type": "uuid",
    "is_nullable": "NO"
  },
  {
    "table_name": "compliance_mode_changes",
    "column_name": "user_email",
    "data_type": "text",
    "is_nullable": "NO"
  },
  {
    "table_name": "compliance_mode_changes",
    "column_name": "previous_mode",
    "data_type": "text",
    "is_nullable": "NO"
  },
  {
    "table_name": "compliance_mode_changes",
    "column_name": "new_mode",
    "data_type": "text",
    "is_nullable": "NO"
  },
  {
    "table_name": "compliance_mode_changes",
    "column_name": "disclaimer_accepted",
    "data_type": "boolean",
    "is_nullable": "YES"
  },
  {
    "table_name": "compliance_mode_changes",
    "column_name": "ip_address",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "compliance_mode_changes",
    "column_name": "user_agent",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "compliance_mode_changes",
    "column_name": "timestamp",
    "data_type": "timestamp with time zone",
    "is_nullable": "NO"
  },
  {
    "table_name": "compliance_violations",
    "column_name": "id",
    "data_type": "uuid",
    "is_nullable": "NO"
  },
  {
    "table_name": "compliance_violations",
    "column_name": "organization_id",
    "data_type": "uuid",
    "is_nullable": "YES"
  },
  {
    "table_name": "compliance_violations",
    "column_name": "violation_type",
    "data_type": "text",
    "is_nullable": "NO"
  },
  {
    "table_name": "compliance_violations",
    "column_name": "severity",
    "data_type": "text",
    "is_nullable": "NO"
  },
  {
    "table_name": "compliance_violations",
    "column_name": "description",
    "data_type": "text",
    "is_nullable": "NO"
  },
  {
    "table_name": "compliance_violations",
    "column_name": "call_id",
    "data_type": "uuid",
    "is_nullable": "YES"
  },
  {
    "table_name": "compliance_violations",
    "column_name": "user_id",
    "data_type": "uuid",
    "is_nullable": "YES"
  },
  {
    "table_name": "compliance_violations",
    "column_name": "detected_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "NO"
  },
  {
    "table_name": "compliance_violations",
    "column_name": "detection_method",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "compliance_violations",
    "column_name": "resolved",
    "data_type": "boolean",
    "is_nullable": "YES"
  },
  {
    "table_name": "compliance_violations",
    "column_name": "resolved_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "compliance_violations",
    "column_name": "resolved_by",
    "data_type": "uuid",
    "is_nullable": "YES"
  },
  {
    "table_name": "compliance_violations",
    "column_name": "resolution_notes",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "compliance_violations",
    "column_name": "evidence",
    "data_type": "jsonb",
    "is_nullable": "YES"
  },
  {
    "table_name": "custom_templates",
    "column_name": "id",
    "data_type": "uuid",
    "is_nullable": "NO"
  },
  {
    "table_name": "custom_templates",
    "column_name": "user_id",
    "data_type": "uuid",
    "is_nullable": "NO"
  },
  {
    "table_name": "custom_templates",
    "column_name": "organization_id",
    "data_type": "uuid",
    "is_nullable": "YES"
  },
  {
    "table_name": "custom_templates",
    "column_name": "name",
    "data_type": "text",
    "is_nullable": "NO"
  },
  {
    "table_name": "custom_templates",
    "column_name": "description",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "custom_templates",
    "column_name": "category",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "custom_templates",
    "column_name": "field_count",
    "data_type": "integer",
    "is_nullable": "YES"
  },
  {
    "table_name": "custom_templates",
    "column_name": "is_active",
    "data_type": "boolean",
    "is_nullable": "YES"
  },
  {
    "table_name": "custom_templates",
    "column_name": "usage_count",
    "data_type": "integer",
    "is_nullable": "YES"
  },
  {
    "table_name": "custom_templates",
    "column_name": "last_used_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "custom_templates",
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "custom_templates",
    "column_name": "updated_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "custom_templates",
    "column_name": "deleted_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "email_queue",
    "column_name": "id",
    "data_type": "uuid",
    "is_nullable": "NO"
  },
  {
    "table_name": "email_queue",
    "column_name": "to_email",
    "data_type": "text",
    "is_nullable": "NO"
  },
  {
    "table_name": "email_queue",
    "column_name": "template",
    "data_type": "text",
    "is_nullable": "NO"
  },
  {
    "table_name": "email_queue",
    "column_name": "data",
    "data_type": "jsonb",
    "is_nullable": "YES"
  },
  {
    "table_name": "email_queue",
    "column_name": "status",
    "data_type": "text",
    "is_nullable": "NO"
  },
  {
    "table_name": "email_queue",
    "column_name": "attempts",
    "data_type": "integer",
    "is_nullable": "YES"
  },
  {
    "table_name": "email_queue",
    "column_name": "sent_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "email_queue",
    "column_name": "error",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "email_queue",
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "NO"
  },
  {
    "table_name": "extraction_comparisons",
    "column_name": "id",
    "data_type": "uuid",
    "is_nullable": "NO"
  },
  {
    "table_name": "extraction_comparisons",
    "column_name": "call_id",
    "data_type": "uuid",
    "is_nullable": "NO"
  },
  {
    "table_name": "extraction_comparisons",
    "column_name": "organization_id",
    "data_type": "uuid",
    "is_nullable": "NO"
  },
  {
    "table_name": "extraction_comparisons",
    "column_name": "legacy_output",
    "data_type": "jsonb",
    "is_nullable": "YES"
  },
  {
    "table_name": "extraction_comparisons",
    "column_name": "multi_agent_output",
    "data_type": "jsonb",
    "is_nullable": "YES"
  },
  {
    "table_name": "extraction_comparisons",
    "column_name": "legacy_execution_time_ms",
    "data_type": "integer",
    "is_nullable": "YES"
  },
  {
    "table_name": "extraction_comparisons",
    "column_name": "multi_agent_execution_time_ms",
    "data_type": "integer",
    "is_nullable": "YES"
  },
  {
    "table_name": "extraction_comparisons",
    "column_name": "legacy_token_usage",
    "data_type": "integer",
    "is_nullable": "YES"
  },
  {
    "table_name": "extraction_comparisons",
    "column_name": "multi_agent_token_usage",
    "data_type": "integer",
    "is_nullable": "YES"
  },
  {
    "table_name": "extraction_comparisons",
    "column_name": "legacy_quality_score",
    "data_type": "numeric",
    "is_nullable": "YES"
  },
  {
    "table_name": "extraction_comparisons",
    "column_name": "multi_agent_quality_score",
    "data_type": "numeric",
    "is_nullable": "YES"
  },
  {
    "table_name": "extraction_comparisons",
    "column_name": "legacy_completeness",
    "data_type": "numeric",
    "is_nullable": "YES"
  },
  {
    "table_name": "extraction_comparisons",
    "column_name": "multi_agent_completeness",
    "data_type": "numeric",
    "is_nullable": "YES"
  },
  {
    "table_name": "extraction_comparisons",
    "column_name": "reviewed",
    "data_type": "boolean",
    "is_nullable": "YES"
  },
  {
    "table_name": "extraction_comparisons",
    "column_name": "reviewed_by",
    "data_type": "uuid",
    "is_nullable": "YES"
  },
  {
    "table_name": "extraction_comparisons",
    "column_name": "reviewed_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "extraction_comparisons",
    "column_name": "preferred_version",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "extraction_comparisons",
    "column_name": "review_notes",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "extraction_comparisons",
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "extraction_inbox",
    "column_name": "id",
    "data_type": "uuid",
    "is_nullable": "NO"
  },
  {
    "table_name": "extraction_inbox",
    "column_name": "organization_id",
    "data_type": "uuid",
    "is_nullable": "NO"
  },
  {
    "table_name": "extraction_inbox",
    "column_name": "call_id",
    "data_type": "uuid",
    "is_nullable": "NO"
  },
  {
    "table_name": "extraction_inbox",
    "column_name": "status",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "extraction_inbox",
    "column_name": "priority",
    "data_type": "integer",
    "is_nullable": "YES"
  },
  {
    "table_name": "extraction_inbox",
    "column_name": "flagged_for_review",
    "data_type": "boolean",
    "is_nullable": "YES"
  },
  {
    "table_name": "extraction_inbox",
    "column_name": "review_reason",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "extraction_inbox",
    "column_name": "processed_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "extraction_inbox",
    "column_name": "processed_by",
    "data_type": "uuid",
    "is_nullable": "YES"
  },
  {
    "table_name": "extraction_inbox",
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "extraction_mappings",
    "column_name": "id",
    "data_type": "uuid",
    "is_nullable": "NO"
  },
  {
    "table_name": "extraction_mappings",
    "column_name": "organization_id",
    "data_type": "uuid",
    "is_nullable": "NO"
  },
  {
    "table_name": "extraction_mappings",
    "column_name": "call_id",
    "data_type": "uuid",
    "is_nullable": "NO"
  },
  {
    "table_name": "extraction_mappings",
    "column_name": "extraction_type",
    "data_type": "text",
    "is_nullable": "NO"
  },
  {
    "table_name": "extraction_mappings",
    "column_name": "load_id",
    "data_type": "uuid",
    "is_nullable": "YES"
  },
  {
    "table_name": "extraction_mappings",
    "column_name": "carrier_id",
    "data_type": "uuid",
    "is_nullable": "YES"
  },
  {
    "table_name": "extraction_mappings",
    "column_name": "shipper_id",
    "data_type": "uuid",
    "is_nullable": "YES"
  },
  {
    "table_name": "extraction_mappings",
    "column_name": "extracted_data",
    "data_type": "jsonb",
    "is_nullable": "NO"
  },
  {
    "table_name": "extraction_mappings",
    "column_name": "confidence_scores",
    "data_type": "jsonb",
    "is_nullable": "YES"
  },
  {
    "table_name": "extraction_mappings",
    "column_name": "status",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "extraction_mappings",
    "column_name": "saved_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "extraction_mappings",
    "column_name": "saved_by",
    "data_type": "uuid",
    "is_nullable": "YES"
  },
  {
    "table_name": "extraction_mappings",
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "extraction_summaries",
    "column_name": "id",
    "data_type": "uuid",
    "is_nullable": "NO"
  },
  {
    "table_name": "extraction_summaries",
    "column_name": "call_id",
    "data_type": "uuid",
    "is_nullable": "NO"
  },
  {
    "table_name": "extraction_summaries",
    "column_name": "organization_id",
    "data_type": "uuid",
    "is_nullable": "NO"
  },
  {
    "table_name": "extraction_summaries",
    "column_name": "executive_summary",
    "data_type": "text",
    "is_nullable": "NO"
  },
  {
    "table_name": "extraction_summaries",
    "column_name": "headline",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "extraction_summaries",
    "column_name": "call_summary",
    "data_type": "jsonb",
    "is_nullable": "YES"
  },
  {
    "table_name": "extraction_summaries",
    "column_name": "key_insights",
    "data_type": "jsonb",
    "is_nullable": "YES"
  },
  {
    "table_name": "extraction_summaries",
    "column_name": "action_items",
    "data_type": "jsonb",
    "is_nullable": "YES"
  },
  {
    "table_name": "extraction_summaries",
    "column_name": "next_steps",
    "data_type": "jsonb",
    "is_nullable": "YES"
  },
  {
    "table_name": "extraction_summaries",
    "column_name": "risks",
    "data_type": "jsonb",
    "is_nullable": "YES"
  },
  {
    "table_name": "extraction_summaries",
    "column_name": "opportunities",
    "data_type": "jsonb",
    "is_nullable": "YES"
  },
  {
    "table_name": "extraction_summaries",
    "column_name": "tone",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "extraction_summaries",
    "column_name": "negotiation_style",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "extraction_summaries",
    "column_name": "relationship_status",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "extraction_summaries",
    "column_name": "email_subject",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "extraction_summaries",
    "column_name": "sms_message",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "extraction_summaries",
    "column_name": "internal_note",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "extraction_summaries",
    "column_name": "extraction_completeness",
    "data_type": "numeric",
    "is_nullable": "YES"
  },
  {
    "table_name": "extraction_summaries",
    "column_name": "confidence_level",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "extraction_summaries",
    "column_name": "data_quality_score",
    "data_type": "numeric",
    "is_nullable": "YES"
  },
  {
    "table_name": "extraction_summaries",
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "lanes",
    "column_name": "id",
    "data_type": "uuid",
    "is_nullable": "NO"
  },
  {
    "table_name": "lanes",
    "column_name": "organization_id",
    "data_type": "uuid",
    "is_nullable": "NO"
  },
  {
    "table_name": "lanes",
    "column_name": "origin_city",
    "data_type": "text",
    "is_nullable": "NO"
  },
  {
    "table_name": "lanes",
    "column_name": "origin_state",
    "data_type": "text",
    "is_nullable": "NO"
  },
  {
    "table_name": "lanes",
    "column_name": "destination_city",
    "data_type": "text",
    "is_nullable": "NO"
  },
  {
    "table_name": "lanes",
    "column_name": "destination_state",
    "data_type": "text",
    "is_nullable": "NO"
  },
  {
    "table_name": "lanes",
    "column_name": "load_count",
    "data_type": "integer",
    "is_nullable": "YES"
  },
  {
    "table_name": "lanes",
    "column_name": "average_rate",
    "data_type": "numeric",
    "is_nullable": "YES"
  },
  {
    "table_name": "lanes",
    "column_name": "min_rate",
    "data_type": "numeric",
    "is_nullable": "YES"
  },
  {
    "table_name": "lanes",
    "column_name": "max_rate",
    "data_type": "numeric",
    "is_nullable": "YES"
  },
  {
    "table_name": "lanes",
    "column_name": "last_rate",
    "data_type": "numeric",
    "is_nullable": "YES"
  },
  {
    "table_name": "lanes",
    "column_name": "average_margin_percent",
    "data_type": "numeric",
    "is_nullable": "YES"
  },
  {
    "table_name": "lanes",
    "column_name": "best_carriers",
    "data_type": "ARRAY",
    "is_nullable": "YES"
  },
  {
    "table_name": "lanes",
    "column_name": "carrier_rates",
    "data_type": "jsonb",
    "is_nullable": "YES"
  },
  {
    "table_name": "lanes",
    "column_name": "seasonality_data",
    "data_type": "jsonb",
    "is_nullable": "YES"
  },
  {
    "table_name": "lanes",
    "column_name": "busiest_months",
    "data_type": "ARRAY",
    "is_nullable": "YES"
  },
  {
    "table_name": "lanes",
    "column_name": "distance_miles",
    "data_type": "integer",
    "is_nullable": "YES"
  },
  {
    "table_name": "lanes",
    "column_name": "last_load_date",
    "data_type": "date",
    "is_nullable": "YES"
  },
  {
    "table_name": "lanes",
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "lanes",
    "column_name": "updated_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "legal_disclaimer_acceptances",
    "column_name": "id",
    "data_type": "uuid",
    "is_nullable": "NO"
  },
  {
    "table_name": "legal_disclaimer_acceptances",
    "column_name": "organization_id",
    "data_type": "uuid",
    "is_nullable": "NO"
  },
  {
    "table_name": "legal_disclaimer_acceptances",
    "column_name": "user_id",
    "data_type": "uuid",
    "is_nullable": "NO"
  },
  {
    "table_name": "legal_disclaimer_acceptances",
    "column_name": "user_email",
    "data_type": "text",
    "is_nullable": "NO"
  },
  {
    "table_name": "legal_disclaimer_acceptances",
    "column_name": "disclaimer_type",
    "data_type": "text",
    "is_nullable": "NO"
  },
  {
    "table_name": "legal_disclaimer_acceptances",
    "column_name": "disclaimer_version",
    "data_type": "text",
    "is_nullable": "NO"
  },
  {
    "table_name": "legal_disclaimer_acceptances",
    "column_name": "disclaimer_text",
    "data_type": "text",
    "is_nullable": "NO"
  },
  {
    "table_name": "legal_disclaimer_acceptances",
    "column_name": "accepted_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "NO"
  },
  {
    "table_name": "legal_disclaimer_acceptances",
    "column_name": "ip_address",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "legal_disclaimer_acceptances",
    "column_name": "user_agent",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "legal_disclaimer_acceptances",
    "column_name": "metadata",
    "data_type": "jsonb",
    "is_nullable": "YES"
  },
  {
    "table_name": "load_status_history",
    "column_name": "id",
    "data_type": "uuid",
    "is_nullable": "NO"
  },
  {
    "table_name": "load_status_history",
    "column_name": "load_id",
    "data_type": "uuid",
    "is_nullable": "NO"
  },
  {
    "table_name": "load_status_history",
    "column_name": "old_status",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "load_status_history",
    "column_name": "new_status",
    "data_type": "text",
    "is_nullable": "NO"
  },
  {
    "table_name": "load_status_history",
    "column_name": "changed_by",
    "data_type": "uuid",
    "is_nullable": "YES"
  },
  {
    "table_name": "load_status_history",
    "column_name": "changed_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "load_status_history",
    "column_name": "notes",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "loads",
    "column_name": "id",
    "data_type": "uuid",
    "is_nullable": "NO"
  },
  {
    "table_name": "loads",
    "column_name": "organization_id",
    "data_type": "uuid",
    "is_nullable": "NO"
  },
  {
    "table_name": "loads",
    "column_name": "status",
    "data_type": "text",
    "is_nullable": "NO"
  },
  {
    "table_name": "loads",
    "column_name": "origin_city",
    "data_type": "text",
    "is_nullable": "NO"
  },
  {
    "table_name": "loads",
    "column_name": "origin_state",
    "data_type": "text",
    "is_nullable": "NO"
  },
  {
    "table_name": "loads",
    "column_name": "origin_zip",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "loads",
    "column_name": "origin_address",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "loads",
    "column_name": "destination_city",
    "data_type": "text",
    "is_nullable": "NO"
  },
  {
    "table_name": "loads",
    "column_name": "destination_state",
    "data_type": "text",
    "is_nullable": "NO"
  },
  {
    "table_name": "loads",
    "column_name": "destination_zip",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "loads",
    "column_name": "destination_address",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "loads",
    "column_name": "commodity",
    "data_type": "text",
    "is_nullable": "NO"
  },
  {
    "table_name": "loads",
    "column_name": "weight_lbs",
    "data_type": "integer",
    "is_nullable": "YES"
  },
  {
    "table_name": "loads",
    "column_name": "pallet_count",
    "data_type": "integer",
    "is_nullable": "YES"
  },
  {
    "table_name": "loads",
    "column_name": "equipment_type",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "loads",
    "column_name": "special_requirements",
    "data_type": "ARRAY",
    "is_nullable": "YES"
  },
  {
    "table_name": "loads",
    "column_name": "pickup_date",
    "data_type": "date",
    "is_nullable": "NO"
  },
  {
    "table_name": "loads",
    "column_name": "pickup_time",
    "data_type": "time without time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "loads",
    "column_name": "pickup_window_start",
    "data_type": "time without time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "loads",
    "column_name": "pickup_window_end",
    "data_type": "time without time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "loads",
    "column_name": "delivery_date",
    "data_type": "date",
    "is_nullable": "NO"
  },
  {
    "table_name": "loads",
    "column_name": "delivery_time",
    "data_type": "time without time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "loads",
    "column_name": "delivery_window_start",
    "data_type": "time without time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "loads",
    "column_name": "delivery_window_end",
    "data_type": "time without time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "loads",
    "column_name": "shipper_rate",
    "data_type": "numeric",
    "is_nullable": "YES"
  },
  {
    "table_name": "loads",
    "column_name": "carrier_rate",
    "data_type": "numeric",
    "is_nullable": "YES"
  },
  {
    "table_name": "loads",
    "column_name": "margin",
    "data_type": "numeric",
    "is_nullable": "YES"
  },
  {
    "table_name": "loads",
    "column_name": "margin_percent",
    "data_type": "numeric",
    "is_nullable": "YES"
  },
  {
    "table_name": "loads",
    "column_name": "shipper_id",
    "data_type": "uuid",
    "is_nullable": "YES"
  },
  {
    "table_name": "loads",
    "column_name": "carrier_id",
    "data_type": "uuid",
    "is_nullable": "YES"
  },
  {
    "table_name": "loads",
    "column_name": "source_call_id",
    "data_type": "uuid",
    "is_nullable": "YES"
  },
  {
    "table_name": "loads",
    "column_name": "rate_confirmation_id",
    "data_type": "uuid",
    "is_nullable": "YES"
  },
  {
    "table_name": "loads",
    "column_name": "reference_number",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "loads",
    "column_name": "po_number",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "loads",
    "column_name": "bol_number",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "loads",
    "column_name": "notes",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "loads",
    "column_name": "internal_notes",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "loads",
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "loads",
    "column_name": "created_by",
    "data_type": "uuid",
    "is_nullable": "YES"
  },
  {
    "table_name": "loads",
    "column_name": "updated_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "loads",
    "column_name": "updated_by",
    "data_type": "uuid",
    "is_nullable": "YES"
  },
  {
    "table_name": "loads",
    "column_name": "load_number",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "loads",
    "column_name": "tracking_updates",
    "data_type": "jsonb",
    "is_nullable": "YES"
  },
  {
    "table_name": "loads",
    "column_name": "last_check_call",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "loads",
    "column_name": "on_time_delivery",
    "data_type": "boolean",
    "is_nullable": "YES"
  },
  {
    "table_name": "loads",
    "column_name": "customer_rate",
    "data_type": "numeric",
    "is_nullable": "YES"
  },
  {
    "table_name": "loads",
    "column_name": "quick_pay",
    "data_type": "boolean",
    "is_nullable": "YES"
  },
  {
    "table_name": "loads",
    "column_name": "payment_terms",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "loads",
    "column_name": "rate_confirmation_sent_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "loads",
    "column_name": "rate_confirmation_signed_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "loads",
    "column_name": "bol_received_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "loads",
    "column_name": "pod_received_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "notifications",
    "column_name": "id",
    "data_type": "uuid",
    "is_nullable": "NO"
  },
  {
    "table_name": "notifications",
    "column_name": "user_id",
    "data_type": "uuid",
    "is_nullable": "NO"
  },
  {
    "table_name": "notifications",
    "column_name": "notification_type",
    "data_type": "text",
    "is_nullable": "NO"
  },
  {
    "table_name": "notifications",
    "column_name": "title",
    "data_type": "text",
    "is_nullable": "NO"
  },
  {
    "table_name": "notifications",
    "column_name": "message",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "notifications",
    "column_name": "link",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "notifications",
    "column_name": "is_read",
    "data_type": "boolean",
    "is_nullable": "YES"
  },
  {
    "table_name": "notifications",
    "column_name": "read_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "notifications",
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "organization_phones",
    "column_name": "id",
    "data_type": "uuid",
    "is_nullable": "NO"
  },
  {
    "table_name": "organization_phones",
    "column_name": "organization_id",
    "data_type": "uuid",
    "is_nullable": "YES"
  },
  {
    "table_name": "organization_phones",
    "column_name": "twilio_number",
    "data_type": "text",
    "is_nullable": "NO"
  },
  {
    "table_name": "organization_phones",
    "column_name": "twilio_sid",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "organization_phones",
    "column_name": "friendly_name",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "organization_phones",
    "column_name": "capabilities",
    "data_type": "jsonb",
    "is_nullable": "YES"
  },
  {
    "table_name": "organization_phones",
    "column_name": "forward_to",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "organization_phones",
    "column_name": "recording_enabled",
    "data_type": "boolean",
    "is_nullable": "YES"
  },
  {
    "table_name": "organization_phones",
    "column_name": "transcription_enabled",
    "data_type": "boolean",
    "is_nullable": "YES"
  },
  {
    "table_name": "organization_phones",
    "column_name": "status",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "organization_phones",
    "column_name": "metadata",
    "data_type": "jsonb",
    "is_nullable": "YES"
  },
  {
    "table_name": "organization_phones",
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "organization_phones",
    "column_name": "updated_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "organizations",
    "column_name": "id",
    "data_type": "uuid",
    "is_nullable": "NO"
  },
  {
    "table_name": "organizations",
    "column_name": "name",
    "data_type": "text",
    "is_nullable": "NO"
  },
  {
    "table_name": "organizations",
    "column_name": "slug",
    "data_type": "text",
    "is_nullable": "NO"
  },
  {
    "table_name": "organizations",
    "column_name": "plan_type",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "organizations",
    "column_name": "billing_email",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "organizations",
    "column_name": "max_members",
    "data_type": "integer",
    "is_nullable": "YES"
  },
  {
    "table_name": "organizations",
    "column_name": "max_minutes_monthly",
    "data_type": "integer",
    "is_nullable": "YES"
  },
  {
    "table_name": "organizations",
    "column_name": "stripe_customer_id",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "organizations",
    "column_name": "stripe_subscription_id",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "organizations",
    "column_name": "subscription_status",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "organizations",
    "column_name": "current_period_start",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "organizations",
    "column_name": "current_period_end",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "organizations",
    "column_name": "settings",
    "data_type": "jsonb",
    "is_nullable": "YES"
  },
  {
    "table_name": "organizations",
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "organizations",
    "column_name": "updated_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "organizations",
    "column_name": "deleted_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "organizations",
    "column_name": "paddle_customer_id",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "organizations",
    "column_name": "paddle_subscription_id",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "organizations",
    "column_name": "overage_minutes_purchased",
    "data_type": "integer",
    "is_nullable": "YES"
  },
  {
    "table_name": "organizations",
    "column_name": "referred_by",
    "data_type": "uuid",
    "is_nullable": "YES"
  },
  {
    "table_name": "organizations",
    "column_name": "referral_code_used",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "organizations",
    "column_name": "referral_activated_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "organizations",
    "column_name": "bonus_minutes_balance",
    "data_type": "integer",
    "is_nullable": "YES"
  },
  {
    "table_name": "organizations",
    "column_name": "bonus_credits_balance_cents",
    "data_type": "integer",
    "is_nullable": "YES"
  },
  {
    "table_name": "organizations",
    "column_name": "used_minutes",
    "data_type": "integer",
    "is_nullable": "YES"
  },
  {
    "table_name": "organizations",
    "column_name": "product_type",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "organizations",
    "column_name": "company_address",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "organizations",
    "column_name": "company_city",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "organizations",
    "column_name": "company_state",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "organizations",
    "column_name": "company_zip",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "organizations",
    "column_name": "mc_number",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "organizations",
    "column_name": "dot_number",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "organizations",
    "column_name": "logo_url",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "organizations",
    "column_name": "rate_con_terms",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "organizations",
    "column_name": "default_payment_terms",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "organizations",
    "column_name": "twilio_enabled",
    "data_type": "boolean",
    "is_nullable": "YES"
  },
  {
    "table_name": "organizations",
    "column_name": "twilio_account_sid",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "organizations",
    "column_name": "twilio_auth_token_encrypted",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "organizations",
    "column_name": "twilio_settings",
    "data_type": "jsonb",
    "is_nullable": "YES"
  },
  {
    "table_name": "organizations",
    "column_name": "subscription_id",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "organizations",
    "column_name": "subscription_plan",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "organizations",
    "column_name": "billing_cycle",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "organizations",
    "column_name": "subscription_current_period_start",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "organizations",
    "column_name": "subscription_current_period_end",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "organizations",
    "column_name": "subscription_cancel_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "organizations",
    "column_name": "max_minutes",
    "data_type": "integer",
    "is_nullable": "YES"
  },
  {
    "table_name": "organizations",
    "column_name": "always_announce_recording",
    "data_type": "boolean",
    "is_nullable": "YES"
  },
  {
    "table_name": "organizations",
    "column_name": "never_announce_recording",
    "data_type": "boolean",
    "is_nullable": "YES"
  },
  {
    "table_name": "organizations",
    "column_name": "recording_disclosure_message",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "organizations",
    "column_name": "recording_consent_states",
    "data_type": "ARRAY",
    "is_nullable": "YES"
  },
  {
    "table_name": "organizations",
    "column_name": "overage_debt",
    "data_type": "numeric",
    "is_nullable": "YES"
  },
  {
    "table_name": "organizations",
    "column_name": "overage_debt_due_date",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "organizations",
    "column_name": "has_unpaid_overage",
    "data_type": "boolean",
    "is_nullable": "YES"
  },
  {
    "table_name": "organizations",
    "column_name": "can_upgrade",
    "data_type": "boolean",
    "is_nullable": "YES"
  },
  {
    "table_name": "organizations",
    "column_name": "last_overage_invoice_id",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "organizations",
    "column_name": "overage_payment_status",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "organizations",
    "column_name": "usage_minutes_limit",
    "data_type": "integer",
    "is_nullable": "YES"
  },
  {
    "table_name": "organizations",
    "column_name": "usage_minutes_current",
    "data_type": "integer",
    "is_nullable": "YES"
  },
  {
    "table_name": "organizations",
    "column_name": "usage_reset_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "organizations",
    "column_name": "overage_cap_reached",
    "data_type": "boolean",
    "is_nullable": "YES"
  },
  {
    "table_name": "organizations",
    "column_name": "usage_current_month",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "overage_invoices",
    "column_name": "id",
    "data_type": "uuid",
    "is_nullable": "NO"
  },
  {
    "table_name": "overage_invoices",
    "column_name": "organization_id",
    "data_type": "uuid",
    "is_nullable": "NO"
  },
  {
    "table_name": "overage_invoices",
    "column_name": "amount",
    "data_type": "numeric",
    "is_nullable": "NO"
  },
  {
    "table_name": "overage_invoices",
    "column_name": "minutes_overage",
    "data_type": "integer",
    "is_nullable": "NO"
  },
  {
    "table_name": "overage_invoices",
    "column_name": "billing_period_start",
    "data_type": "date",
    "is_nullable": "NO"
  },
  {
    "table_name": "overage_invoices",
    "column_name": "billing_period_end",
    "data_type": "date",
    "is_nullable": "NO"
  },
  {
    "table_name": "overage_invoices",
    "column_name": "paddle_invoice_id",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "overage_invoices",
    "column_name": "paddle_transaction_id",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "overage_invoices",
    "column_name": "paddle_checkout_url",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "overage_invoices",
    "column_name": "status",
    "data_type": "text",
    "is_nullable": "NO"
  },
  {
    "table_name": "overage_invoices",
    "column_name": "sent_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "overage_invoices",
    "column_name": "paid_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "overage_invoices",
    "column_name": "failed_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "overage_invoices",
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "NO"
  },
  {
    "table_name": "overage_invoices",
    "column_name": "updated_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "NO"
  },
  {
    "table_name": "partner_activity_logs",
    "column_name": "id",
    "data_type": "uuid",
    "is_nullable": "NO"
  },
  {
    "table_name": "partner_activity_logs",
    "column_name": "partner_id",
    "data_type": "uuid",
    "is_nullable": "NO"
  },
  {
    "table_name": "partner_activity_logs",
    "column_name": "activity_type",
    "data_type": "text",
    "is_nullable": "NO"
  },
  {
    "table_name": "partner_activity_logs",
    "column_name": "activity_details",
    "data_type": "jsonb",
    "is_nullable": "YES"
  },
  {
    "table_name": "partner_activity_logs",
    "column_name": "ip_address",
    "data_type": "inet",
    "is_nullable": "YES"
  },
  {
    "table_name": "partner_activity_logs",
    "column_name": "user_agent",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "partner_activity_logs",
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "partner_applications",
    "column_name": "id",
    "data_type": "uuid",
    "is_nullable": "NO"
  },
  {
    "table_name": "partner_applications",
    "column_name": "email",
    "data_type": "text",
    "is_nullable": "NO"
  },
  {
    "table_name": "partner_applications",
    "column_name": "full_name",
    "data_type": "text",
    "is_nullable": "NO"
  },
  {
    "table_name": "partner_applications",
    "column_name": "company_name",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "partner_applications",
    "column_name": "website",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "partner_applications",
    "column_name": "phone",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "partner_applications",
    "column_name": "partner_type",
    "data_type": "text",
    "is_nullable": "NO"
  },
  {
    "table_name": "partner_applications",
    "column_name": "clients_per_year",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "partner_applications",
    "column_name": "crms_used",
    "data_type": "ARRAY",
    "is_nullable": "YES"
  },
  {
    "table_name": "partner_applications",
    "column_name": "how_heard",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "partner_applications",
    "column_name": "why_partner",
    "data_type": "text",
    "is_nullable": "NO"
  },
  {
    "table_name": "partner_applications",
    "column_name": "has_used_synqall",
    "data_type": "boolean",
    "is_nullable": "YES"
  },
  {
    "table_name": "partner_applications",
    "column_name": "terms_accepted",
    "data_type": "boolean",
    "is_nullable": "NO"
  },
  {
    "table_name": "partner_applications",
    "column_name": "status",
    "data_type": "text",
    "is_nullable": "NO"
  },
  {
    "table_name": "partner_applications",
    "column_name": "submitted_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "partner_applications",
    "column_name": "reviewed_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "partner_applications",
    "column_name": "reviewed_by",
    "data_type": "uuid",
    "is_nullable": "YES"
  },
  {
    "table_name": "partner_applications",
    "column_name": "review_notes",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "partner_applications",
    "column_name": "rejection_reason",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "partner_applications",
    "column_name": "ip_address",
    "data_type": "inet",
    "is_nullable": "YES"
  },
  {
    "table_name": "partner_applications",
    "column_name": "user_agent",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "partner_applications",
    "column_name": "metadata",
    "data_type": "jsonb",
    "is_nullable": "YES"
  },
  {
    "table_name": "partner_applications",
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "partner_clicks",
    "column_name": "id",
    "data_type": "uuid",
    "is_nullable": "NO"
  },
  {
    "table_name": "partner_clicks",
    "column_name": "partner_id",
    "data_type": "uuid",
    "is_nullable": "NO"
  },
  {
    "table_name": "partner_clicks",
    "column_name": "referral_code",
    "data_type": "text",
    "is_nullable": "NO"
  },
  {
    "table_name": "partner_clicks",
    "column_name": "clicked_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "partner_clicks",
    "column_name": "ip_address",
    "data_type": "inet",
    "is_nullable": "YES"
  },
  {
    "table_name": "partner_clicks",
    "column_name": "user_agent",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "partner_clicks",
    "column_name": "referer",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "partner_clicks",
    "column_name": "landing_page",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "partner_clicks",
    "column_name": "utm_source",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "partner_clicks",
    "column_name": "utm_medium",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "partner_clicks",
    "column_name": "utm_campaign",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "partner_clicks",
    "column_name": "converted",
    "data_type": "boolean",
    "is_nullable": "YES"
  },
  {
    "table_name": "partner_clicks",
    "column_name": "converted_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "partner_clicks",
    "column_name": "customer_id",
    "data_type": "uuid",
    "is_nullable": "YES"
  },
  {
    "table_name": "partner_clicks",
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "partner_commissions",
    "column_name": "id",
    "data_type": "uuid",
    "is_nullable": "NO"
  },
  {
    "table_name": "partner_commissions",
    "column_name": "partner_id",
    "data_type": "uuid",
    "is_nullable": "NO"
  },
  {
    "table_name": "partner_commissions",
    "column_name": "referral_id",
    "data_type": "uuid",
    "is_nullable": "NO"
  },
  {
    "table_name": "partner_commissions",
    "column_name": "customer_id",
    "data_type": "uuid",
    "is_nullable": "NO"
  },
  {
    "table_name": "partner_commissions",
    "column_name": "customer_organization_id",
    "data_type": "uuid",
    "is_nullable": "YES"
  },
  {
    "table_name": "partner_commissions",
    "column_name": "amount_cents",
    "data_type": "integer",
    "is_nullable": "NO"
  },
  {
    "table_name": "partner_commissions",
    "column_name": "currency",
    "data_type": "text",
    "is_nullable": "NO"
  },
  {
    "table_name": "partner_commissions",
    "column_name": "status",
    "data_type": "text",
    "is_nullable": "NO"
  },
  {
    "table_name": "partner_commissions",
    "column_name": "month",
    "data_type": "text",
    "is_nullable": "NO"
  },
  {
    "table_name": "partner_commissions",
    "column_name": "subscription_payment_id",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "partner_commissions",
    "column_name": "calculated_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "partner_commissions",
    "column_name": "approved_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "partner_commissions",
    "column_name": "paid_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "partner_commissions",
    "column_name": "reversed_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "partner_commissions",
    "column_name": "reversal_reason",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "partner_commissions",
    "column_name": "payout_id",
    "data_type": "uuid",
    "is_nullable": "YES"
  },
  {
    "table_name": "partner_commissions",
    "column_name": "commission_rate",
    "data_type": "numeric",
    "is_nullable": "NO"
  },
  {
    "table_name": "partner_commissions",
    "column_name": "base_amount_cents",
    "data_type": "integer",
    "is_nullable": "NO"
  },
  {
    "table_name": "partner_commissions",
    "column_name": "notes",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "partner_commissions",
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "partner_payouts",
    "column_name": "id",
    "data_type": "uuid",
    "is_nullable": "NO"
  },
  {
    "table_name": "partner_payouts",
    "column_name": "partner_id",
    "data_type": "uuid",
    "is_nullable": "NO"
  },
  {
    "table_name": "partner_payouts",
    "column_name": "amount_cents",
    "data_type": "integer",
    "is_nullable": "NO"
  },
  {
    "table_name": "partner_payouts",
    "column_name": "currency",
    "data_type": "text",
    "is_nullable": "NO"
  },
  {
    "table_name": "partner_payouts",
    "column_name": "status",
    "data_type": "text",
    "is_nullable": "NO"
  },
  {
    "table_name": "partner_payouts",
    "column_name": "payment_method",
    "data_type": "text",
    "is_nullable": "NO"
  },
  {
    "table_name": "partner_payouts",
    "column_name": "payment_details",
    "data_type": "jsonb",
    "is_nullable": "YES"
  },
  {
    "table_name": "partner_payouts",
    "column_name": "period_start",
    "data_type": "date",
    "is_nullable": "NO"
  },
  {
    "table_name": "partner_payouts",
    "column_name": "period_end",
    "data_type": "date",
    "is_nullable": "NO"
  },
  {
    "table_name": "partner_payouts",
    "column_name": "commission_count",
    "data_type": "integer",
    "is_nullable": "NO"
  },
  {
    "table_name": "partner_payouts",
    "column_name": "processed_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "partner_payouts",
    "column_name": "completed_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "partner_payouts",
    "column_name": "failed_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "partner_payouts",
    "column_name": "failure_reason",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "partner_payouts",
    "column_name": "transaction_id",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "partner_payouts",
    "column_name": "payment_receipt_url",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "partner_payouts",
    "column_name": "notes",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "partner_payouts",
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "partner_payouts",
    "column_name": "updated_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "partner_referrals",
    "column_name": "id",
    "data_type": "uuid",
    "is_nullable": "NO"
  },
  {
    "table_name": "partner_referrals",
    "column_name": "partner_id",
    "data_type": "uuid",
    "is_nullable": "NO"
  },
  {
    "table_name": "partner_referrals",
    "column_name": "customer_id",
    "data_type": "uuid",
    "is_nullable": "YES"
  },
  {
    "table_name": "partner_referrals",
    "column_name": "customer_email",
    "data_type": "text",
    "is_nullable": "NO"
  },
  {
    "table_name": "partner_referrals",
    "column_name": "customer_organization_id",
    "data_type": "uuid",
    "is_nullable": "YES"
  },
  {
    "table_name": "partner_referrals",
    "column_name": "referral_code",
    "data_type": "text",
    "is_nullable": "NO"
  },
  {
    "table_name": "partner_referrals",
    "column_name": "status",
    "data_type": "text",
    "is_nullable": "NO"
  },
  {
    "table_name": "partner_referrals",
    "column_name": "clicked_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "partner_referrals",
    "column_name": "signed_up_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "partner_referrals",
    "column_name": "trial_started_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "partner_referrals",
    "column_name": "converted_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "partner_referrals",
    "column_name": "churned_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "partner_referrals",
    "column_name": "refunded_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "partner_referrals",
    "column_name": "subscription_id",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "partner_referrals",
    "column_name": "plan_name",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "partner_referrals",
    "column_name": "monthly_value",
    "data_type": "integer",
    "is_nullable": "YES"
  },
  {
    "table_name": "partner_referrals",
    "column_name": "lifetime_value",
    "data_type": "integer",
    "is_nullable": "YES"
  },
  {
    "table_name": "partner_referrals",
    "column_name": "months_active",
    "data_type": "integer",
    "is_nullable": "YES"
  },
  {
    "table_name": "partner_referrals",
    "column_name": "metadata",
    "data_type": "jsonb",
    "is_nullable": "YES"
  },
  {
    "table_name": "partner_referrals",
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "partner_referrals",
    "column_name": "updated_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "partner_resource_downloads",
    "column_name": "id",
    "data_type": "uuid",
    "is_nullable": "NO"
  },
  {
    "table_name": "partner_resource_downloads",
    "column_name": "partner_id",
    "data_type": "uuid",
    "is_nullable": "NO"
  },
  {
    "table_name": "partner_resource_downloads",
    "column_name": "resource_id",
    "data_type": "uuid",
    "is_nullable": "NO"
  },
  {
    "table_name": "partner_resource_downloads",
    "column_name": "downloaded_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "partner_resource_downloads",
    "column_name": "ip_address",
    "data_type": "inet",
    "is_nullable": "YES"
  },
  {
    "table_name": "partner_resource_downloads",
    "column_name": "user_agent",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "partner_resources",
    "column_name": "id",
    "data_type": "uuid",
    "is_nullable": "NO"
  },
  {
    "table_name": "partner_resources",
    "column_name": "resource_type",
    "data_type": "text",
    "is_nullable": "NO"
  },
  {
    "table_name": "partner_resources",
    "column_name": "title",
    "data_type": "text",
    "is_nullable": "NO"
  },
  {
    "table_name": "partner_resources",
    "column_name": "description",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "partner_resources",
    "column_name": "content",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "partner_resources",
    "column_name": "file_url",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "partner_resources",
    "column_name": "file_size",
    "data_type": "integer",
    "is_nullable": "YES"
  },
  {
    "table_name": "partner_resources",
    "column_name": "mime_type",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "partner_resources",
    "column_name": "category",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "partner_resources",
    "column_name": "is_active",
    "data_type": "boolean",
    "is_nullable": "YES"
  },
  {
    "table_name": "partner_resources",
    "column_name": "download_count",
    "data_type": "integer",
    "is_nullable": "YES"
  },
  {
    "table_name": "partner_resources",
    "column_name": "last_downloaded_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "partner_resources",
    "column_name": "metadata",
    "data_type": "jsonb",
    "is_nullable": "YES"
  },
  {
    "table_name": "partner_resources",
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "partner_resources",
    "column_name": "updated_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "partner_sessions",
    "column_name": "id",
    "data_type": "uuid",
    "is_nullable": "NO"
  },
  {
    "table_name": "partner_sessions",
    "column_name": "partner_id",
    "data_type": "uuid",
    "is_nullable": "NO"
  },
  {
    "table_name": "partner_sessions",
    "column_name": "token",
    "data_type": "text",
    "is_nullable": "NO"
  },
  {
    "table_name": "partner_sessions",
    "column_name": "expires_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "NO"
  },
  {
    "table_name": "partner_sessions",
    "column_name": "ip_address",
    "data_type": "inet",
    "is_nullable": "YES"
  },
  {
    "table_name": "partner_sessions",
    "column_name": "user_agent",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "partner_sessions",
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "partner_statistics",
    "column_name": "id",
    "data_type": "uuid",
    "is_nullable": "NO"
  },
  {
    "table_name": "partner_statistics",
    "column_name": "partner_id",
    "data_type": "uuid",
    "is_nullable": "NO"
  },
  {
    "table_name": "partner_statistics",
    "column_name": "total_clicks",
    "data_type": "integer",
    "is_nullable": "YES"
  },
  {
    "table_name": "partner_statistics",
    "column_name": "total_signups",
    "data_type": "integer",
    "is_nullable": "YES"
  },
  {
    "table_name": "partner_statistics",
    "column_name": "total_trials",
    "data_type": "integer",
    "is_nullable": "YES"
  },
  {
    "table_name": "partner_statistics",
    "column_name": "total_customers",
    "data_type": "integer",
    "is_nullable": "YES"
  },
  {
    "table_name": "partner_statistics",
    "column_name": "active_customers",
    "data_type": "integer",
    "is_nullable": "YES"
  },
  {
    "table_name": "partner_statistics",
    "column_name": "churned_customers",
    "data_type": "integer",
    "is_nullable": "YES"
  },
  {
    "table_name": "partner_statistics",
    "column_name": "total_revenue_generated",
    "data_type": "integer",
    "is_nullable": "YES"
  },
  {
    "table_name": "partner_statistics",
    "column_name": "total_commission_earned",
    "data_type": "integer",
    "is_nullable": "YES"
  },
  {
    "table_name": "partner_statistics",
    "column_name": "total_commission_paid",
    "data_type": "integer",
    "is_nullable": "YES"
  },
  {
    "table_name": "partner_statistics",
    "column_name": "total_commission_pending",
    "data_type": "integer",
    "is_nullable": "YES"
  },
  {
    "table_name": "partner_statistics",
    "column_name": "total_commission_approved",
    "data_type": "integer",
    "is_nullable": "YES"
  },
  {
    "table_name": "partner_statistics",
    "column_name": "average_customer_value",
    "data_type": "integer",
    "is_nullable": "YES"
  },
  {
    "table_name": "partner_statistics",
    "column_name": "conversion_rate",
    "data_type": "numeric",
    "is_nullable": "YES"
  },
  {
    "table_name": "partner_statistics",
    "column_name": "churn_rate",
    "data_type": "numeric",
    "is_nullable": "YES"
  },
  {
    "table_name": "partner_statistics",
    "column_name": "last_referral_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "partner_statistics",
    "column_name": "last_conversion_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "partner_statistics",
    "column_name": "last_payout_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "partner_statistics",
    "column_name": "current_month_earnings",
    "data_type": "integer",
    "is_nullable": "YES"
  },
  {
    "table_name": "partner_statistics",
    "column_name": "last_month_earnings",
    "data_type": "integer",
    "is_nullable": "YES"
  },
  {
    "table_name": "partner_statistics",
    "column_name": "lifetime_earnings",
    "data_type": "integer",
    "is_nullable": "YES"
  },
  {
    "table_name": "partner_statistics",
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "partner_statistics",
    "column_name": "updated_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "partners",
    "column_name": "id",
    "data_type": "uuid",
    "is_nullable": "NO"
  },
  {
    "table_name": "partners",
    "column_name": "email",
    "data_type": "text",
    "is_nullable": "NO"
  },
  {
    "table_name": "partners",
    "column_name": "full_name",
    "data_type": "text",
    "is_nullable": "NO"
  },
  {
    "table_name": "partners",
    "column_name": "company_name",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "partners",
    "column_name": "website",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "partners",
    "column_name": "phone",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "partners",
    "column_name": "partner_type",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "partners",
    "column_name": "status",
    "data_type": "text",
    "is_nullable": "NO"
  },
  {
    "table_name": "partners",
    "column_name": "tier",
    "data_type": "text",
    "is_nullable": "NO"
  },
  {
    "table_name": "partners",
    "column_name": "commission_rate",
    "data_type": "numeric",
    "is_nullable": "NO"
  },
  {
    "table_name": "partners",
    "column_name": "referral_code",
    "data_type": "text",
    "is_nullable": "NO"
  },
  {
    "table_name": "partners",
    "column_name": "coupon_code",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "partners",
    "column_name": "password_hash",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "partners",
    "column_name": "payment_method",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "partners",
    "column_name": "payment_details",
    "data_type": "jsonb",
    "is_nullable": "YES"
  },
  {
    "table_name": "partners",
    "column_name": "approved_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "partners",
    "column_name": "approved_by",
    "data_type": "uuid",
    "is_nullable": "YES"
  },
  {
    "table_name": "partners",
    "column_name": "suspended_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "partners",
    "column_name": "suspended_reason",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "partners",
    "column_name": "last_login_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "partners",
    "column_name": "metadata",
    "data_type": "jsonb",
    "is_nullable": "YES"
  },
  {
    "table_name": "partners",
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "partners",
    "column_name": "updated_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "payments",
    "column_name": "id",
    "data_type": "uuid",
    "is_nullable": "NO"
  },
  {
    "table_name": "payments",
    "column_name": "organization_id",
    "data_type": "uuid",
    "is_nullable": "NO"
  },
  {
    "table_name": "payments",
    "column_name": "paddle_transaction_id",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "payments",
    "column_name": "amount",
    "data_type": "integer",
    "is_nullable": "NO"
  },
  {
    "table_name": "payments",
    "column_name": "currency",
    "data_type": "text",
    "is_nullable": "NO"
  },
  {
    "table_name": "payments",
    "column_name": "status",
    "data_type": "text",
    "is_nullable": "NO"
  },
  {
    "table_name": "payments",
    "column_name": "failure_reason",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "payments",
    "column_name": "description",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "payments",
    "column_name": "paid_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "payments",
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "NO"
  },
  {
    "table_name": "pending_subscriptions",
    "column_name": "id",
    "data_type": "uuid",
    "is_nullable": "NO"
  },
  {
    "table_name": "pending_subscriptions",
    "column_name": "organization_id",
    "data_type": "uuid",
    "is_nullable": "NO"
  },
  {
    "table_name": "pending_subscriptions",
    "column_name": "user_id",
    "data_type": "uuid",
    "is_nullable": "NO"
  },
  {
    "table_name": "pending_subscriptions",
    "column_name": "plan_type",
    "data_type": "text",
    "is_nullable": "NO"
  },
  {
    "table_name": "pending_subscriptions",
    "column_name": "billing_cycle",
    "data_type": "text",
    "is_nullable": "NO"
  },
  {
    "table_name": "pending_subscriptions",
    "column_name": "paddle_checkout_id",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "pending_subscriptions",
    "column_name": "status",
    "data_type": "text",
    "is_nullable": "NO"
  },
  {
    "table_name": "pending_subscriptions",
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "NO"
  },
  {
    "table_name": "pending_subscriptions",
    "column_name": "expires_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "NO"
  },
  {
    "table_name": "performance_metrics",
    "column_name": "id",
    "data_type": "uuid",
    "is_nullable": "NO"
  },
  {
    "table_name": "performance_metrics",
    "column_name": "metric_type",
    "data_type": "text",
    "is_nullable": "NO"
  },
  {
    "table_name": "performance_metrics",
    "column_name": "operation",
    "data_type": "text",
    "is_nullable": "NO"
  },
  {
    "table_name": "performance_metrics",
    "column_name": "duration_ms",
    "data_type": "integer",
    "is_nullable": "NO"
  },
  {
    "table_name": "performance_metrics",
    "column_name": "success",
    "data_type": "boolean",
    "is_nullable": "NO"
  },
  {
    "table_name": "performance_metrics",
    "column_name": "error_message",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "performance_metrics",
    "column_name": "metadata",
    "data_type": "jsonb",
    "is_nullable": "YES"
  },
  {
    "table_name": "performance_metrics",
    "column_name": "timestamp",
    "data_type": "timestamp with time zone",
    "is_nullable": "NO"
  },
  {
    "table_name": "performance_metrics",
    "column_name": "user_id",
    "data_type": "uuid",
    "is_nullable": "YES"
  },
  {
    "table_name": "performance_metrics",
    "column_name": "organization_id",
    "data_type": "uuid",
    "is_nullable": "YES"
  },
  {
    "table_name": "performance_metrics",
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "NO"
  },
  {
    "table_name": "processing_locks",
    "column_name": "id",
    "data_type": "uuid",
    "is_nullable": "NO"
  },
  {
    "table_name": "processing_locks",
    "column_name": "organization_id",
    "data_type": "uuid",
    "is_nullable": "NO"
  },
  {
    "table_name": "processing_locks",
    "column_name": "call_id",
    "data_type": "uuid",
    "is_nullable": "NO"
  },
  {
    "table_name": "processing_locks",
    "column_name": "estimated_minutes",
    "data_type": "integer",
    "is_nullable": "NO"
  },
  {
    "table_name": "processing_locks",
    "column_name": "locked_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "NO"
  },
  {
    "table_name": "profiles",
    "column_name": "id",
    "data_type": "uuid",
    "is_nullable": "NO"
  },
  {
    "table_name": "profiles",
    "column_name": "email",
    "data_type": "text",
    "is_nullable": "NO"
  },
  {
    "table_name": "profiles",
    "column_name": "full_name",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "profiles",
    "column_name": "avatar_url",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "profiles",
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "profiles",
    "column_name": "updated_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "rate_confirmation_activities",
    "column_name": "id",
    "data_type": "uuid",
    "is_nullable": "NO"
  },
  {
    "table_name": "rate_confirmation_activities",
    "column_name": "rate_confirmation_id",
    "data_type": "uuid",
    "is_nullable": "NO"
  },
  {
    "table_name": "rate_confirmation_activities",
    "column_name": "activity_type",
    "data_type": "text",
    "is_nullable": "NO"
  },
  {
    "table_name": "rate_confirmation_activities",
    "column_name": "details",
    "data_type": "jsonb",
    "is_nullable": "YES"
  },
  {
    "table_name": "rate_confirmation_activities",
    "column_name": "ip_address",
    "data_type": "inet",
    "is_nullable": "YES"
  },
  {
    "table_name": "rate_confirmation_activities",
    "column_name": "user_agent",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "rate_confirmation_activities",
    "column_name": "created_by",
    "data_type": "uuid",
    "is_nullable": "YES"
  },
  {
    "table_name": "rate_confirmation_activities",
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "rate_confirmation_tracking",
    "column_name": "id",
    "data_type": "uuid",
    "is_nullable": "NO"
  },
  {
    "table_name": "rate_confirmation_tracking",
    "column_name": "rate_confirmation_id",
    "data_type": "uuid",
    "is_nullable": "NO"
  },
  {
    "table_name": "rate_confirmation_tracking",
    "column_name": "tracking_token",
    "data_type": "text",
    "is_nullable": "NO"
  },
  {
    "table_name": "rate_confirmation_tracking",
    "column_name": "view_count",
    "data_type": "integer",
    "is_nullable": "YES"
  },
  {
    "table_name": "rate_confirmation_tracking",
    "column_name": "download_count",
    "data_type": "integer",
    "is_nullable": "YES"
  },
  {
    "table_name": "rate_confirmation_tracking",
    "column_name": "last_viewed_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "rate_confirmation_tracking",
    "column_name": "last_downloaded_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "rate_confirmation_tracking",
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "rate_confirmations",
    "column_name": "id",
    "data_type": "uuid",
    "is_nullable": "NO"
  },
  {
    "table_name": "rate_confirmations",
    "column_name": "organization_id",
    "data_type": "uuid",
    "is_nullable": "NO"
  },
  {
    "table_name": "rate_confirmations",
    "column_name": "load_id",
    "data_type": "uuid",
    "is_nullable": "NO"
  },
  {
    "table_name": "rate_confirmations",
    "column_name": "rate_con_number",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "rate_confirmations",
    "column_name": "pdf_url",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "rate_confirmations",
    "column_name": "status",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "rate_confirmations",
    "column_name": "sent_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "rate_confirmations",
    "column_name": "sent_to_email",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "rate_confirmations",
    "column_name": "signed_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "rate_confirmations",
    "column_name": "signed_by",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "rate_confirmations",
    "column_name": "version",
    "data_type": "integer",
    "is_nullable": "YES"
  },
  {
    "table_name": "rate_confirmations",
    "column_name": "is_latest",
    "data_type": "boolean",
    "is_nullable": "YES"
  },
  {
    "table_name": "rate_confirmations",
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "rate_confirmations",
    "column_name": "created_by",
    "data_type": "uuid",
    "is_nullable": "YES"
  },
  {
    "table_name": "rate_confirmations",
    "column_name": "updated_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "rate_confirmations",
    "column_name": "sent_to",
    "data_type": "ARRAY",
    "is_nullable": "YES"
  },
  {
    "table_name": "rate_confirmations",
    "column_name": "last_viewed_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "rate_confirmations",
    "column_name": "view_count",
    "data_type": "integer",
    "is_nullable": "YES"
  },
  {
    "table_name": "rate_confirmations",
    "column_name": "download_count",
    "data_type": "integer",
    "is_nullable": "YES"
  },
  {
    "table_name": "rate_confirmations",
    "column_name": "signature_data",
    "data_type": "jsonb",
    "is_nullable": "YES"
  },
  {
    "table_name": "rate_confirmations",
    "column_name": "acceptance_status",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "rate_confirmations",
    "column_name": "acceptance_notes",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "referral_click_tracking",
    "column_name": "id",
    "data_type": "uuid",
    "is_nullable": "NO"
  },
  {
    "table_name": "referral_click_tracking",
    "column_name": "referral_code",
    "data_type": "text",
    "is_nullable": "NO"
  },
  {
    "table_name": "referral_click_tracking",
    "column_name": "ip_address",
    "data_type": "inet",
    "is_nullable": "YES"
  },
  {
    "table_name": "referral_click_tracking",
    "column_name": "user_agent",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "referral_click_tracking",
    "column_name": "referer",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "referral_click_tracking",
    "column_name": "utm_source",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "referral_click_tracking",
    "column_name": "utm_medium",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "referral_click_tracking",
    "column_name": "utm_campaign",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "referral_click_tracking",
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "referral_rewards",
    "column_name": "id",
    "data_type": "uuid",
    "is_nullable": "NO"
  },
  {
    "table_name": "referral_rewards",
    "column_name": "user_id",
    "data_type": "uuid",
    "is_nullable": "NO"
  },
  {
    "table_name": "referral_rewards",
    "column_name": "organization_id",
    "data_type": "uuid",
    "is_nullable": "YES"
  },
  {
    "table_name": "referral_rewards",
    "column_name": "referral_id",
    "data_type": "uuid",
    "is_nullable": "YES"
  },
  {
    "table_name": "referral_rewards",
    "column_name": "reward_type",
    "data_type": "text",
    "is_nullable": "NO"
  },
  {
    "table_name": "referral_rewards",
    "column_name": "reward_minutes",
    "data_type": "integer",
    "is_nullable": "YES"
  },
  {
    "table_name": "referral_rewards",
    "column_name": "reward_credits_cents",
    "data_type": "integer",
    "is_nullable": "YES"
  },
  {
    "table_name": "referral_rewards",
    "column_name": "tier_reached",
    "data_type": "integer",
    "is_nullable": "NO"
  },
  {
    "table_name": "referral_rewards",
    "column_name": "tier_name",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "referral_rewards",
    "column_name": "claimed",
    "data_type": "boolean",
    "is_nullable": "YES"
  },
  {
    "table_name": "referral_rewards",
    "column_name": "claimed_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "referral_rewards",
    "column_name": "applied_to_account",
    "data_type": "boolean",
    "is_nullable": "YES"
  },
  {
    "table_name": "referral_rewards",
    "column_name": "applied_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "referral_rewards",
    "column_name": "expires_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "referral_rewards",
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "referral_rewards",
    "column_name": "updated_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "referral_statistics",
    "column_name": "id",
    "data_type": "uuid",
    "is_nullable": "NO"
  },
  {
    "table_name": "referral_statistics",
    "column_name": "user_id",
    "data_type": "uuid",
    "is_nullable": "NO"
  },
  {
    "table_name": "referral_statistics",
    "column_name": "organization_id",
    "data_type": "uuid",
    "is_nullable": "YES"
  },
  {
    "table_name": "referral_statistics",
    "column_name": "total_referrals_sent",
    "data_type": "integer",
    "is_nullable": "YES"
  },
  {
    "table_name": "referral_statistics",
    "column_name": "total_clicks",
    "data_type": "integer",
    "is_nullable": "YES"
  },
  {
    "table_name": "referral_statistics",
    "column_name": "total_signups",
    "data_type": "integer",
    "is_nullable": "YES"
  },
  {
    "table_name": "referral_statistics",
    "column_name": "total_active",
    "data_type": "integer",
    "is_nullable": "YES"
  },
  {
    "table_name": "referral_statistics",
    "column_name": "total_rewarded",
    "data_type": "integer",
    "is_nullable": "YES"
  },
  {
    "table_name": "referral_statistics",
    "column_name": "current_tier",
    "data_type": "integer",
    "is_nullable": "YES"
  },
  {
    "table_name": "referral_statistics",
    "column_name": "next_tier",
    "data_type": "integer",
    "is_nullable": "YES"
  },
  {
    "table_name": "referral_statistics",
    "column_name": "referrals_to_next_tier",
    "data_type": "integer",
    "is_nullable": "YES"
  },
  {
    "table_name": "referral_statistics",
    "column_name": "total_minutes_earned",
    "data_type": "integer",
    "is_nullable": "YES"
  },
  {
    "table_name": "referral_statistics",
    "column_name": "total_credits_earned_cents",
    "data_type": "integer",
    "is_nullable": "YES"
  },
  {
    "table_name": "referral_statistics",
    "column_name": "total_minutes_claimed",
    "data_type": "integer",
    "is_nullable": "YES"
  },
  {
    "table_name": "referral_statistics",
    "column_name": "total_credits_claimed_cents",
    "data_type": "integer",
    "is_nullable": "YES"
  },
  {
    "table_name": "referral_statistics",
    "column_name": "available_minutes",
    "data_type": "integer",
    "is_nullable": "YES"
  },
  {
    "table_name": "referral_statistics",
    "column_name": "available_credits_cents",
    "data_type": "integer",
    "is_nullable": "YES"
  },
  {
    "table_name": "referral_statistics",
    "column_name": "last_referral_date",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "referral_statistics",
    "column_name": "last_reward_date",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "referral_statistics",
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "referral_statistics",
    "column_name": "updated_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "referral_tiers",
    "column_name": "id",
    "data_type": "uuid",
    "is_nullable": "NO"
  },
  {
    "table_name": "referral_tiers",
    "column_name": "tier_level",
    "data_type": "integer",
    "is_nullable": "NO"
  },
  {
    "table_name": "referral_tiers",
    "column_name": "tier_name",
    "data_type": "text",
    "is_nullable": "NO"
  },
  {
    "table_name": "referral_tiers",
    "column_name": "referrals_required",
    "data_type": "integer",
    "is_nullable": "NO"
  },
  {
    "table_name": "referral_tiers",
    "column_name": "reward_minutes",
    "data_type": "integer",
    "is_nullable": "YES"
  },
  {
    "table_name": "referral_tiers",
    "column_name": "reward_credits_cents",
    "data_type": "integer",
    "is_nullable": "YES"
  },
  {
    "table_name": "referral_tiers",
    "column_name": "is_cumulative",
    "data_type": "boolean",
    "is_nullable": "YES"
  },
  {
    "table_name": "referral_tiers",
    "column_name": "description",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "referral_tiers",
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "referral_tiers",
    "column_name": "updated_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "referrals",
    "column_name": "id",
    "data_type": "uuid",
    "is_nullable": "NO"
  },
  {
    "table_name": "referrals",
    "column_name": "referrer_id",
    "data_type": "uuid",
    "is_nullable": "NO"
  },
  {
    "table_name": "referrals",
    "column_name": "organization_id",
    "data_type": "uuid",
    "is_nullable": "YES"
  },
  {
    "table_name": "referrals",
    "column_name": "referral_code",
    "data_type": "text",
    "is_nullable": "NO"
  },
  {
    "table_name": "referrals",
    "column_name": "referred_email",
    "data_type": "text",
    "is_nullable": "NO"
  },
  {
    "table_name": "referrals",
    "column_name": "referred_user_id",
    "data_type": "uuid",
    "is_nullable": "YES"
  },
  {
    "table_name": "referrals",
    "column_name": "product_type",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "referrals",
    "column_name": "status",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "referrals",
    "column_name": "signup_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "referrals",
    "column_name": "activated_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "referrals",
    "column_name": "rewarded_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "referrals",
    "column_name": "reward_tier",
    "data_type": "integer",
    "is_nullable": "YES"
  },
  {
    "table_name": "referrals",
    "column_name": "reward_minutes",
    "data_type": "integer",
    "is_nullable": "YES"
  },
  {
    "table_name": "referrals",
    "column_name": "reward_credits_cents",
    "data_type": "integer",
    "is_nullable": "YES"
  },
  {
    "table_name": "referrals",
    "column_name": "clicked_count",
    "data_type": "integer",
    "is_nullable": "YES"
  },
  {
    "table_name": "referrals",
    "column_name": "last_clicked_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "referrals",
    "column_name": "expires_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "referrals",
    "column_name": "referred_plan_type",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "referrals",
    "column_name": "referred_organization_id",
    "data_type": "uuid",
    "is_nullable": "YES"
  },
  {
    "table_name": "referrals",
    "column_name": "metadata",
    "data_type": "jsonb",
    "is_nullable": "YES"
  },
  {
    "table_name": "referrals",
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "referrals",
    "column_name": "updated_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "shippers",
    "column_name": "id",
    "data_type": "uuid",
    "is_nullable": "NO"
  },
  {
    "table_name": "shippers",
    "column_name": "organization_id",
    "data_type": "uuid",
    "is_nullable": "NO"
  },
  {
    "table_name": "shippers",
    "column_name": "shipper_name",
    "data_type": "text",
    "is_nullable": "NO"
  },
  {
    "table_name": "shippers",
    "column_name": "company_name",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "shippers",
    "column_name": "contact_name",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "shippers",
    "column_name": "phone",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "shippers",
    "column_name": "email",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "shippers",
    "column_name": "address",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "shippers",
    "column_name": "city",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "shippers",
    "column_name": "state",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "shippers",
    "column_name": "zip",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "shippers",
    "column_name": "total_loads",
    "data_type": "integer",
    "is_nullable": "YES"
  },
  {
    "table_name": "shippers",
    "column_name": "total_revenue",
    "data_type": "numeric",
    "is_nullable": "YES"
  },
  {
    "table_name": "shippers",
    "column_name": "average_margin_percent",
    "data_type": "numeric",
    "is_nullable": "YES"
  },
  {
    "table_name": "shippers",
    "column_name": "credit_status",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "shippers",
    "column_name": "payment_terms",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "shippers",
    "column_name": "credit_limit",
    "data_type": "numeric",
    "is_nullable": "YES"
  },
  {
    "table_name": "shippers",
    "column_name": "balance_due",
    "data_type": "numeric",
    "is_nullable": "YES"
  },
  {
    "table_name": "shippers",
    "column_name": "preferred_equipment",
    "data_type": "ARRAY",
    "is_nullable": "YES"
  },
  {
    "table_name": "shippers",
    "column_name": "common_commodities",
    "data_type": "ARRAY",
    "is_nullable": "YES"
  },
  {
    "table_name": "shippers",
    "column_name": "special_requirements",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "shippers",
    "column_name": "status",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "shippers",
    "column_name": "notes",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "shippers",
    "column_name": "tags",
    "data_type": "ARRAY",
    "is_nullable": "YES"
  },
  {
    "table_name": "shippers",
    "column_name": "auto_created",
    "data_type": "boolean",
    "is_nullable": "YES"
  },
  {
    "table_name": "shippers",
    "column_name": "source_call_ids",
    "data_type": "ARRAY",
    "is_nullable": "YES"
  },
  {
    "table_name": "shippers",
    "column_name": "last_load_date",
    "data_type": "date",
    "is_nullable": "YES"
  },
  {
    "table_name": "shippers",
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "shippers",
    "column_name": "created_by",
    "data_type": "uuid",
    "is_nullable": "YES"
  },
  {
    "table_name": "shippers",
    "column_name": "updated_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "shippers",
    "column_name": "updated_by",
    "data_type": "uuid",
    "is_nullable": "YES"
  },
  {
    "table_name": "shippers",
    "column_name": "contacts",
    "data_type": "jsonb",
    "is_nullable": "YES"
  },
  {
    "table_name": "shippers",
    "column_name": "billing_address",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "shippers",
    "column_name": "billing_city",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "shippers",
    "column_name": "billing_state",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "shippers",
    "column_name": "billing_zip",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "shippers",
    "column_name": "average_days_to_pay",
    "data_type": "integer",
    "is_nullable": "YES"
  },
  {
    "table_name": "shippers",
    "column_name": "average_margin",
    "data_type": "numeric",
    "is_nullable": "YES"
  },
  {
    "table_name": "shippers",
    "column_name": "account_manager",
    "data_type": "uuid",
    "is_nullable": "YES"
  },
  {
    "table_name": "shippers",
    "column_name": "customer_since",
    "data_type": "date",
    "is_nullable": "YES"
  },
  {
    "table_name": "shippers",
    "column_name": "typical_commodities",
    "data_type": "ARRAY",
    "is_nullable": "YES"
  },
  {
    "table_name": "shippers",
    "column_name": "internal_notes",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "subscription_changes",
    "column_name": "id",
    "data_type": "uuid",
    "is_nullable": "NO"
  },
  {
    "table_name": "subscription_changes",
    "column_name": "organization_id",
    "data_type": "uuid",
    "is_nullable": "NO"
  },
  {
    "table_name": "subscription_changes",
    "column_name": "user_id",
    "data_type": "uuid",
    "is_nullable": "NO"
  },
  {
    "table_name": "subscription_changes",
    "column_name": "from_plan",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "subscription_changes",
    "column_name": "to_plan",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "subscription_changes",
    "column_name": "change_type",
    "data_type": "text",
    "is_nullable": "NO"
  },
  {
    "table_name": "subscription_changes",
    "column_name": "reason",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "subscription_changes",
    "column_name": "effective_date",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "subscription_changes",
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "NO"
  },
  {
    "table_name": "subscriptions",
    "column_name": "id",
    "data_type": "uuid",
    "is_nullable": "NO"
  },
  {
    "table_name": "subscriptions",
    "column_name": "paddle_subscription_id",
    "data_type": "text",
    "is_nullable": "NO"
  },
  {
    "table_name": "subscriptions",
    "column_name": "organization_id",
    "data_type": "uuid",
    "is_nullable": "NO"
  },
  {
    "table_name": "subscriptions",
    "column_name": "plan_type",
    "data_type": "text",
    "is_nullable": "NO"
  },
  {
    "table_name": "subscriptions",
    "column_name": "billing_cycle",
    "data_type": "text",
    "is_nullable": "NO"
  },
  {
    "table_name": "subscriptions",
    "column_name": "status",
    "data_type": "text",
    "is_nullable": "NO"
  },
  {
    "table_name": "subscriptions",
    "column_name": "current_period_start",
    "data_type": "timestamp with time zone",
    "is_nullable": "NO"
  },
  {
    "table_name": "subscriptions",
    "column_name": "current_period_end",
    "data_type": "timestamp with time zone",
    "is_nullable": "NO"
  },
  {
    "table_name": "subscriptions",
    "column_name": "cancel_at_period_end",
    "data_type": "boolean",
    "is_nullable": "YES"
  },
  {
    "table_name": "subscriptions",
    "column_name": "canceled_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "subscriptions",
    "column_name": "paused_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "subscriptions",
    "column_name": "metadata",
    "data_type": "jsonb",
    "is_nullable": "YES"
  },
  {
    "table_name": "subscriptions",
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "NO"
  },
  {
    "table_name": "subscriptions",
    "column_name": "updated_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "NO"
  },
  {
    "table_name": "system_alerts",
    "column_name": "id",
    "data_type": "uuid",
    "is_nullable": "NO"
  },
  {
    "table_name": "system_alerts",
    "column_name": "alert_type",
    "data_type": "text",
    "is_nullable": "NO"
  },
  {
    "table_name": "system_alerts",
    "column_name": "severity",
    "data_type": "text",
    "is_nullable": "NO"
  },
  {
    "table_name": "system_alerts",
    "column_name": "title",
    "data_type": "text",
    "is_nullable": "NO"
  },
  {
    "table_name": "system_alerts",
    "column_name": "message",
    "data_type": "text",
    "is_nullable": "NO"
  },
  {
    "table_name": "system_alerts",
    "column_name": "call_id",
    "data_type": "uuid",
    "is_nullable": "YES"
  },
  {
    "table_name": "system_alerts",
    "column_name": "user_id",
    "data_type": "uuid",
    "is_nullable": "YES"
  },
  {
    "table_name": "system_alerts",
    "column_name": "organization_id",
    "data_type": "uuid",
    "is_nullable": "YES"
  },
  {
    "table_name": "system_alerts",
    "column_name": "error_details",
    "data_type": "jsonb",
    "is_nullable": "YES"
  },
  {
    "table_name": "system_alerts",
    "column_name": "metadata",
    "data_type": "jsonb",
    "is_nullable": "YES"
  },
  {
    "table_name": "system_alerts",
    "column_name": "resolved",
    "data_type": "boolean",
    "is_nullable": "YES"
  },
  {
    "table_name": "system_alerts",
    "column_name": "resolved_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "system_alerts",
    "column_name": "resolved_by",
    "data_type": "uuid",
    "is_nullable": "YES"
  },
  {
    "table_name": "system_alerts",
    "column_name": "resolution_notes",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "system_alerts",
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "system_logs",
    "column_name": "id",
    "data_type": "uuid",
    "is_nullable": "NO"
  },
  {
    "table_name": "system_logs",
    "column_name": "log_type",
    "data_type": "text",
    "is_nullable": "NO"
  },
  {
    "table_name": "system_logs",
    "column_name": "message",
    "data_type": "text",
    "is_nullable": "NO"
  },
  {
    "table_name": "system_logs",
    "column_name": "metadata",
    "data_type": "jsonb",
    "is_nullable": "YES"
  },
  {
    "table_name": "system_logs",
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "team_invitations",
    "column_name": "id",
    "data_type": "uuid",
    "is_nullable": "NO"
  },
  {
    "table_name": "team_invitations",
    "column_name": "organization_id",
    "data_type": "uuid",
    "is_nullable": "NO"
  },
  {
    "table_name": "team_invitations",
    "column_name": "email",
    "data_type": "text",
    "is_nullable": "NO"
  },
  {
    "table_name": "team_invitations",
    "column_name": "role",
    "data_type": "text",
    "is_nullable": "NO"
  },
  {
    "table_name": "team_invitations",
    "column_name": "token",
    "data_type": "text",
    "is_nullable": "NO"
  },
  {
    "table_name": "team_invitations",
    "column_name": "invited_by",
    "data_type": "uuid",
    "is_nullable": "NO"
  },
  {
    "table_name": "team_invitations",
    "column_name": "expires_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "NO"
  },
  {
    "table_name": "team_invitations",
    "column_name": "accepted_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "team_invitations",
    "column_name": "accepted_by",
    "data_type": "uuid",
    "is_nullable": "YES"
  },
  {
    "table_name": "team_invitations",
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "team_invitations",
    "column_name": "resend_message_id",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "template_fields",
    "column_name": "id",
    "data_type": "uuid",
    "is_nullable": "NO"
  },
  {
    "table_name": "template_fields",
    "column_name": "template_id",
    "data_type": "uuid",
    "is_nullable": "NO"
  },
  {
    "table_name": "template_fields",
    "column_name": "field_name",
    "data_type": "text",
    "is_nullable": "NO"
  },
  {
    "table_name": "template_fields",
    "column_name": "field_type",
    "data_type": "text",
    "is_nullable": "NO"
  },
  {
    "table_name": "template_fields",
    "column_name": "description",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "template_fields",
    "column_name": "is_required",
    "data_type": "boolean",
    "is_nullable": "YES"
  },
  {
    "table_name": "template_fields",
    "column_name": "sort_order",
    "data_type": "integer",
    "is_nullable": "YES"
  },
  {
    "table_name": "template_fields",
    "column_name": "picklist_values",
    "data_type": "ARRAY",
    "is_nullable": "YES"
  },
  {
    "table_name": "template_fields",
    "column_name": "validation_rules",
    "data_type": "jsonb",
    "is_nullable": "YES"
  },
  {
    "table_name": "template_fields",
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "transcript_utterances",
    "column_name": "id",
    "data_type": "uuid",
    "is_nullable": "NO"
  },
  {
    "table_name": "transcript_utterances",
    "column_name": "transcript_id",
    "data_type": "uuid",
    "is_nullable": "NO"
  },
  {
    "table_name": "transcript_utterances",
    "column_name": "speaker",
    "data_type": "text",
    "is_nullable": "NO"
  },
  {
    "table_name": "transcript_utterances",
    "column_name": "text",
    "data_type": "text",
    "is_nullable": "NO"
  },
  {
    "table_name": "transcript_utterances",
    "column_name": "start_time",
    "data_type": "numeric",
    "is_nullable": "YES"
  },
  {
    "table_name": "transcript_utterances",
    "column_name": "end_time",
    "data_type": "numeric",
    "is_nullable": "YES"
  },
  {
    "table_name": "transcript_utterances",
    "column_name": "confidence",
    "data_type": "numeric",
    "is_nullable": "YES"
  },
  {
    "table_name": "transcript_utterances",
    "column_name": "sentiment",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "transcript_utterances",
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "transcripts",
    "column_name": "id",
    "data_type": "uuid",
    "is_nullable": "NO"
  },
  {
    "table_name": "transcripts",
    "column_name": "call_id",
    "data_type": "uuid",
    "is_nullable": "NO"
  },
  {
    "table_name": "transcripts",
    "column_name": "full_text",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "transcripts",
    "column_name": "language_code",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "transcripts",
    "column_name": "confidence_score",
    "data_type": "numeric",
    "is_nullable": "YES"
  },
  {
    "table_name": "transcripts",
    "column_name": "word_count",
    "data_type": "integer",
    "is_nullable": "YES"
  },
  {
    "table_name": "transcripts",
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "transcripts",
    "column_name": "assemblyai_id",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "transcripts",
    "column_name": "text",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "transcripts",
    "column_name": "utterances",
    "data_type": "jsonb",
    "is_nullable": "YES"
  },
  {
    "table_name": "transcripts",
    "column_name": "words",
    "data_type": "jsonb",
    "is_nullable": "YES"
  },
  {
    "table_name": "transcripts",
    "column_name": "speaker_mapping",
    "data_type": "jsonb",
    "is_nullable": "YES"
  },
  {
    "table_name": "transcripts",
    "column_name": "speakers_count",
    "data_type": "integer",
    "is_nullable": "YES"
  },
  {
    "table_name": "transcripts",
    "column_name": "audio_duration",
    "data_type": "numeric",
    "is_nullable": "YES"
  },
  {
    "table_name": "twilio_calls",
    "column_name": "id",
    "data_type": "uuid",
    "is_nullable": "NO"
  },
  {
    "table_name": "twilio_calls",
    "column_name": "call_id",
    "data_type": "uuid",
    "is_nullable": "YES"
  },
  {
    "table_name": "twilio_calls",
    "column_name": "organization_id",
    "data_type": "uuid",
    "is_nullable": "YES"
  },
  {
    "table_name": "twilio_calls",
    "column_name": "twilio_call_sid",
    "data_type": "text",
    "is_nullable": "NO"
  },
  {
    "table_name": "twilio_calls",
    "column_name": "twilio_recording_sid",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "twilio_calls",
    "column_name": "from_number",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "twilio_calls",
    "column_name": "to_number",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "twilio_calls",
    "column_name": "direction",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "twilio_calls",
    "column_name": "status",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "twilio_calls",
    "column_name": "duration",
    "data_type": "integer",
    "is_nullable": "YES"
  },
  {
    "table_name": "twilio_calls",
    "column_name": "recording_url",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "twilio_calls",
    "column_name": "recording_duration",
    "data_type": "integer",
    "is_nullable": "YES"
  },
  {
    "table_name": "twilio_calls",
    "column_name": "price",
    "data_type": "numeric",
    "is_nullable": "YES"
  },
  {
    "table_name": "twilio_calls",
    "column_name": "price_unit",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "twilio_calls",
    "column_name": "answered_by",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "twilio_calls",
    "column_name": "forwarded_from",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "twilio_calls",
    "column_name": "caller_name",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "twilio_calls",
    "column_name": "raw_webhook_data",
    "data_type": "jsonb",
    "is_nullable": "YES"
  },
  {
    "table_name": "twilio_calls",
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "twilio_calls",
    "column_name": "updated_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "twilio_calls",
    "column_name": "recording_disclosure_played",
    "data_type": "boolean",
    "is_nullable": "YES"
  },
  {
    "table_name": "twilio_calls",
    "column_name": "caller_state",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "twilio_calls",
    "column_name": "is_two_party_consent_state",
    "data_type": "boolean",
    "is_nullable": "YES"
  },
  {
    "table_name": "twilio_phone_numbers",
    "column_name": "id",
    "data_type": "uuid",
    "is_nullable": "NO"
  },
  {
    "table_name": "twilio_phone_numbers",
    "column_name": "organization_id",
    "data_type": "uuid",
    "is_nullable": "NO"
  },
  {
    "table_name": "twilio_phone_numbers",
    "column_name": "phone_number",
    "data_type": "text",
    "is_nullable": "NO"
  },
  {
    "table_name": "twilio_phone_numbers",
    "column_name": "friendly_name",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "twilio_phone_numbers",
    "column_name": "phone_number_sid",
    "data_type": "text",
    "is_nullable": "NO"
  },
  {
    "table_name": "twilio_phone_numbers",
    "column_name": "assignment_type",
    "data_type": "text",
    "is_nullable": "NO"
  },
  {
    "table_name": "twilio_phone_numbers",
    "column_name": "assigned_to",
    "data_type": "uuid",
    "is_nullable": "YES"
  },
  {
    "table_name": "twilio_phone_numbers",
    "column_name": "assigned_by",
    "data_type": "uuid",
    "is_nullable": "NO"
  },
  {
    "table_name": "twilio_phone_numbers",
    "column_name": "assigned_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "twilio_phone_numbers",
    "column_name": "status",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "twilio_phone_numbers",
    "column_name": "voice_url",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "twilio_phone_numbers",
    "column_name": "voice_method",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "twilio_phone_numbers",
    "column_name": "sms_url",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "twilio_phone_numbers",
    "column_name": "sms_method",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "twilio_phone_numbers",
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "twilio_phone_numbers",
    "column_name": "updated_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "twilio_phone_numbers",
    "column_name": "deleted_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "twilio_usage",
    "column_name": "id",
    "data_type": "uuid",
    "is_nullable": "NO"
  },
  {
    "table_name": "twilio_usage",
    "column_name": "organization_id",
    "data_type": "uuid",
    "is_nullable": "YES"
  },
  {
    "table_name": "twilio_usage",
    "column_name": "month",
    "data_type": "text",
    "is_nullable": "NO"
  },
  {
    "table_name": "twilio_usage",
    "column_name": "voice_minutes",
    "data_type": "integer",
    "is_nullable": "YES"
  },
  {
    "table_name": "twilio_usage",
    "column_name": "recording_minutes",
    "data_type": "integer",
    "is_nullable": "YES"
  },
  {
    "table_name": "twilio_usage",
    "column_name": "transcription_minutes",
    "data_type": "integer",
    "is_nullable": "YES"
  },
  {
    "table_name": "twilio_usage",
    "column_name": "sms_count",
    "data_type": "integer",
    "is_nullable": "YES"
  },
  {
    "table_name": "twilio_usage",
    "column_name": "phone_numbers_count",
    "data_type": "integer",
    "is_nullable": "YES"
  },
  {
    "table_name": "twilio_usage",
    "column_name": "estimated_cost",
    "data_type": "numeric",
    "is_nullable": "YES"
  },
  {
    "table_name": "twilio_usage",
    "column_name": "actual_cost",
    "data_type": "numeric",
    "is_nullable": "YES"
  },
  {
    "table_name": "twilio_usage",
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "twilio_usage",
    "column_name": "updated_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "usage_billing",
    "column_name": "id",
    "data_type": "uuid",
    "is_nullable": "NO"
  },
  {
    "table_name": "usage_billing",
    "column_name": "organization_id",
    "data_type": "uuid",
    "is_nullable": "NO"
  },
  {
    "table_name": "usage_billing",
    "column_name": "billing_period_start",
    "data_type": "timestamp with time zone",
    "is_nullable": "NO"
  },
  {
    "table_name": "usage_billing",
    "column_name": "billing_period_end",
    "data_type": "timestamp with time zone",
    "is_nullable": "NO"
  },
  {
    "table_name": "usage_billing",
    "column_name": "minutes_included",
    "data_type": "integer",
    "is_nullable": "NO"
  },
  {
    "table_name": "usage_billing",
    "column_name": "minutes_used",
    "data_type": "integer",
    "is_nullable": "NO"
  },
  {
    "table_name": "usage_billing",
    "column_name": "overage_minutes",
    "data_type": "integer",
    "is_nullable": "YES"
  },
  {
    "table_name": "usage_billing",
    "column_name": "overage_cost",
    "data_type": "integer",
    "is_nullable": "YES"
  },
  {
    "table_name": "usage_billing",
    "column_name": "billed",
    "data_type": "boolean",
    "is_nullable": "YES"
  },
  {
    "table_name": "usage_billing",
    "column_name": "billed_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "usage_billing",
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "NO"
  },
  {
    "table_name": "usage_logs",
    "column_name": "id",
    "data_type": "uuid",
    "is_nullable": "NO"
  },
  {
    "table_name": "usage_logs",
    "column_name": "organization_id",
    "data_type": "uuid",
    "is_nullable": "NO"
  },
  {
    "table_name": "usage_logs",
    "column_name": "user_id",
    "data_type": "uuid",
    "is_nullable": "NO"
  },
  {
    "table_name": "usage_logs",
    "column_name": "call_id",
    "data_type": "uuid",
    "is_nullable": "YES"
  },
  {
    "table_name": "usage_logs",
    "column_name": "minutes_used",
    "data_type": "integer",
    "is_nullable": "NO"
  },
  {
    "table_name": "usage_logs",
    "column_name": "is_overage",
    "data_type": "boolean",
    "is_nullable": "YES"
  },
  {
    "table_name": "usage_logs",
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "NO"
  },
  {
    "table_name": "usage_logs",
    "column_name": "month_year",
    "data_type": "text",
    "is_nullable": "NO"
  },
  {
    "table_name": "usage_metrics",
    "column_name": "id",
    "data_type": "uuid",
    "is_nullable": "NO"
  },
  {
    "table_name": "usage_metrics",
    "column_name": "organization_id",
    "data_type": "uuid",
    "is_nullable": "NO"
  },
  {
    "table_name": "usage_metrics",
    "column_name": "user_id",
    "data_type": "uuid",
    "is_nullable": "YES"
  },
  {
    "table_name": "usage_metrics",
    "column_name": "metric_type",
    "data_type": "text",
    "is_nullable": "NO"
  },
  {
    "table_name": "usage_metrics",
    "column_name": "metric_value",
    "data_type": "numeric",
    "is_nullable": "NO"
  },
  {
    "table_name": "usage_metrics",
    "column_name": "cost_cents",
    "data_type": "integer",
    "is_nullable": "YES"
  },
  {
    "table_name": "usage_metrics",
    "column_name": "metadata",
    "data_type": "jsonb",
    "is_nullable": "YES"
  },
  {
    "table_name": "usage_metrics",
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "usage_metrics",
    "column_name": "phone_number_id",
    "data_type": "uuid",
    "is_nullable": "YES"
  },
  {
    "table_name": "user_corrections",
    "column_name": "id",
    "data_type": "uuid",
    "is_nullable": "NO"
  },
  {
    "table_name": "user_corrections",
    "column_name": "call_id",
    "data_type": "uuid",
    "is_nullable": "NO"
  },
  {
    "table_name": "user_corrections",
    "column_name": "organization_id",
    "data_type": "uuid",
    "is_nullable": "NO"
  },
  {
    "table_name": "user_corrections",
    "column_name": "field_name",
    "data_type": "text",
    "is_nullable": "NO"
  },
  {
    "table_name": "user_corrections",
    "column_name": "original_value",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "user_corrections",
    "column_name": "corrected_value",
    "data_type": "text",
    "is_nullable": "NO"
  },
  {
    "table_name": "user_corrections",
    "column_name": "correction_type",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "user_corrections",
    "column_name": "user_feedback",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "user_corrections",
    "column_name": "corrected_by",
    "data_type": "uuid",
    "is_nullable": "NO"
  },
  {
    "table_name": "user_corrections",
    "column_name": "corrected_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "user_corrections",
    "column_name": "confidence_score",
    "data_type": "numeric",
    "is_nullable": "YES"
  },
  {
    "table_name": "user_corrections",
    "column_name": "correction_applied",
    "data_type": "boolean",
    "is_nullable": "YES"
  },
  {
    "table_name": "user_corrections",
    "column_name": "metadata",
    "data_type": "jsonb",
    "is_nullable": "YES"
  },
  {
    "table_name": "user_organizations",
    "column_name": "id",
    "data_type": "uuid",
    "is_nullable": "NO"
  },
  {
    "table_name": "user_organizations",
    "column_name": "user_id",
    "data_type": "uuid",
    "is_nullable": "NO"
  },
  {
    "table_name": "user_organizations",
    "column_name": "organization_id",
    "data_type": "uuid",
    "is_nullable": "NO"
  },
  {
    "table_name": "user_organizations",
    "column_name": "role",
    "data_type": "text",
    "is_nullable": "NO"
  },
  {
    "table_name": "user_organizations",
    "column_name": "joined_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "user_organizations",
    "column_name": "invited_by",
    "data_type": "uuid",
    "is_nullable": "YES"
  },
  {
    "table_name": "user_preferences",
    "column_name": "id",
    "data_type": "uuid",
    "is_nullable": "NO"
  },
  {
    "table_name": "user_preferences",
    "column_name": "user_id",
    "data_type": "uuid",
    "is_nullable": "NO"
  },
  {
    "table_name": "user_preferences",
    "column_name": "auto_transcribe",
    "data_type": "boolean",
    "is_nullable": "YES"
  },
  {
    "table_name": "user_preferences",
    "column_name": "email_on_transcription_complete",
    "data_type": "boolean",
    "is_nullable": "YES"
  },
  {
    "table_name": "user_preferences",
    "column_name": "email_on_extraction_complete",
    "data_type": "boolean",
    "is_nullable": "YES"
  },
  {
    "table_name": "user_preferences",
    "column_name": "email_on_review_needed",
    "data_type": "boolean",
    "is_nullable": "YES"
  },
  {
    "table_name": "user_preferences",
    "column_name": "default_view",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "user_preferences",
    "column_name": "calls_per_page",
    "data_type": "integer",
    "is_nullable": "YES"
  },
  {
    "table_name": "user_preferences",
    "column_name": "show_quick_insights",
    "data_type": "boolean",
    "is_nullable": "YES"
  },
  {
    "table_name": "user_preferences",
    "column_name": "show_sentiment_analysis",
    "data_type": "boolean",
    "is_nullable": "YES"
  },
  {
    "table_name": "user_preferences",
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "user_preferences",
    "column_name": "updated_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "validation_results",
    "column_name": "id",
    "data_type": "uuid",
    "is_nullable": "NO"
  },
  {
    "table_name": "validation_results",
    "column_name": "call_id",
    "data_type": "uuid",
    "is_nullable": "NO"
  },
  {
    "table_name": "validation_results",
    "column_name": "organization_id",
    "data_type": "uuid",
    "is_nullable": "NO"
  },
  {
    "table_name": "validation_results",
    "column_name": "is_valid",
    "data_type": "boolean",
    "is_nullable": "NO"
  },
  {
    "table_name": "validation_results",
    "column_name": "validation_score",
    "data_type": "numeric",
    "is_nullable": "YES"
  },
  {
    "table_name": "validation_results",
    "column_name": "completeness_score",
    "data_type": "numeric",
    "is_nullable": "YES"
  },
  {
    "table_name": "validation_results",
    "column_name": "issues",
    "data_type": "jsonb",
    "is_nullable": "YES"
  },
  {
    "table_name": "validation_results",
    "column_name": "critical_issues_count",
    "data_type": "integer",
    "is_nullable": "YES"
  },
  {
    "table_name": "validation_results",
    "column_name": "major_issues_count",
    "data_type": "integer",
    "is_nullable": "YES"
  },
  {
    "table_name": "validation_results",
    "column_name": "minor_issues_count",
    "data_type": "integer",
    "is_nullable": "YES"
  },
  {
    "table_name": "validation_results",
    "column_name": "cross_agent_conflicts",
    "data_type": "jsonb",
    "is_nullable": "YES"
  },
  {
    "table_name": "validation_results",
    "column_name": "data_consistency_score",
    "data_type": "numeric",
    "is_nullable": "YES"
  },
  {
    "table_name": "validation_results",
    "column_name": "recommendations",
    "data_type": "jsonb",
    "is_nullable": "YES"
  },
  {
    "table_name": "validation_results",
    "column_name": "manual_review_required",
    "data_type": "boolean",
    "is_nullable": "YES"
  },
  {
    "table_name": "validation_results",
    "column_name": "review_reason",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "validation_results",
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  }
]