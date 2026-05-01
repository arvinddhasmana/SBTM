# SBTM Demo Video Script

**Duration**: 10 minutes
**Audience**: School administrators and transportation coordinators
**Goal**: Show complete workflow from deployment to tracking buses

---

## Opening (30 seconds)

**[Screen: Title slide with SBTM logo]**

> "Hello! I'm going to show you SBTM - the School Bus Transport Management system that saves school districts 90% compared to traditional solutions."
>
> "In the next 10 minutes, you'll see how quickly you can deploy SBTM and start tracking your buses."

---

## Part 1: Deployment (2 minutes)

**[Screen: Terminal with Azure/GCP deployment script]**

> "Let's start with deployment. Unlike traditional systems that take weeks or months, SBTM deploys in under 30 minutes."
>
> "I'm running the quick-deploy script for Azure. It automatically creates everything we need:"

**[Show script running]**

- AKS cluster
- PostgreSQL database
- Redis cache
- All microservices

> "While that's running, let me explain what's happening..."

**[Screen: Architecture diagram]**

> "SBTM uses a modern microservices architecture with:"
>
> - GPS tracking service for real-time location
> - Emergency alert system
> - Student presence management
> - Video integration
> - And more...

**[Screen: Back to terminal showing completion]**

> "And there we go! In just 20 minutes, we have a complete school bus management system running in the cloud."
>
> "The script gives us three URLs - one for admin, one for parents, and one for drivers."

---

## Part 2: Admin Dashboard (3 minutes)

**[Screen: Admin Dashboard login]**

> "Let's login to the admin dashboard with the demo credentials..."

**[Screen: Dashboard home]**

> "This is the admin home screen. Right away I can see:"
>
> - Total active routes
> - Buses currently running
> - Students on buses
> - Any active alerts
>
> "Let me show you the live map..."

**[Screen: Live map view]**

> "Here's the real-time GPS tracking. Each green bus icon represents an active bus. Let me click on one..."
>
> **[Click bus]**
>
> "I can see:"
>
> - Bus number and driver
> - Current speed
> - Next stop
> - ETA to next stop
> - Students on board
>
> "The map updates every 5 seconds, so parents always know where the bus is."

**[Screen: Routes section]**

> "Now let me create a new route. I'll click 'Create New Route'..."

**[Demonstrate creating route]**

1. Enter route name and number
2. Click map to add stops
3. Drag to reorder stops
4. Assign bus and driver
5. Assign students to stops

> "It's that easy. The driver app immediately shows the new route."

---

## Part 3: Driver App (2 minutes)

**[Screen: Driver mobile app]**

> "Now let's see the driver experience. This is the SBTM Driver App on an iPhone..."
>
> **[Show home screen]**
>
> "The driver sees their routes for today. Let me start Route 101 AM..."

**[Tap Start Route]**

> "First, they complete a pre-trip inspection checklist. This ensures safety before every trip."

**[Complete checklist and start]**

> "Now the route is active. The driver sees:"
>
> - Turn-by-turn navigation
> - List of students at each stop
> - Emergency alert button (always accessible)
>
> **[Navigate to first stop]**
>
> "At each stop, they mark students as boarded or absent. Let me tap 'Arrived'..."

**[Show student list]**

> "Here are the students expected at this stop, with their photos. The driver just taps the checkmark when they board."

**[Mark students]**

> "As soon as I mark Emma as boarded, her parents receive a push notification: 'Emma boarded bus #42 at 7:23 AM'."

---

## Part 4: Parent Portal (2 minutes)

**[Screen: Parent Portal on phone]**

> "Speaking of parents, let me show you the Parent Portal..."

**[Login as parent]**

> "Sarah logs in and immediately sees her two children's buses on the home screen."

**[Show dashboard]**

> "For each child, she can see:"
>
> - Which bus they're on
> - Current ETA
> - Whether they're running on time
>
> "Let me tap 'Track Bus' for Emma..."

