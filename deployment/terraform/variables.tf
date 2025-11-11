# ========================================
# WCAG AI Platform - Terraform Variables
# ========================================

variable "project_name" {
  description = "Project name"
  type        = string
  default     = "wcagai"
}

variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Environment (production, staging, development)"
  type        = string
  default     = "production"

  validation {
    condition     = contains(["production", "staging", "development"], var.environment)
    error_message = "Environment must be production, staging, or development."
  }
}

variable "railway_token" {
  description = "Railway API token"
  type        = string
  sensitive   = true
}

variable "openai_api_key" {
  description = "OpenAI API key"
  type        = string
  sensitive   = true
}

variable "sentry_dsn" {
  description = "Sentry DSN"
  type        = string
  sensitive   = true
}

variable "launchdarkly_sdk_key" {
  description = "LaunchDarkly SDK key"
  type        = string
  sensitive   = true
}

variable "backend_min_replicas" {
  description = "Minimum number of backend replicas"
  type        = number
  default     = 1
}

variable "backend_max_replicas" {
  description = "Maximum number of backend replicas"
  type        = number
  default     = 5
}

variable "db_pool_min" {
  description = "Minimum database connection pool size"
  type        = number
  default     = 2
}

variable "db_pool_max" {
  description = "Maximum database connection pool size"
  type        = number
  default     = 10
}

variable "scan_timeout_ms" {
  description = "Scan timeout in milliseconds"
  type        = number
  default     = 30000
}

variable "api_rate_limit" {
  description = "API rate limit (requests per 15 minutes)"
  type        = number
  default     = 100
}
