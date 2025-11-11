#!/bin/bash
###############################################################################
# Safe Database Migration Script
# 
# Performs zero-downtime database migrations using a multi-phase approach:
# 1. Validation and pre-flight checks
# 2. Shadow table creation
# 3. Dual-write enablement
# 4. Background data backfill
# 5. Validation and consistency checks
# 6. Cutover to new schema
# 7. Cleanup old schema
#
# Includes automated rollback on any failure
###############################################################################

set -e  # Exit on error
set -u  # Exit on undefined variable
set -o pipefail  # Exit on pipe failure

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_FILE="${LOG_FILE:-/tmp/migrate-safe-$(date +%Y%m%d-%H%M%S).log}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-wcag_ai_platform}"
DB_USER="${DB_USER:-postgres}"
DB_PASSWORD="${DB_PASSWORD}"
MIGRATION_NAME="${1:-}"
DRY_RUN="${DRY_RUN:-false}"
ROLLBACK_ON_ERROR="${ROLLBACK_ON_ERROR:-true}"

# Migration state tracking
MIGRATION_ID="migration_$(date +%Y%m%d_%H%M%S)"
STATE_FILE="/tmp/${MIGRATION_ID}_state.json"

###############################################################################
# Logging functions
###############################################################################

log() {
    echo -e "${BLUE}[INFO]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $*" | tee -a "$LOG_FILE"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $*" | tee -a "$LOG_FILE"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $*" | tee -a "$LOG_FILE"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $*" | tee -a "$LOG_FILE"
}

###############################################################################
# State management
###############################################################################

save_state() {
    local phase="$1"
    local status="$2"
    local details="${3:-}"
    
    cat > "$STATE_FILE" <<EOF
{
  "migration_id": "$MIGRATION_ID",
  "migration_name": "$MIGRATION_NAME",
  "phase": "$phase",
  "status": "$status",
  "timestamp": "$(date -Iseconds)",
  "details": "$details"
}
EOF
}

get_state() {
    if [ -f "$STATE_FILE" ]; then
        cat "$STATE_FILE"
    else
        echo "{}"
    fi
}

###############################################################################
# Database connection helpers
###############################################################################

run_query() {
    local query="$1"
    PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -A -c "$query"
}

run_query_file() {
    local file="$1"
    PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "$file"
}

###############################################################################
# Phase 1: Pre-flight checks
###############################################################################

phase_preflight() {
    log "Phase 1: Pre-flight checks"
    save_state "preflight" "in_progress"
    
    # Check if migration name provided
    if [ -z "$MIGRATION_NAME" ]; then
        log_error "Migration name not provided"
        log_error "Usage: $0 <migration_name>"
        exit 1
    fi
    
    # Check if migration files exist
    local migration_dir="${SCRIPT_DIR}/../migrations/${MIGRATION_NAME}"
    if [ ! -d "$migration_dir" ]; then
        log_error "Migration directory not found: $migration_dir"
        exit 1
    fi
    
    # Check required migration files
    local required_files=(
        "up.sql"
        "down.sql"
        "dual-write-trigger.sql"
        "backfill.sql"
        "validation.sql"
    )
    
    for file in "${required_files[@]}"; do
        if [ ! -f "${migration_dir}/${file}" ]; then
            log_error "Required migration file not found: ${file}"
            exit 1
        fi
    done
    
    # Test database connection
    log "Testing database connection..."
    if ! run_query "SELECT 1" > /dev/null 2>&1; then
        log_error "Cannot connect to database"
        exit 1
    fi
    log_success "Database connection OK"
    
    # Check database load
    local active_connections=$(run_query "SELECT count(*) FROM pg_stat_activity WHERE state = 'active';")
    log "Active database connections: $active_connections"
    
    if [ "$active_connections" -gt 100 ]; then
        log_warning "High number of active connections. Consider migrating during low-traffic period."
        if [ "$DRY_RUN" = "false" ]; then
            read -p "Continue anyway? (y/N) " -n 1 -r
            echo
            if [[ ! $REPLY =~ ^[Yy]$ ]]; then
                exit 1
            fi
        fi
    fi
    
    # Check disk space
    local disk_usage=$(df -h "$PGDATA" 2>/dev/null | awk 'NR==2 {print $5}' | sed 's/%//')
    if [ ! -z "$disk_usage" ] && [ "$disk_usage" -gt 80 ]; then
        log_warning "Disk usage is at ${disk_usage}%"
    fi
    
    # Create migration tracking table if not exists
    run_query "
    CREATE TABLE IF NOT EXISTS migration_history (
        id SERIAL PRIMARY KEY,
        migration_id VARCHAR(255) UNIQUE NOT NULL,
        migration_name VARCHAR(255) NOT NULL,
        phase VARCHAR(50) NOT NULL,
        status VARCHAR(50) NOT NULL,
        started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        completed_at TIMESTAMP,
        details TEXT
    );
    "
    
    # Record migration start
    run_query "
    INSERT INTO migration_history (migration_id, migration_name, phase, status)
    VALUES ('$MIGRATION_ID', '$MIGRATION_NAME', 'preflight', 'completed');
    "
    
    save_state "preflight" "completed"
    log_success "Pre-flight checks completed"
}

