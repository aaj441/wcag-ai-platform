#!/bin/bash
###############################################################################
# Developer Onboarding Simulator
# 
# Measures Mean-Time-To-First-Fix (MTTF) for new engineers and provides
# automated onboarding experience with guided challenges.
#
# Usage: ./onboarding-simulator.sh [developer_name]
###############################################################################

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m' # No Color

# Configuration
DEVELOPER_NAME="${1:-NewDeveloper}"
SESSION_ID="onboarding_$(date +%Y%m%d_%H%M%S)"
LOG_FILE="/tmp/onboarding_${SESSION_ID}.log"
METRICS_FILE="/tmp/onboarding_metrics_${SESSION_ID}.json"
START_TIME=$(date +%s)

# Metrics tracking
CHALLENGES_COMPLETED=0
CHALLENGES_TOTAL=10
HINTS_USED=0
TIME_PER_CHALLENGE=()

###############################################################################
# Helper functions
###############################################################################

log() {
    echo -e "${BLUE}[INFO]${NC} $*" | tee -a "$LOG_FILE"
}

log_success() {
    echo -e "${GREEN}[✓]${NC} $*" | tee -a "$LOG_FILE"
}

log_error() {
    echo -e "${RED}[✗]${NC} $*" | tee -a "$LOG_FILE"
}

log_challenge() {
    echo -e "${MAGENTA}[CHALLENGE]${NC} $*" | tee -a "$LOG_FILE"
}

log_hint() {
    echo -e "${YELLOW}[HINT]${NC} $*" | tee -a "$LOG_FILE"
    HINTS_USED=$((HINTS_USED + 1))
}

show_banner() {
    clear
    echo -e "${CYAN}"
    cat << "EOF"
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║        🚀 WCAG AI Platform - Developer Onboarding 🚀        ║
║                                                              ║
║     Welcome! This simulator will guide you through your     ║
║        first contribution while measuring your MTTF         ║
║           (Mean-Time-To-First-Fix) metrics.                 ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
EOF
    echo -e "${NC}"
    echo
    log "Developer: $DEVELOPER_NAME"
    log "Session ID: $SESSION_ID"
    echo
}

wait_for_key() {
    echo -e "${CYAN}Press Enter to continue...${NC}"
    read -r
}

start_challenge() {
    local challenge_num=$1
    local challenge_name=$2
    
    CHALLENGE_START_TIME=$(date +%s)
    
    echo
    echo -e "${MAGENTA}╔════════════════════════════════════════════════════╗${NC}"
    echo -e "${MAGENTA}║  Challenge $challenge_num/$CHALLENGES_TOTAL: $challenge_name"
    echo -e "${MAGENTA}╚════════════════════════════════════════════════════╝${NC}"
    echo
}

complete_challenge() {
    local challenge_num=$1
    
    CHALLENGE_END_TIME=$(date +%s)
    local duration=$((CHALLENGE_END_TIME - CHALLENGE_START_TIME))
    TIME_PER_CHALLENGE+=($duration)
    CHALLENGES_COMPLETED=$((CHALLENGES_COMPLETED + 1))
    
    log_success "Challenge completed in ${duration}s"
    echo
}

offer_hint() {
    echo -e "${YELLOW}Would you like a hint? (y/n)${NC}"
    read -r response
    if [[ "$response" =~ ^[Yy]$ ]]; then
        return 0
    else
        return 1
    fi
}

###############################################################################
# Challenge implementations
###############################################################################

challenge_1_environment_setup() {
    start_challenge 1 "Environment Setup"
    
    log_challenge "Set up your local development environment"
    echo "1. Clone the repository (already done)"
    echo "2. Install dependencies for the API package"
    echo
    
    log "Checking if dependencies are installed..."
    
    if [ ! -d "packages/api/node_modules" ]; then
        log "Dependencies not found. Let's install them!"
        echo "$ cd packages/api && npm install"
        
        if offer_hint; then
            log_hint "Run: cd packages/api && npm install"
        fi
        
        wait_for_key
        
        cd packages/api
        npm install --silent > /dev/null 2>&1
        cd ../..
    fi
    
    log_success "Dependencies installed!"
    complete_challenge 1
}

challenge_2_understanding_architecture() {
    start_challenge 2 "Understanding Architecture"
    
    log_challenge "Explore the codebase structure"
    echo
    echo "The platform has the following structure:"
    echo "  • packages/api     - Backend REST API"
    echo "  • packages/webapp  - Frontend dashboard"
    echo "  • backend/         - New production services"
    echo "  • scripts/         - Automation scripts"
    echo
    
    log "Task: Find how many routes are defined in packages/api/src/routes/"
    
    if offer_hint; then
        log_hint "Use: ls packages/api/src/routes/*.ts | wc -l"
    fi
    
    wait_for_key
    
    local route_count=$(find packages/api/src/routes -name "*.ts" 2>/dev/null | wc -l)
    log_success "Found $route_count route files"
    
    complete_challenge 2
}

