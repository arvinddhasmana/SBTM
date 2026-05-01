# SBTM Driver User Guide

Complete guide for school bus drivers using the SBTM Driver App.

## Table of Contents

1. [Getting Started](#getting-started)
2. [Driver App Overview](#driver-app-overview)
3. [Starting Your Day](#starting-your-day)
4. [Running a Route](#running-a-route)
5. [Student Presence](#student-presence)
6. [Emergency Alerts](#emergency-alerts)
7. [Navigation](#navigation)
8. [Ending Your Route](#ending-your-route)
9. [Reporting Issues](#reporting-issues)
10. [FAQ](#faq)

---

## Getting Started

### First Time Setup

1. **Download the App:**
   - iOS: App Store → Search "SBTM Driver"
   - Android: Google Play → Search "SBTM Driver"

2. **Login:**
   - Open app
   - Enter credentials provided by your transportation coordinator
   - Demo: driver1@sbtm.demo / Admin123!

3. **Allow Permissions:**
   - Location (Required for GPS tracking)
   - Camera (Required for student photos)
   - Notifications (Required for alerts)

4. **Complete Profile:**
   - Verify your information
   - Upload profile photo
   - Set up emergency contacts
   - Review assigned routes

---

## Driver App Overview

### Home Screen

```
┌─────────────────────────────────────────┐
│  SBTM Driver          [Profile] [Help]  │
├─────────────────────────────────────────┤
│                                          │
│  Today's Routes                          │
│  ┌────────────────────────────────────┐ │
│  │ Route 101 AM                       │ │
│  │ 07:00 - 08:30                      │ │
│  │ Bus: #42 | Students: 25           │ │
│  │                                    │ │
│  │      [START ROUTE] →              │ │
│  └────────────────────────────────────┘ │
│                                          │
│  ┌────────────────────────────────────┐ │
│  │ Route 101 PM                       │ │
│  │ 15:00 - 16:30                      │ │
│  │ Bus: #42 | Students: 25           │ │
│  │                                    │ │
│  │      [VIEW DETAILS]               │ │
│  └────────────────────────────────────┘ │
│                                          │
│  Quick Actions                           │
│  [🚨 Emergency] [📝 Report] [📞 Call]  │
│                                          │
└─────────────────────────────────────────┘
```

### Bottom Navigation

- **🏠 Home**: Today's routes
- **📍 Navigation**: Turn-by-turn directions
- **👥 Students**: View student list
- **📊 History**: Past trips
- **⚙️ Settings**: App preferences

---

## Starting Your Day

### Pre-Trip Inspection

**Before starting your route**, complete pre-trip inspection:

```bash
1. Tap route card
2. Tap "Pre-Trip Inspection"
3. Complete checklist:
   ✓ Tires (check pressure, wear)
   ✓ Lights (all working)
   ✓ Brakes (test)
   ✓ Emergency equipment (present)
   ✓ Mirrors (adjusted)
   ✓ Interior (clean, safe)
   ✓ First aid kit (present)
   ✓ Fire extinguisher (charged)
4. Take photos (if issues found)
5. Submit inspection
```

**If Issues Found:**
- Mark items as "Needs Attention"
- Take photos
- Add notes
- Submit inspection
- Notify dispatch
- Do NOT start route until cleared

### Start Route

```bash
1. Complete pre-trip inspection
2. Tap "START ROUTE" button
3. App activates:
   - GPS tracking
   - Navigation
   - Student list
   - Emergency button
4. You're now live!
```

**What Happens When You Start:**
- Your location appears on admin map
- Parents receive "Bus started" notification
- GPS updates every 5 seconds
- ETAs calculated automatically

---

## Running a Route

### Navigation Screen

```
┌─────────────────────────────────────────┐
│  ← Route 101 AM          [🚨 Emergency] │
├─────────────────────────────────────────┤
│                                          │
│  ┌──────────────────────────────────┐  │
│  │                                   │  │
│  │         MAP VIEW                  │  │
│  │         (your location)           │  │
│  │              ↓                    │  │
│  │         [Next Stop]               │  │
│  │                                   │  │
│  └──────────────────────────────────┘  │
│                                          │
│  Next Stop: Oak Street & 5th Ave         │
│  ETA: 3 minutes                          │
│  Students: 3 (Emma, Liam, Olivia)       │
│                                          │
│  [← PREVIOUS]  [ARRIVED]  [SKIP →]     │
│                                          │
│  Stop 3 of 12                            │
│                                          │
└─────────────────────────────────────────┘
```

### Arriving at a Stop

**When you arrive at a stop:**

```bash
1. Pull over safely
2. Tap "ARRIVED" button
3. App shows:
   - Students expected at this stop
   - Photos (if uploaded)
   - Special notes
4. Mark students:
   - Tap "✓" when student boards
   - Tap "✗" if student is absent
   - Tap "?" if unsure
5. Wait for all students
6. Tap "CONTINUE" to next stop
```

**App automatically:**
- Sends notification to parents ("Child boarded bus")
- Updates admin dashboard
- Calculates new ETA to next stop

### Student List at Stop

```
┌─────────────────────────────────────────┐
│  Stop: Oak Street & 5th Ave             │
├─────────────────────────────────────────┤
│                                          │
│  ┌────────────────────────────────────┐ │
│  │ [Photo] Emma Johnson               │ │
│  │         Grade 5 | 123 Oak St       │ │
│  │         ✓ Boarded  ✗ Absent        │ │
│  └────────────────────────────────────┘ │
│                                          │
│  ┌────────────────────────────────────┐ │
│  │ [Photo] Liam Smith                 │ │
│  │         Grade 3 | 125 Oak St       │ │
│  │         ✓ Boarded  ✗ Absent        │ │
│  └────────────────────────────────────┘ │
│                                          │
│  2 of 3 students boarded                 │
│                                          │
│  [CONTINUE TO NEXT STOP]                 │
│                                          │
└─────────────────────────────────────────┘
```

### Handling No-Shows

**If student doesn't appear:**

```bash
1. Wait reasonable time (1-2 minutes)
2. Mark student as "Absent"
3. Parent automatically notified
4. Continue to next stop
```

**If multiple absences at stop:**
- Mark all as absent
- Optional: Add note (e.g., "No one at stop")
- Continue route

---

## Student Presence

### Methods to Mark Presence

**1. Tap Method (Default)**
- Simplest and fastest
- Tap ✓ when student boards
- Tap ✗ if student absent

**2. QR Code Scanning**
- Student shows QR code card
- Tap camera icon
- Scan QR code
- Student automatically marked as boarded

**3. RFID Card (if equipped)**
- Student taps RFID card on reader
- System automatically marks presence
- Confirmation on screen

### Photo Verification

**If enabled by your district:**

```bash
1. Student boards
2. App shows expected student photo
3. Verify it's the correct student
4. Tap "Confirm" or "Not This Student"
5. If "Not This Student":
   - Take new photo
   - Report to admin
```

### Special Situations

**Student Boards at Wrong Stop:**
```bash
1. Mark student as boarded
2. Add note: "Boarded at different location"
3. Admin is notified
4. Continue route
```

**Unknown Student Tries to Board:**
```bash
1. DO NOT allow boarding without verification
2. Tap "Report Issue"
3. Select "Unauthorized student"
4. Take photo
5. Contact dispatch
6. Wait for instructions
```

**Student Needs Different Drop-off:**
```bash
1. Verify with paperwork/parent note
2. If valid, mark student as "Special Drop-off"
3. Follow instructions
4. Confirm drop-off with parent (if possible)
5. Log in app
```

---

## Emergency Alerts

### Emergency Button

**Large red button always visible at top-right**

```
[🚨 EMERGENCY]
```

### When to Use Emergency Button

**Use immediately for:**
- Accidents
- Medical emergencies
- Fire or smoke
- Student in danger
- Threat to safety
- Missing student after drop-off

**DO NOT use for:**
- Traffic delays (use "Report Delay" instead)
- Minor vehicle issues (use "Report Issue")
- Questions (use "Call Dispatch")

### How to Trigger Emergency Alert

```bash
1. Tap red [🚨 EMERGENCY] button
2. Select type:
   - 🚑 Medical Emergency
   - 🚗 Accident
   - 🔥 Fire/Smoke
   - ⚠️ Safety Threat
   - 👤 Missing Student
   - 🔧 Other Emergency
3. App automatically:
   - Sends alert to dispatch
   - Shares your GPS location
   - Sends push notifications to all parents on route
   - Opens communication with dispatch
4. Speak brief description
5. Follow dispatch instructions
6. Stay on scene unless instructed otherwise
```

**After triggering:**
- Keep app open
- Answer dispatch calls
- Follow emergency procedures
- Document with photos (if safe)
- DO NOT resume route until cleared

### Non-Emergency Alerts

**Report Delay:**
```bash
1. Tap "Report Issue"
2. Select "Traffic Delay"
3. Estimated delay (5, 10, 15, 30 min)
4. Optional note
5. Submit
6. Parents notified automatically
```

**Report Vehicle Issue:**
```bash
1. Tap "Report Issue"
2. Select "Vehicle Problem"
3. Describe issue
4. Take photos
5. Submit
6. Dispatch notified
7. Wait for instructions
```

---

## Navigation

### Turn-by-Turn Directions

**App provides:**
- Visual map with your route
- Voice turn-by-turn directions
- Distance to next turn
- Distance to next stop
- Traffic alerts (if available)

### Map Controls

- **🔍 Zoom**: Pinch to zoom in/out
- **🧭 Recenter**: Tap compass to center on your location
- **🚦 Traffic**: Toggle traffic layer
- **📍 Stops**: See all stops on route

### Route Deviations

**If you deviate from route** (e.g., road closure):
- App detects deviation
- Shows alert: "Off route"
- Provides directions back to route
- Dispatch notified automatically
- Continue when back on route

**If you must take detour:**
```bash
1. Tap "Route Deviation"
2. Select reason:
   - Road closed
   - Accident
   - Construction
   - Other
3. Optional note
4. Continue on alternate route
5. App calculates new ETAs
6. Parents notified of delay
```

---

## Ending Your Route

### Complete Route

**When you reach final destination** (school or bus yard):

```bash
1. Tap "END ROUTE"
2. App prompts: "Sweep bus for students?"
3. Walk through bus
4. Confirm: "Bus is empty"
5. App confirms:
   - All students accounted for (picked up or marked absent)
   - All stops completed
   - No alerts outstanding
6. Submit route completion
```

### Post-Trip Inspection

**After ending route:**

```bash
1. Complete post-trip inspection checklist:
   ✓ Check for lost items
   ✓ Check under seats
   ✓ Verify no students remain
   ✓ Note any damage
   ✓ Note any maintenance needs
2. Take photos if needed
3. Submit inspection
4. Park bus securely
```

### If Students Are Missing

**If student count doesn't match:**
- App alerts you: "Student count mismatch"
- Review student list
- Check for unmarked students
- Verify all students dropped off

**If student is unaccounted for:**
```bash
1. DO NOT complete route
2. Tap "🚨 EMERGENCY"
3. Select "Missing Student"
4. Provide student name
5. Review route history
6. Check bus thoroughly
7. Contact dispatch immediately
8. Follow emergency procedures
```

---

## Reporting Issues

### Issue Types

**From home screen: Tap "Report Issue"**

**1. Vehicle Problems**
- Engine trouble
- Brakes
- Lights
- Tires
- Other mechanical

**2. Route Issues**
- Road closure
- Construction
- Unsafe stop location
- Incorrect address

**3. Student Issues**
- Behavioral problem
- Medical concern (non-emergency)
- Parent not at stop
- Unauthorized person at stop

**4. General**
- App not working correctly
- GPS inaccurate
- Other

### How to Report

```bash
1. Tap "Report Issue"
2. Select category
3. Select specific issue
4. Add details (text)
5. Take photos (if relevant)
6. Submit
7. Dispatch receives immediately
8. You receive case number
9. Monitor for response
```

---

## Tips for Success

### Best Practices

**Before Route:**
✓ Arrive 15 minutes early
✓ Complete pre-trip inspection
✓ Review student list
✓ Check for special instructions
✓ Ensure phone is charged

**During Route:**
✓ Mark students promptly
✓ Follow schedule closely
✓ Be aware of traffic
✓ Communicate delays
✓ Be patient and professional

**After Route:**
✓ Complete post-trip inspection
✓ Report any issues
✓ Return lost items
✓ Provide feedback

### Communication

**With Students:**
- Greet students by name
- Be friendly but professional
- Follow district behavior policies
- Report concerns to admin

**With Parents:**
- Be polite and professional
- Refer policy questions to admin
- DO NOT share personal contact info
- Use app for official communication

**With Dispatch:**
- Respond promptly
- Be clear and concise
- Follow instructions
- Keep them informed

---

## Offline Mode

### When GPS/Network is Lost

**App automatically:**
- Continues to log data locally
- Shows last known location
- Queues actions for sync
- Works offline for:
  - Student check-ins
  - Notes
  - Photos

**When connection restored:**
- App syncs all data automatically
- Parents receive delayed notifications
- Location history filled in

### Tips for Poor Signal Areas

- Mark students immediately (before losing signal)
- Take photos while in signal
- Add notes offline (will sync later)
- Rely on downloaded route map

---

## Safety Reminders

### While Driving

⚠️ **NEVER use app while driving**
- Pull over safely before using app
- Use voice commands if available
- Let app run in background

### Student Safety

✓ Wait for students to be seated before moving
✓ Check mirrors before and after each stop
✓ Activate lights and stop arm at stops
✓ Watch for traffic
✓ Never leave students unattended

### Emergency Procedures

✓ Know location of fire extinguisher
✓ Know location of first aid kit
✓ Know emergency exits
✓ Review evacuation procedures
✓ Keep emergency contact list

---

## FAQ

**Q: What if I forget to start the route?**
A: Start it as soon as you remember. GPS tracking begins immediately. Admin can see you started late.

**Q: What if I accidentally mark a student absent who is present?**
A: Tap the student again and change to "Boarded". Parent notification is updated automatically.

**Q: What if app crashes during route?**
A: Reopen app immediately. It remembers your progress. GPS tracking resumes automatically.

**Q: What if my phone dies?**
A: GPS tracking stops. Charge phone immediately. Notify dispatch. Use backup procedures.

**Q: Can I see my past routes?**
A: Yes. Home → History → Select date. View completed routes, students, and notes.

**Q: How do I update my profile?**
A: Settings → Profile → Edit. Update photo, contact info, emergency contacts.

**Q: What if I'm running late?**
A: Tap "Report Delay" as soon as you know. Estimate delay time. Parents are notified automatically.

**Q: What if a parent asks me a question about routing?**
A: Politely refer them to the transportation office. Provide office contact info. Do not make routing decisions.

**Q: What if the app shows wrong stop address?**
A: Continue route safely. Report issue after route completion. Use your knowledge of route.

**Q: How do I sign out?**
A: Settings → Sign Out. Only sign out after completing all routes and reports.

---

## Getting Help

### In-App Help

- Tap `?` icon (top-right)
- Video tutorials
- Quick tips
- Contact support

### Emergency Support

- **During Route**: Use app "Call Dispatch" button
- **Technical Issues**: Settings → Support → Report Problem
- **After Hours**: Contact emergency dispatch number (provided by district)

### Training Resources

- Video library: Settings → Training Videos
- Driver manual: Settings → Resources
- District policies: Settings → Policies

---

## Troubleshooting

### App Won't Start Route

**Try:**
1. Complete pre-trip inspection first
2. Check location permissions
3. Ensure GPS is enabled
4. Restart app
5. Contact dispatch

### GPS Shows Wrong Location

**Try:**
1. Go outside (better GPS signal)
2. Restart phone
3. Check GPS settings
4. Wait 1-2 minutes for lock
5. Report to dispatch if persists

### Cannot Mark Student Present

**Try:**
1. Check internet connection
2. Close and reopen student list
3. Restart app
4. Mark on paper as backup
5. Enter in app when connection restored

---

**For additional support:**
- Email: arvinddhasmana@gmail.com
- Documentation: https://github.com/arvinddhasmana/SBTM_Releases/docs
- Community: https://github.com/arvinddhasmana/SBTM_Releases/discussions

---

**Last Updated**: 2026-04-30

**Drive safely! Thank you for getting our students to school safely every day.** 🚌
