#!/bin/bash
cd /home/arvind/workspace/SBTM_AntiGravity/apps/admin-dashboard
node node_modules/@playwright/test/cli.js test --reporter=json > /home/arvind/workspace/SBTM_AntiGravity/pw-results.json 2>/home/arvind/workspace/SBTM_AntiGravity/pw-stderr.txt
echo "EXIT=$?" >> /home/arvind/workspace/SBTM_AntiGravity/pw-stderr.txt