**[Show tracking map]**

> "Sarah can see the bus location in real-time, the route, and exactly when it will arrive at her stop."
>
> "She also receives notifications throughout the journey:"

**[Show notifications]**

- Bus started route
- Bus approaching (5 min warning)
- Child boarded
- Child arrived at school

> "If there's a delay, she's notified immediately with the reason and new ETA."

---

## Part 5: Emergency Alerts (1 minute)

**[Screen: Back to driver app]**

> "Let me show you the emergency alert system. This is critical for safety."

**[Tap emergency button]**

> "If the driver taps the emergency button, they select the type of emergency..."

**[Select "Medical Emergency"]**

> "Instantly:"
>
> - Dispatch is alerted
> - GPS location is shared
> - All parents on the route receive a notification
> - Admin dashboard shows the alert prominently
>
> **[Screen: Admin dashboard showing alert]**
>
> "The admin can see exactly where the bus is, communicate with the driver, and coordinate response."

---

## Part 6: Reports and Analytics (1 minute)

**[Screen: Admin reports section]**

> "Finally, let me show you the reporting capabilities..."

**[Navigate to reports]**

> "SBTM generates comprehensive reports:"
>
> - Daily trip reports
> - Student attendance
> - On-time performance
> - Driver performance
> - Cost analysis
>
> **[Generate a report]**
>
> "Reports can be generated on-demand or scheduled automatically. Export to Excel, PDF, or CSV."

**[Show example report]**

> "Here's a weekly on-time performance report showing 94% on-time rate. You can drill down to see which routes had delays and why."

---

## Closing (30 seconds)

**[Screen: Summary slide]**

> "So there you have it - SBTM in 10 minutes:"
>
> ✓ Deploys in 30 minutes, not 3 months
> ✓ Real-time GPS tracking
> ✓ Parent and driver apps included
> ✓ Emergency alert system
> ✓ Comprehensive reporting
> ✓ 90% cost savings vs traditional systems
>
> "Best of all, it's open source and you host it in your own cloud account. No vendor lock-in."
>
> "Ready to try it? Visit github.com/arvinddhasmana/SBTM_Releases for the quick start guide."
>
> "Deploy in 30 minutes and start saving thousands per year. Thanks for watching!"

**[Screen: End slide with links]**

- GitHub: github.com/arvinddhasmana/SBTM_Releases
- Email: arvinddhasmana@gmail.com
- Pricing: See docs/PRICING.md

---

## Technical Notes for Recording

**Tools Needed:**
- Screen recording: OBS Studio or Loom
- Video editing: DaVinci Resolve (free) or Camtasia
- Audio: Quality microphone (Blue Yeti recommended)

**Before Recording:**
1. Deploy SBTM to get real URLs
2. Seed demo data
3. Test all workflows
4. Prepare notes/teleprompter
5. Practice 2-3 times

**Recording Tips:**
- Record in 1080p (1920x1080)
- Use 60fps for smooth mouse movements
- Zoom in when showing detailed UI
- Pause between sections for easier editing
- Record audio separately for better quality

**Editing Checklist:**
- Add intro/outro music
- Add text overlays for key points
- Speed up slow parts (deployment, waiting)
- Add smooth transitions
- Export in 1080p60 for YouTube
- Create 3 versions:
  - Full 10-min version
  - 5-min condensed version
  - 2-min highlights reel

**Upload To:**
1. YouTube (primary)
2. Vimeo (backup)
3. Embed in README.md
4. LinkedIn, Twitter

**YouTube SEO:**
- Title: "SBTM - Open Source School Bus Management | 90% Cost Savings | 30 Min Deployment"
- Tags: school bus, transportation management, open source, kubernetes, Azure, GCP
- Description: Include links to GitHub, pricing, docs
- Thumbnail: Design eye-catching thumbnail with "90% Savings" and "30 Min Deploy"
