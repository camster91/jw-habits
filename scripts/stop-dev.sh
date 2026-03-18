#!/bin/bash
# Stop JW Progress Tracker development servers
# Usage: ./stop-dev.sh [--kill-ports]

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

KILL_PORTS=false

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --kill-ports)
            KILL_PORTS=true
            shift
            ;;
        *)
            echo "Unknown option: $1"
            echo "Usage: $0 [--kill-ports]"
            exit 1
            ;;
    esac
done

echo "Stopping JW Progress Tracker development servers..."

# 1. Stop process from PID file if exists
PID_FILE="$PROJECT_ROOT/dev.pid"
if [ -f "$PID_FILE" ]; then
    PID=$(cat "$PID_FILE")
    echo "Found PID file with PID: $PID"
    
    if kill -0 "$PID" 2>/dev/null; then
        echo "Stopping process $PID..."
        kill "$PID"
        sleep 2
        if kill -0 "$PID" 2>/dev/null; then
            echo "Process still alive, forcing kill..."
            kill -9 "$PID"
        fi
        echo "Process stopped."
    else
        echo "Process $PID not running."
    fi
    
    rm -f "$PID_FILE"
    echo "PID file removed."
else
    echo "No PID file found."
fi

# 2. Kill processes on dev ports if requested
if [ "$KILL_PORTS" = true ]; then
    PORTS=(5173 5174 5175 5176 3009)
    for port in "${PORTS[@]}"; do
        PIDS=$(lsof -ti:"$port" 2>/dev/null || true)
        if [ -n "$PIDS" ]; then
            echo "Killing processes on port $port: $PIDS"
            kill -9 $PIDS 2>/dev/null || true
        fi
    done
    echo "Port cleanup completed."
fi

# 3. Kill any npm/vite processes started from this directory (optional)
VITE_PIDS=$(pgrep -f "vite" 2>/dev/null || true)
API_PIDS=$(pgrep -f "simple-api-server" 2>/dev/null || true)

if [ -n "$VITE_PIDS" ]; then
    echo "Stopping Vite processes: $VITE_PIDS"
    kill -9 $VITE_PIDS 2>/dev/null || true
fi

if [ -n "$API_PIDS" ]; then
    echo "Stopping API server processes: $API_PIDS"
    kill -9 $API_PIDS 2>/dev/null || true
fi

echo "Cleanup complete."