terraform {
  required_version = ">= 1.5.0"

  required_providers {
    railway = {
      source  = "terraform-community-providers/railway"
      version = "~> 0.3.0"
    }
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.5"
    }
  }

  backend "s3" {
    bucket = "wcagai-terraform-state"
    key    = "production/terraform.tfstate"
    region = "us-east-1"
    encrypt = true
  }
}

provider "aws" {
  region = var.aws_region
}

provider "railway" {
  token = var.railway_token
}

# ========================================
# Variables
# ========================================

variable "aws_region" {
  description = "AWS region for resources"
  type        = string
  default     = "us-east-1"
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
  description = "Sentry DSN for error tracking"
  type        = string
  sensitive   = true
}

variable "launchdarkly_sdk_key" {
  description = "LaunchDarkly SDK key"
  type        = string
  sensitive   = true
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "production"
}

# ========================================
# Random Resources
# ========================================

resource "random_password" "db_password" {
  length  = 32
  special = true
}

resource "random_password" "jwt_secret" {
  length  = 64
  special = false
}

# ========================================
# Railway Project
# ========================================

resource "railway_project" "wcagaii" {
  name        = "wcagaii-${var.environment}"
  description = "WCAG AI Platform - Production Infrastructure"
}

# PostgreSQL Database
resource "railway_service" "postgres" {
  name       = "wcagaii-postgres"
  project_id = railway_project.wcagaii.id

  source = {
    image = "postgres:16-alpine"
  }

  variables = {
    POSTGRES_DB       = "wcagaii"
    POSTGRES_USER     = "wcagaii"
    POSTGRES_PASSWORD = random_password.db_password.result
    PGDATA            = "/var/lib/postgresql/data/pgdata"
  }

  volumes = [
    {
      mount_path = "/var/lib/postgresql/data"
      size       = 10 # GB
    }
  ]
}

# Redis Cache & Queue
resource "railway_service" "redis" {
  name       = "wcagaii-redis"
  project_id = railway_project.wcagaii.id

  source = {
    image = "redis:7-alpine"
  }

  variables = {
    REDIS_ARGS = "--maxmemory 256mb --maxmemory-policy allkeys-lru"
  }
}

# Backend API Service
resource "railway_service" "backend" {
  name       = "wcagaii-backend"
  project_id = railway_project.wcagaii.id

  source = {
    repo   = "aaj441/wcag-ai-platform"
    branch = "main"
    path   = "packages/api"
  }

  variables = {
    NODE_ENV              = "production"
    PORT                  = "8080"
    DATABASE_URL          = "postgresql://wcagaii:${random_password.db_password.result}@${railway_service.postgres.private_domain}:5432/wcagaii"
    REDIS_URL             = "redis://${railway_service.redis.private_domain}:6379"
    OPENAI_API_KEY        = var.openai_api_key
    SENTRY_DSN            = var.sentry_dsn
    LAUNCHDARKLY_SDK_KEY  = var.launchdarkly_sdk_key
    JWT_SECRET            = random_password.jwt_secret.result
    MIN_POOL_SIZE         = "2"
    MAX_POOL_SIZE         = "5"
    SCAN_TIMEOUT          = "30000"
    API_RATE_LIMIT        = "100"
    AUDIT_LOG_BUCKET      = aws_s3_bucket.audit_logs.id
  }

  healthcheck = {
    path     = "/health"
    interval = 30
    timeout  = 10
  }

  autoscaling = {
    enabled     = true
    min_replicas = 1
    max_replicas = 5
    target_cpu   = 70
  }
}

# Frontend Web App Service
resource "railway_service" "frontend" {
  name       = "wcagaii-frontend"
  project_id = railway_project.wcagaii.id

  source = {
    repo   = "aaj441/wcag-ai-platform"
    branch = "main"
    path   = "packages/webapp"
  }

  variables = {
    NODE_ENV                 = "production"
    PORT                     = "3000"
    VITE_API_BASE_URL        = "https://${railway_service.backend.public_domain}"
    VITE_SENTRY_DSN          = var.sentry_dsn
    VITE_ENVIRONMENT         = var.environment
  }

  healthcheck = {
    path     = "/"
    interval = 30
    timeout  = 5
  }
}

