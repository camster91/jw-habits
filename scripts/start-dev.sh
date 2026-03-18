#!/bin/bash
# Start JW Progress Tracker development environment
# Usage: ./start-dev.sh [--background] [--log-file <file>]

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

LOG_FILE="../dev.log"
BACKGROUND=false

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --background)
            BACKGROUND=true
            shift
            ;;
        --log-file)
            LOG_FILE="$2"
            shift 2
            ;;
        *)
            echo "Unknown option: $1"
            echo "Usage: $0 [--background] [--log-file <file>]"
            exit 1
            ;;
    esac
done

echo "JW Progress Tracker - Development Environment"
echo "Project root: $PROJECT_ROOT"

# Check for existing processes on common ports
PORTS=(5173 5174 5175 5176 3009)
for port in "${PORTS[@]}"; do
    if lsof -ti:"$port" >/dev/null 2>&1; then
        pid=$(lsof -ti:"$port" | head -1)
        echo "Warning: Port $port is in use (PID: $pid). This may cause issues."
    fi
done

if [ "$BACKGROUND" = true ]; then
    echo "Starting development servers in the background..."
    echo "Logs will be written to: $LOG_FILE"
    
    # Start npm start in background, redirect all output to log file
    npm start > "$LOG_FILE" 2>&1 &
    PID=$!
    
    echo "Background process started with PID: $PID"
    echo "To view logs: tail -f '$LOG_FILE'"
    echo "To stop servers: kill $PID"
    
    # Save PID to file for later reference
    echo "$PID" > "$PROJECT_ROOT/dev.pid"
    echo "PID saved to $PROJECT_ROOT/dev.pid"
    
    # Wait a moment for servers to start, then tail log
    sleep 3
    if [ -f "$LOG_FILE" ]; then
        echo "--- Last 10 lines of log ---"
        tail -10 "$LOG_FILE"
        echo "--- End of log ---"
    fi
else
    echo "Starting development servers in the foreground..."
    echo "Press Ctrl+C to stop both servers."
    echo "Logs will be displayed below:"
    echo "------------------------------"
    
    # Run npm start in foreground
    npm start
fi