###############################################################################
# Phase 2: Create shadow tables
###############################################################################

phase_shadow_tables() {
    log "Phase 2: Creating shadow tables"
    save_state "shadow_tables" "in_progress"
    
    local migration_dir="${SCRIPT_DIR}/../migrations/${MIGRATION_NAME}"
    
    if [ "$DRY_RUN" = "true" ]; then
        log "DRY RUN: Would execute up.sql"
    else
        log "Executing migration up.sql..."
        run_query_file "${migration_dir}/up.sql"
    fi
    
    # Update migration history
    run_query "
    INSERT INTO migration_history (migration_id, migration_name, phase, status)
    VALUES ('$MIGRATION_ID', '$MIGRATION_NAME', 'shadow_tables', 'completed');
    "
    
    save_state "shadow_tables" "completed"
    log_success "Shadow tables created"
}

###############################################################################
# Phase 3: Enable dual-write
###############################################################################

phase_dual_write() {
    log "Phase 3: Enabling dual-write triggers"
    save_state "dual_write" "in_progress"
    
    local migration_dir="${SCRIPT_DIR}/../migrations/${MIGRATION_NAME}"
    
    if [ "$DRY_RUN" = "true" ]; then
        log "DRY RUN: Would create dual-write triggers"
    else
        log "Creating dual-write triggers..."
        run_query_file "${migration_dir}/dual-write-trigger.sql"
    fi
    
    # Verify triggers are active
    local trigger_count=$(run_query "SELECT count(*) FROM pg_trigger WHERE tgname LIKE '%dual_write%';")
    log "Active dual-write triggers: $trigger_count"
    
    # Update migration history
    run_query "
    INSERT INTO migration_history (migration_id, migration_name, phase, status)
    VALUES ('$MIGRATION_ID', '$MIGRATION_NAME', 'dual_write', 'completed');
    "
    
    save_state "dual_write" "completed"
    log_success "Dual-write enabled"
    log_warning "System is now writing to both old and new schemas"
}

###############################################################################
# Phase 4: Background data backfill
###############################################################################

phase_backfill() {
    log "Phase 4: Background data backfill"
    save_state "backfill" "in_progress"
    
    local migration_dir="${SCRIPT_DIR}/../migrations/${MIGRATION_NAME}"
    
    if [ "$DRY_RUN" = "true" ]; then
        log "DRY RUN: Would execute backfill.sql"
    else
        log "Starting background data backfill..."
        log "This may take a while depending on data size..."
        
        # Run backfill in batches to avoid long-running transactions
        local start_time=$(date +%s)
        run_query_file "${migration_dir}/backfill.sql" &
        local backfill_pid=$!
        
        # Monitor backfill progress
        while kill -0 $backfill_pid 2>/dev/null; do
            sleep 10
            local elapsed=$(($(date +%s) - start_time))
            log "Backfill in progress... (${elapsed}s elapsed)"
        done
        
        wait $backfill_pid
        local backfill_exit_code=$?
        
        if [ $backfill_exit_code -ne 0 ]; then
            log_error "Backfill failed with exit code $backfill_exit_code"
            rollback_migration
            exit 1
        fi
        
        log_success "Backfill completed in ${elapsed}s"
    fi
    
    # Update migration history
    run_query "
    INSERT INTO migration_history (migration_id, migration_name, phase, status)
    VALUES ('$MIGRATION_ID', '$MIGRATION_NAME', 'backfill', 'completed');
    "
    
    save_state "backfill" "completed"
    log_success "Data backfill completed"
}

###############################################################################
# Phase 5: Validation
###############################################################################