# ========================================
# AWS Resources
# ========================================

# S3 Bucket for Audit Logs (7-year retention for compliance)
resource "aws_s3_bucket" "audit_logs" {
  bucket = "wcagai-audit-logs-${var.environment}"

  tags = {
    Name        = "WCAG AI Audit Logs"
    Environment = var.environment
    Compliance  = "SOC2"
  }
}

resource "aws_s3_bucket_versioning" "audit_logs" {
  bucket = aws_s3_bucket.audit_logs.id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "audit_logs" {
  bucket = aws_s3_bucket.audit_logs.id

  rule {
    id     = "archive-old-logs"
    status = "Enabled"

    transition {
      days          = 90
      storage_class = "GLACIER_IR"
    }

    transition {
      days          = 365
      storage_class = "DEEP_ARCHIVE"
    }

    expiration {
      days = 2555 # 7 years
    }
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "audit_logs" {
  bucket = aws_s3_bucket.audit_logs.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm     = "aws:kms"
      kms_master_key_id = aws_kms_key.audit_logs.arn
    }
  }
}

# KMS Key for Encryption
resource "aws_kms_key" "audit_logs" {
  description             = "KMS key for WCAG AI audit logs encryption"
  deletion_window_in_days = 30
  enable_key_rotation     = true

  tags = {
    Name        = "wcagai-audit-logs-key"
    Environment = var.environment
  }
}

resource "aws_kms_alias" "audit_logs" {
  name          = "alias/wcagai-audit-logs-${var.environment}"
  target_key_id = aws_kms_key.audit_logs.key_id
}

# S3 Bucket for Scan Results
resource "aws_s3_bucket" "scan_results" {
  bucket = "wcagai-scan-results-${var.environment}"

  tags = {
    Name        = "WCAG AI Scan Results"
    Environment = var.environment
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "scan_results" {
  bucket = aws_s3_bucket.scan_results.id

  rule {
    id     = "expire-old-scans"
    status = "Enabled"

    expiration {
      days = 90
    }
  }
}

# IAM Role for Backend Service
resource "aws_iam_role" "backend_service" {
  name = "wcagai-backend-${var.environment}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy" "backend_s3_access" {
  name = "s3-access"
  role = aws_iam_role.backend_service.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:PutObject",
          "s3:GetObject",
          "s3:ListBucket"
        ]
        Resource = [
          aws_s3_bucket.audit_logs.arn,
          "${aws_s3_bucket.audit_logs.arn}/*",
          aws_s3_bucket.scan_results.arn,
          "${aws_s3_bucket.scan_results.arn}/*"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "kms:Decrypt",
          "kms:GenerateDataKey"
        ]
        Resource = [aws_kms_key.audit_logs.arn]
      }
    ]
  })
}

# CloudWatch Log Group
resource "aws_cloudwatch_log_group" "backend" {
  name              = "/wcagai/${var.environment}/backend"
  retention_in_days = 30

  tags = {
    Environment = var.environment
  }
}

# ========================================
# Outputs
# ========================================

output "backend_url" {
  description = "Backend API URL"
  value       = "https://${railway_service.backend.public_domain}"
}

output "frontend_url" {
  description = "Frontend Web App URL"
  value       = "https://${railway_service.frontend.public_domain}"
}

output "database_url" {
  description = "PostgreSQL connection string"
  value       = "postgresql://wcagaii:${random_password.db_password.result}@${railway_service.postgres.private_domain}:5432/wcagaii"
  sensitive   = true
}

output "redis_url" {
  description = "Redis connection string"
  value       = "redis://${railway_service.redis.private_domain}:6379"
  sensitive   = true
}

output "audit_log_bucket" {
  description = "S3 bucket for audit logs"
  value       = aws_s3_bucket.audit_logs.id
}

output "scan_results_bucket" {
  description = "S3 bucket for scan results"
  value       = aws_s3_bucket.scan_results.id
}