challenge_3_first_code_change() {
    start_challenge 3 "First Code Change"
    
    log_challenge "Make your first code change"
    echo
    echo "Task: Add a new health check endpoint property"
    echo "File: packages/api/src/server.ts"
    echo "Add a 'version' field to the health check response"
    echo
    
    if offer_hint; then
        log_hint "Look for the /health endpoint and add: version: '1.0.0'"
    fi
    
    wait_for_key
    
    # Simulate making the change
    log "Making the change..."
    log_success "Added version field to health check"
    
    complete_challenge 3
}

challenge_4_running_tests() {
    start_challenge 4 "Running Tests"
    
    log_challenge "Run the test suite"
    echo
    echo "Task: Check if the API tests pass"
    echo
    
    if offer_hint; then
        log_hint "Run: cd packages/api && npm test"
    fi
    
    wait_for_key
    
    log "Running tests (simulated)..."
    sleep 2
    log_success "Tests passed!"
    
    complete_challenge 4
}

challenge_5_understanding_services() {
    start_challenge 5 "Understanding Production Services"
    
    log_challenge "Explore the new production services"
    echo
    echo "Review these production-grade services:"
    echo "  • backend/src/services/workerIdentity.js   - Worker attestation"
    echo "  • backend/src/services/costController.js   - Cost tracking"
    echo "  • backend/src/services/replayEngine.js     - State replay"
    echo
    
    log "Task: Identify which service handles budget overruns"
    
    if offer_hint; then
        log_hint "Check backend/src/services/costController.js"
    fi
    
    wait_for_key
    
    log_success "Cost Controller handles budget overruns with a kill-switch!"
    
    complete_challenge 5
}

challenge_6_bug_fixing() {
    start_challenge 6 "Bug Fixing"
    
    log_challenge "Fix a simulated bug"
    echo
    echo "Bug Report: Worker attestation fails when worker ID contains spaces"
    echo "File: backend/src/services/workerIdentity.js"
    echo "Task: Identify where worker IDs should be validated"
    echo
    
    if offer_hint; then
        log_hint "Look at the registerWorker() method"
        log_hint "Add validation to sanitize worker IDs"
    fi
    
    wait_for_key
    
    log "Identifying the issue..."
    sleep 1
    log_success "Found it! Worker IDs need sanitization in registerWorker()"
    
    complete_challenge 6
}

challenge_7_adding_feature() {
    start_challenge 7 "Adding a Feature"
    
    log_challenge "Add a new feature"
    echo
    echo "Feature Request: Add a method to get cost statistics per model"
    echo "File: backend/src/services/costController.js"
    echo "Task: Design the method signature"
    echo
    
    if offer_hint; then
        log_hint "Method name: getModelCostStats(modelName)"
        log_hint "Return: { model, totalCost, requestCount, avgCost }"
    fi
    
    wait_for_key
    
    log "Designing the feature..."
    log_success "Feature designed: getModelCostStats(modelName)"
    
    complete_challenge 7
}

challenge_8_documentation() {
    start_challenge 8 "Documentation"
    
    log_challenge "Write documentation"
    echo
    echo "Task: Document the cost controller API"
    echo "Include: Purpose, usage examples, and configuration"
    echo
    
    if offer_hint; then
        log_hint "Check existing JSDoc comments in the file"
        log_hint "Follow the same pattern for consistency"
    fi
    
    wait_for_key
    
    log "Writing documentation..."
    log_success "Documentation completed!"
    
    complete_challenge 8
}

challenge_9_cicd_workflow() {
    start_challenge 9 "CI/CD Understanding"
    
    log_challenge "Understand the CI/CD pipeline"
    echo
    echo "Review: .github/workflows/production-deploy.yml"
    echo "Task: Identify the deployment stages"
    echo
    
    if offer_hint; then
        log_hint "Stages: Security Scan → Test → Build → Deploy Staging → Deploy Production"
    fi
    
    wait_for_key
    
    log_success "Understood! Pipeline has 5 main stages with automated rollback"
    
    complete_challenge 9
}

challenge_10_pull_request() {
    start_challenge 10 "Creating a Pull Request"
    
    log_challenge "Create your first Pull Request"
    echo
    echo "Task: Prepare a PR with your changes"
    echo "1. Commit your changes"
    echo "2. Push to your branch"
    echo "3. Create PR with proper description"
    echo
    
    if offer_hint; then
        log_hint "PR Title: 'feat: Add version to health check endpoint'"
        log_hint "Include: What changed, why, and how to test"
    fi
    
    wait_for_key
    
    log "Creating PR (simulated)..."
    log_success "PR created successfully!"
    
    complete_challenge 10
}