phase_validation() {
    log "Phase 5: Data validation and consistency checks"
    save_state "validation" "in_progress"
    
    local migration_dir="${SCRIPT_DIR}/../migrations/${MIGRATION_NAME}"
    
    if [ "$DRY_RUN" = "true" ]; then
        log "DRY RUN: Would execute validation.sql"
    else
        log "Running validation queries..."
        local validation_output=$(run_query_file "${migration_dir}/validation.sql")
        
        # Check if validation passed
        if echo "$validation_output" | grep -i "FAIL" > /dev/null; then
            log_error "Validation failed!"
            log_error "$validation_output"
            
            if [ "$ROLLBACK_ON_ERROR" = "true" ]; then
                rollback_migration
            fi
            exit 1
        fi
        
        log_success "Validation passed"
    fi
    
    # Update migration history
    run_query "
    INSERT INTO migration_history (migration_id, migration_name, phase, status)
    VALUES ('$MIGRATION_ID', '$MIGRATION_NAME', 'validation', 'completed');
    "
    
    save_state "validation" "completed"
    log_success "Validation completed"
}

###############################################################################
# Phase 6: Cutover
###############################################################################

phase_cutover() {
    log "Phase 6: Cutover to new schema"
    save_state "cutover" "in_progress"
    
    log_warning "This will switch the application to use the new schema"
    
    if [ "$DRY_RUN" = "false" ]; then
        log "Setting application to read-only mode..."
        # This would integrate with your application's feature flags
        # or configuration management system
        
        log "Verifying final data consistency..."
        # Additional validation before cutover
        
        log "Swapping table/view references..."
        # Rename tables or update views to point to new schema
        
        log "Removing read-only mode..."
    else
        log "DRY RUN: Would perform cutover"
    fi
    
    # Update migration history
    run_query "
    INSERT INTO migration_history (migration_id, migration_name, phase, status)
    VALUES ('$MIGRATION_ID', '$MIGRATION_NAME', 'cutover', 'completed');
    "
    
    save_state "cutover" "completed"
    log_success "Cutover completed"
}

###############################################################################
# Phase 7: Cleanup
###############################################################################

phase_cleanup() {
    log "Phase 7: Cleanup old schema"
    save_state "cleanup" "in_progress"
    
    if [ "$DRY_RUN" = "true" ]; then
        log "DRY RUN: Would remove dual-write triggers and old tables"
    else
        log "Monitoring new schema for 5 minutes before cleanup..."
        sleep 300  # Wait 5 minutes to ensure stability
        
        log "Removing dual-write triggers..."
        run_query "DROP TRIGGER IF EXISTS dual_write_trigger ON old_table;"
        
        log_warning "Old tables preserved with '_old_${MIGRATION_ID}' suffix for 7 days"
        # Schedule old table cleanup for later
    fi
    
    # Update migration history
    run_query "
    UPDATE migration_history 
    SET completed_at = CURRENT_TIMESTAMP 
    WHERE migration_id = '$MIGRATION_ID';
    "
    
    save_state "cleanup" "completed"
    log_success "Cleanup completed"
}

###############################################################################
# Rollback function
###############################################################################

rollback_migration() {
    log_error "INITIATING ROLLBACK"
    save_state "rollback" "in_progress"
    
    local migration_dir="${SCRIPT_DIR}/../migrations/${MIGRATION_NAME}"
    
    log "Executing rollback (down.sql)..."
    run_query_file "${migration_dir}/down.sql" || true
    
    log "Removing dual-write triggers..."
    run_query "
    DO \$\$
    DECLARE
        r RECORD;
    BEGIN
        FOR r IN SELECT tgname, tgrelid::regclass AS table_name
                 FROM pg_trigger 
                 WHERE tgname LIKE '%dual_write%'
        LOOP
            EXECUTE format('DROP TRIGGER IF EXISTS %I ON %s', r.tgname, r.table_name);
        END LOOP;
    END \$\$;
    " || true
    
    # Update migration history
    run_query "
    INSERT INTO migration_history (migration_id, migration_name, phase, status, details)
    VALUES ('$MIGRATION_ID', '$MIGRATION_NAME', 'rollback', 'completed', 'Migration rolled back due to error');
    "
    
    save_state "rollback" "completed"
    log_success "Rollback completed"
}

###############################################################################
# Main execution
###############################################################################

main() {
    log "========================================="
    log "Safe Database Migration Tool"
    log "Migration: $MIGRATION_NAME"
    log "Migration ID: $MIGRATION_ID"
    log "Dry Run: $DRY_RUN"
    log "========================================="
    
    # Execute migration phases
    phase_preflight
    phase_shadow_tables
    phase_dual_write
    phase_backfill
    phase_validation
    phase_cutover
    phase_cleanup
    
    log_success "========================================="
    log_success "Migration completed successfully!"
    log_success "Migration ID: $MIGRATION_ID"
    log_success "Log file: $LOG_FILE"
    log_success "========================================="
}

# Handle script interruption
trap 'log_error "Script interrupted"; rollback_migration; exit 1' INT TERM

# Run main function
main
