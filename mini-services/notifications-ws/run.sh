#!/bin/bash
cd /home/z/my-project/mini-services/notifications-ws
while true; do
  bun run dev >> dev.log 2>&1
  echo "[run.sh] process exited, restarting in 2s..." >> dev.log
  sleep 2
done
