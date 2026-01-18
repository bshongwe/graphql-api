#!/bin/bash

# Health Check Script
# Monitors application health and sends alerts

set -euo pipefail

# Configuration
API_URL="${API_URL:-http://localhost:4000}"
HEALTH_ENDPOINT="${API_URL}/health"
METRICS_ENDPOINT="${API_URL}/metrics"
GRAPHQL_ENDPOINT="${API_URL}/graphql"
ALERT_WEBHOOK="${ALERT_WEBHOOK:-}"
CHECK_INTERVAL="${CHECK_INTERVAL:-60}"
FAIL_THRESHOLD="${FAIL_THRESHOLD:-3}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# State
CONSECUTIVE_FAILURES=0
LAST_STATUS="unknown"

log() {
    echo -e "[$(date +'%Y-%m-%d %H:%M:%S')] $1"
}

log_success() {
    log "${GREEN}✓${NC} $1"
}

log_error() {
    log "${RED}✗${NC} $1"
}

log_warning() {
    log "${YELLOW}⚠${NC} $1"
}

# Check HTTP endpoint health
check_http_health() {
    local endpoint=$1
    local response
    local http_code
    
    response=$(curl -s -w "\n%{http_code}" "$endpoint" || echo "000")
    http_code=$(echo "$response" | tail -n 1)
    
    if [ "$http_code" = "200" ]; then
        return 0
    else
        return 1
    fi
}

# Check GraphQL endpoint
check_graphql() {
    local query='{"query":"{ __typename }"}'
    local response
    
    response=$(curl -s -X POST "$GRAPHQL_ENDPOINT" \
        -H "Content-Type: application/json" \
        -d "$query")
    
    if echo "$response" | grep -q "__typename"; then
        return 0
    else
        return 1
    fi
}

# Check database connectivity
check_database() {
    local query='{"query":"{ __schema { queryType { name } } }"}'
    local response
    
    response=$(curl -s -X POST "$GRAPHQL_ENDPOINT" \
        -H "Content-Type: application/json" \
        -d "$query")
    
    if echo "$response" | grep -q "queryType"; then
        return 0
    else
        return 1
    fi
}

# Check metrics endpoint
check_metrics() {
    local response
    
    response=$(curl -s "$METRICS_ENDPOINT")
    
    if echo "$response" | grep -q "process_cpu_seconds_total"; then
        return 0
    else
        return 1
    fi
}

# Get response time
get_response_time() {
    local endpoint=$1
    local response_time
    
    response_time=$(curl -o /dev/null -s -w '%{time_total}' "$endpoint")
    echo "$response_time"
}

# Send alert
send_alert() {
    local message=$1
    local status=$2
    
    if [ -z "$ALERT_WEBHOOK" ]; then
        return
    fi
    
    local color="danger"
    if [ "$status" = "success" ]; then
        color="good"
    elif [ "$status" = "warning" ]; then
        color="warning"
    fi
    
    local payload=$(cat <<EOF
{
  "text": "Health Check Alert",
  "attachments": [{
    "color": "$color",
    "text": "$message",
    "ts": $(date +%s)
  }]
}
EOF
)
    
    curl -s -X POST "$ALERT_WEBHOOK" \
        -H "Content-Type: application/json" \
        -d "$payload" > /dev/null
}

# Run all health checks
run_health_checks() {
    local all_passed=true
    
    log "Running health checks..."
    
    # HTTP Health Check
    if check_http_health "$HEALTH_ENDPOINT"; then
        log_success "HTTP health check passed"
    else
        log_error "HTTP health check failed"
        all_passed=false
    fi
    
    # GraphQL Check
    if check_graphql; then
        log_success "GraphQL endpoint responding"
    else
        log_error "GraphQL endpoint not responding"
        all_passed=false
    fi
    
    # Database Check
    if check_database; then
        log_success "Database connection healthy"
    else
        log_error "Database connection failed"
        all_passed=false
    fi
    
    # Metrics Check
    if check_metrics; then
        log_success "Metrics endpoint accessible"
    else
        log_warning "Metrics endpoint not accessible"
    fi
    
    # Response Time
    local response_time=$(get_response_time "$HEALTH_ENDPOINT")
    log "Response time: ${response_time}s"
    
    # Alert on slow response (>2 seconds)
    if (( $(echo "$response_time > 2.0" | bc -l) )); then
        log_warning "Response time above threshold (>2s)"
        send_alert \
          "⚠️ Slow response time: ${response_time}s" \
          "warning"
    fi
    
    if [ "$all_passed" = true ]; then
        return 0
    else
        return 1
    fi
}

# Monitor continuously
monitor() {
    log "Starting health monitoring for $API_URL"
    log "Check interval: ${CHECK_INTERVAL}s"
    log "Failure threshold: $FAIL_THRESHOLD"
    log "Press Ctrl+C to stop"
    echo ""
    
    while true; do
        if run_health_checks; then
            if [ "$LAST_STATUS" != "healthy" ]; then
                send_alert \
                  "✅ Application recovered and is now healthy" \
                  "success"
                LAST_STATUS="healthy"
            fi
            CONSECUTIVE_FAILURES=0
        else
            CONSECUTIVE_FAILURES=$((CONSECUTIVE_FAILURES + 1))
            log_error "Health check failed ($CONSECUTIVE_FAILURES/$FAIL_THRESHOLD)"
            
            if [ $CONSECUTIVE_FAILURES -ge $FAIL_THRESHOLD ] && \
               [ "$LAST_STATUS" != "unhealthy" ]; then
                send_alert \
                  "🚨 Application unhealthy after $FAIL_THRESHOLD consecutive failures" \
                  "danger"
                LAST_STATUS="unhealthy"
            fi
        fi
        
        echo ""
        sleep "$CHECK_INTERVAL"
    done
}

# Single check mode
single_check() {
    if run_health_checks; then
        log_success "All health checks passed"
        exit 0
    else
        log_error "Some health checks failed"
        exit 1
    fi
}

# Main
main() {
    if [ "${1:-}" = "--monitor" ] || [ "${1:-}" = "-m" ]; then
        monitor
    else
        single_check
    fi
}

main "$@"
