#!/bin/bash
cd /home/arvind/workspace/SBTM/apps/admin-dashboard
node node_modules/@playwright/test/cli.js test --reporter=json > /home/arvind/workspace/SBTM/pw-results.json 2>/home/arvind/workspace/SBTM/pw-stderr.txt
echo "EXIT=$?" >> /home/arvind/workspace/SBTM/pw-stderr.txt