###############################################################################
# Metrics calculation and reporting
###############################################################################

calculate_metrics() {
    local end_time=$(date +%s)
    local total_duration=$((end_time - START_TIME))
    
    # Calculate average time per challenge
    local total_challenge_time=0
    for time in "${TIME_PER_CHALLENGE[@]}"; do
        total_challenge_time=$((total_challenge_time + time))
    done
    local avg_time_per_challenge=$((total_challenge_time / ${#TIME_PER_CHALLENGE[@]}))
    
    # Calculate MTTF (time to first successful fix - challenge 6)
    local mttf=${TIME_PER_CHALLENGE[5]:-0}  # Challenge 6 is first fix
    
    # Generate metrics JSON
    cat > "$METRICS_FILE" <<EOF
{
  "developer": "$DEVELOPER_NAME",
  "session_id": "$SESSION_ID",
  "timestamp": "$(date -Iseconds)",
  "metrics": {
    "total_duration_seconds": $total_duration,
    "challenges_completed": $CHALLENGES_COMPLETED,
    "challenges_total": $CHALLENGES_TOTAL,
    "completion_rate": $(echo "scale=2; $CHALLENGES_COMPLETED * 100 / $CHALLENGES_TOTAL" | bc),
    "mttf_seconds": $mttf,
    "avg_time_per_challenge": $avg_time_per_challenge,
    "hints_used": $HINTS_USED,
    "efficiency_score": $(echo "scale=2; 100 - ($HINTS_USED * 10)" | bc)
  },
  "time_per_challenge": [
$(IFS=,; echo "    ${TIME_PER_CHALLENGE[*]}" | sed 's/ /, /g')
  ]
}
EOF
}

show_final_report() {
    echo
    echo -e "${GREEN}╔══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║                                                              ║${NC}"
    echo -e "${GREEN}║              🎉 ONBOARDING COMPLETED! 🎉                     ║${NC}"
    echo -e "${GREEN}║                                                              ║${NC}"
    echo -e "${GREEN}╚══════════════════════════════════════════════════════════════╝${NC}"
    echo
    
    calculate_metrics
    
    local end_time=$(date +%s)
    local total_duration=$((end_time - START_TIME))
    local mttf=${TIME_PER_CHALLENGE[5]:-0}
    
    echo -e "${CYAN}📊 Performance Metrics:${NC}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo -e "Developer:              ${YELLOW}$DEVELOPER_NAME${NC}"
    echo -e "Challenges Completed:   ${GREEN}$CHALLENGES_COMPLETED/$CHALLENGES_TOTAL${NC}"
    echo -e "Total Time:             ${BLUE}$(($total_duration / 60))m $(($total_duration % 60))s${NC}"
    echo -e "MTTF (First Fix):       ${MAGENTA}$(($mttf / 60))m $(($mttf % 60))s${NC}"
    echo -e "Hints Used:             ${YELLOW}$HINTS_USED${NC}"
    
    # Calculate efficiency score
    local efficiency=$((100 - (HINTS_USED * 10)))
    if [ $efficiency -lt 0 ]; then efficiency=0; fi
    
    echo -e "Efficiency Score:       ${GREEN}${efficiency}/100${NC}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo
    
    # Performance rating
    if [ $mttf -lt 300 ]; then
        echo -e "${GREEN}🌟 Outstanding! You're a natural!${NC}"
    elif [ $mttf -lt 600 ]; then
        echo -e "${GREEN}✨ Great job! Above average performance!${NC}"
    elif [ $mttf -lt 900 ]; then
        echo -e "${YELLOW}👍 Good work! You're learning fast!${NC}"
    else
        echo -e "${YELLOW}💪 Keep practicing! You're making progress!${NC}"
    fi
    echo
    
    log "Metrics saved to: $METRICS_FILE"
    log "Session log saved to: $LOG_FILE"
    echo
    
    echo -e "${CYAN}📚 Next Steps:${NC}"
    echo "1. Review the codebase documentation"
    echo "2. Join the team Slack channel"
    echo "3. Pick up your first real issue from the backlog"
    echo "4. Schedule a 1-on-1 with your mentor"
    echo
    
    echo -e "${GREEN}Welcome to the team! 🚀${NC}"
    echo
}

###############################################################################
# Main execution
###############################################################################

main() {
    show_banner
    
    log "Starting onboarding simulation..."
    echo
    
    # Run all challenges
    challenge_1_environment_setup
    challenge_2_understanding_architecture
    challenge_3_first_code_change
    challenge_4_running_tests
    challenge_5_understanding_services
    challenge_6_bug_fixing
    challenge_7_adding_feature
    challenge_8_documentation
    challenge_9_cicd_workflow
    challenge_10_pull_request
    
    # Show final report
    show_final_report
}

# Run the simulator
main
