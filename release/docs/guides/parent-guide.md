# SBTM Parent User Guide

Complete guide for parents and guardians using the SBTM Parent Portal and Mobile App.

## Table of Contents

1. [Getting Started](#getting-started)
2. [Parent Portal Overview](#parent-portal-overview)
3. [Tracking Your Child's Bus](#tracking-your-childs-bus)
4. [Understanding Notifications](#understanding-notifications)
5. [Managing Your Profile](#managing-your-profile)
6. [Viewing History](#viewing-history)
7. [Reporting Absences](#reporting-absences)
8. [FAQ](#faq)

---

## Getting Started

### Creating Your Account

**You'll receive an invitation email from your school:**

```
From: SBTM Notifications <noreply@sbtm.app>
Subject: Invitation to SBTM Parent Portal

Hello [Your Name],

Your child's school uses SBTM to manage school bus
transportation. Click below to set up your account:

[Create Account]

Your children:
- Emma Johnson (Grade 5)
- Liam Smith (Grade 3)

If you have questions, contact your school transportation
office.
```

**Setup Steps:**
```bash
1. Click "Create Account" in email
2. Create password (min 8 characters)
3. Verify email address
4. Set up profile
5. Review children's information
6. Set notification preferences
7. Download mobile app (optional)
```

### Downloading the Mobile App

**iOS (iPhone/iPad):**
1. Open App Store
2. Search "SBTM Parent"
3. Tap "Get"
4. Install
5. Login with your credentials

**Android:**
1. Open Google Play Store
2. Search "SBTM Parent"
3. Tap "Install"
4. Login with your credentials

### First Login

**Demo Credentials:**
- Email: parent1@sbtm.demo
- Password: Admin123!

**Production:**
- Use credentials you created during signup

**After First Login:**
- Enable notifications (highly recommended)
- Set location permissions (for map view)
- Review your children's routes
- Test notifications (Settings → Test Notification)

---

## Parent Portal Overview

### Dashboard

```
┌─────────────────────────────────────────────────────────┐
│  SBTM Parent Portal              [Profile] [Settings]   │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  My Children                                             │
│  ┌──────────────────────────────────────────────────┐  │
│  │  👧 Emma Johnson (Grade 5)                       │  │
│  │  Route 101 AM → Maple Elementary                 │  │
│  │  🚌 Bus #42 | ETA: 7:25 AM | On time            │  │
│  │  [TRACK BUS] [VIEW ROUTE] [HISTORY]             │  │
│  └──────────────────────────────────────────────────┘  │
│                                                          │
│  ┌──────────────────────────────────────────────────┐  │
│  │  👦 Liam Smith (Grade 3)                         │  │
│  │  Route 102 AM → Oak Elementary                   │  │
│  │  🚌 Bus #38 | ETA: 7:30 AM | On time            │  │
│  │  [TRACK BUS] [VIEW ROUTE] [HISTORY]             │  │
│  └──────────────────────────────────────────────────┘  │
│                                                          │
│  Recent Notifications (2)                                │
│  • Bus #42 arriving in 5 minutes                        │
│  • Emma boarded bus at 7:12 AM                          │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### Navigation

**Web Portal:**
- Dashboard
- Track Bus
- Route Schedule
- Trip History
- Notifications
- Settings
- Help

**Mobile App Bottom Bar:**
- 🏠 Home
- 📍 Track
- 📅 Schedule
- 📊 History
- ⚙️ Settings

---

## Tracking Your Child's Bus

### Real-Time Bus Tracking

**To track your child's bus:**

```bash
1. Open app or web portal
2. Select your child
3. Tap "TRACK BUS"
4. See:
   - Bus current location (live)
   - Route path
   - Your child's stop
   - Other stops on route
   - ETA to your stop
   - Current speed
   - Last update time
```

### Map View

```
┌─────────────────────────────────────────┐
│  ← Emma's Bus (Route 101 AM)           │
│                           [Refresh] [⚙] │
├─────────────────────────────────────────┤
│                                          │
│  ┌──────────────────────────────────┐  │
│  │                                   │  │
│  │    🏫 School                      │  │
│  │                                   │  │
│  │         📍 Stop 3 (Your stop)    │  │
│  │              ↑                    │  │
│  │         🚌 Bus (Stop 2)           │  │
│  │                                   │  │
│  │         📍 Stop 1 (completed ✓)  │  │
│  │                                   │  │
│  └──────────────────────────────────┘  │
│                                          │
│  Next Stop: 123 Oak Street               │
│  ETA to Your Stop: 8 minutes             │
│  Last Updated: 10 seconds ago            │
│                                          │
│  Bus Status: ✅ On Route, On Time       │
│                                          │
└─────────────────────────────────────────┘
```

### Understanding Bus Status

| Icon | Status | Meaning |
|------|--------|---------|
| 🟢 | On Route, On Time | Bus is running on schedule |
| 🟡 | Running Late | Bus is delayed but en route |
| 🔴 | Alert/Emergency | Issue reported, check notifications |
| ⚪ | Not Started | Route hasn't begun yet |
| ⚫ | Completed | Route finished |

### Stop Information

**Tap on your stop to see:**
- Exact address
- Scheduled pickup time
- Current ETA
- Number of students at this stop
- Special instructions (if any)

### ETA (Estimated Time of Arrival)

**How ETA Works:**
- Calculated based on:
  - Current bus location
  - Traffic conditions
  - Historical route times
  - Remaining stops
- Updates every 30 seconds
- Accuracy typically ±2 minutes

**ETA Colors:**
- 🟢 Green: On time (within 5 min of schedule)
- 🟡 Yellow: Delayed (5-15 min late)
- 🔴 Red: Significant delay (15+ min late)

---

## Understanding Notifications

### Notification Types

**1. Departure Notification**
```
🚌 Bus #42 has started Route 101 AM
Estimated arrival at your stop: 7:25 AM
```

**2. Approaching Notification**
```
🚌 Bus #42 is 5 minutes away from your stop
Current location: Main St & 2nd Ave
```

**3. Boarding Confirmation**
```
✅ Emma boarded bus #42 at 7:23 AM
Next stop: Maple Elementary School
Estimated arrival: 7:40 AM
```

**4. School Arrival**
```
🏫 Emma arrived at Maple Elementary at 7:42 AM
Route 101 AM completed successfully
```

**5. Delay Notification**
```
⏰ Bus #42 is running 10 minutes late
New ETA to your stop: 7:35 AM
Reason: Traffic delay
```

**6. Emergency Alert**
```
🚨 ALERT: Bus #42 - Emergency reported
Your child is safe. Admin team notified.
Updates will be provided shortly.
```

**7. Absence Confirmation**
```
❌ Emma was marked absent at pickup
Bus #42 departed without pickup at 7:25 AM
If this is incorrect, contact school immediately.
```

**8. Route Change Notification**
```
📝 Route change for tomorrow
Emma's stop changed to: 125 Oak Street
New pickup time: 7:20 AM (was 7:25 AM)
```

### Notification Settings

**Customize which notifications you receive:**

```bash
1. Go to Settings → Notifications
2. Toggle preferences:
   ✓ Route started
   ✓ Bus approaching (5 min)
   ✓ Child boarded bus
   ✓ Child arrived at school
   ✓ Delays (10+ minutes)
   ✓ Emergency alerts (always on)
   ✓ Route changes
   ✓ General announcements
3. Choose delivery method:
   ✓ Push notification
   ✓ Email
   ✓ SMS (if available)
4. Set quiet hours (optional):
   - No non-emergency notifications during specified times
5. Save preferences
```

---

## Managing Your Profile

### Update Profile Information

**Settings → Profile → Edit**

**You Can Update:**
- Name
- Phone number
- Email address (requires verification)
- Mailing address
- Emergency contacts
- Preferred language
- Profile photo

**You Cannot Update:**
- Your children (contact school)
- Route assignments (contact school)
- Pickup/dropoff locations (contact school)

### Managing Multiple Children

**If you have multiple children:**
- All children appear on your dashboard
- Each child has own tracking
- You can view all buses simultaneously
- Separate notification settings per child

**View All Buses:**
```bash
1. Dashboard → View All
2. See map with all your children's buses
3. Color-coded markers for each child
4. Tap marker to see details
```

### Add Another Parent/Guardian

**To share access with another family member:**

```bash
1. Settings → Family Access
2. Tap "Invite Family Member"
3. Enter their email
4. Select which children they can see
5. Send invitation
6. They receive setup email
7. Create their own account
8. Both accounts have access
```

---

## Viewing History

### Trip History

**View past trips for your child:**

```bash
1. Select child
2. Tap "History"
3. Select date range
4. See list of trips:
   - Date and time
   - Route taken
   - Pickup time (actual vs scheduled)
   - Arrival time (actual vs scheduled)
   - Bus number
   - Status (On time / Late / Absent)
5. Tap trip to see details:
   - Route map
   - All stops
   - Timeline of events
```

### Attendance Report

**See your child's bus attendance:**

```bash
1. History → Attendance Report
2. Select date range (week/month/year)
3. See calendar view:
   - ✅ Green: Rode bus
   - ❌ Red: Absent
   - ⚠️ Yellow: Missed bus
4. Export to PDF or Excel
```

### On-Time Performance

**Track how often bus arrives on time:**

```bash
1. History → Performance
2. See statistics:
   - On time: XX%
   - Delayed (5-15 min): XX%
   - Significantly late (15+ min): XX%
3. View by:
   - Last 7 days
   - Last 30 days
   - School year
4. Compare AM vs PM routes
```

---

## Reporting Absences

### Pre-Report Absence

**If your child won't be riding the bus:**

```bash
1. Dashboard → Select child
2. Tap "Report Absence"
3. Select date(s):
   - Today only
   - Tomorrow only
   - Date range
   - Recurring (e.g., every Monday)
4. Select which route(s):
   - AM only
   - PM only
   - Both
5. Optional: Reason
6. Submit
7. Confirmation shown
8. Driver notified
9. Your child won't be marked absent (won't trigger alert)
```

### Cancel Absence

**If plans change:**

```bash
1. Dashboard → Notifications
2. Find absence confirmation
3. Tap "Cancel Absence"
4. Confirm
5. Driver notified
6. Child back on route list
```

---

## Common Scenarios

### Scenario 1: Bus Running Late

**What You See:**
- Notification: "Bus running 10 min late"
- Updated ETA on map
- Reason (if provided)

**What to Do:**
- Adjust your schedule
- Keep child ready at stop
- Check map for real-time location
- Contact school only if excessively late (30+ min)

---

### Scenario 2: Child Marked Absent But Was Waiting

**What You See:**
- Notification: "Child marked absent"

**What to Do:**
```bash
1. Check if you reported absence (History → Absences)
2. If NOT reported:
   - Contact school transportation immediately
   - Provide pickup time and location
   - School reviews GPS and video
3. If confirmed missed:
   - School determines reason (bus early, wrong location, etc.)
   - Make alternate transportation
```

---

### Scenario 3: Emergency Alert Received

**What You See:**
- 🚨 Red alert notification
- "Emergency reported - Your child is safe"

**What to Do:**
```bash
1. Stay calm - alert doesn't mean your child is in danger
2. Read full alert message
3. Check for updates in app
4. DO NOT call driver (let them focus on situation)
5. School will provide updates
6. Follow instructions in alert
7. If no update within 15 min, call school transportation
```

---

### Scenario 4: Bus Broke Down

**What You See:**
- Notification: "Bus #42 mechanical issue"
- "Backup bus dispatched - ETA 15 minutes"

**What to Do:**
- Wait at stop (if AM route)
- Backup bus will complete route
- ETA updated when backup bus arrives
- May experience delay
- School keeps you informed

---

### Scenario 5: Weather Delay or Closure

**What You See:**
- Notification: "All routes delayed 2 hours due to weather"
- Or: "All routes cancelled - school closed"

**What to Do:**
- Follow instructions in alert
- Check school website/social media
- Make alternate arrangements if needed
- App will show updated schedule

---

## Safety and Privacy

### Your Data

**What We Collect:**
- Your contact information
- Your children's names and grades
- Bus tracking preferences
- Notification preferences

**What We DON'T Collect:**
- Credit card information
- Social security numbers
- Medical records
- Personal photos (except optional profile pic)

**Your Rights:**
- View your data (Settings → Privacy → View Data)
- Export your data (Settings → Privacy → Export)
- Delete your account (Settings → Privacy → Delete Account)
  - Note: Contact school to remove child from system

### Security

**Your Account is Protected By:**
- Encrypted password (we never see it)
- HTTPS encryption for all data
- Two-factor authentication (optional but recommended)
- Automatic logout after 30 days inactivity

**Keep Your Account Secure:**
- Use strong, unique password
- Don't share your password
- Enable two-factor authentication
- Log out on shared devices
- Report suspicious activity

### Bus Camera Privacy

**Video Footage:**
- Cameras on buses record for safety
- Footage is encrypted and secure
- Only accessible by authorized school staff
- Typically retained for 30-90 days
- Never shared publicly
- Used only for investigations and safety reviews

---

## Tips for Success

### Morning Routine

✅ **Check app night before** for any route changes
✅ **Check app in morning** for delays or alerts
✅ **Have child at stop 5 minutes early**
✅ **Stay visible** to driver
✅ **Confirm boarding notification** received

### Afternoon Pickup

✅ **Check ETA** before leaving to pick up
✅ **Be at stop before bus arrives**
✅ **Bus cannot wait** - be on time
✅ **Confirm arrival notification** received

### Communication

✅ **Use app** for routine questions
✅ **Call school** for urgent matters
✅ **DO NOT** contact driver directly
✅ **Report issues** through app or school
✅ **Provide feedback** to help improve service

---

## FAQ

**Q: How accurate is the GPS tracking?**
A: Typically accurate within 10-30 meters (30-100 feet). Updates every 5-30 seconds. Accuracy may vary in areas with poor GPS signal (downtown, tunnels).

**Q: Why does the bus icon "jump" on the map sometimes?**
A: GPS signals can bounce off buildings. Brief jumps are normal. If persistent, report to school IT.

**Q: Can I see the driver's name?**
A: Yes, in route details. For safety, we don't show driver personal contact info.

**Q: What if I don't have a smartphone?**
A: You can use web portal on any computer. For notifications, we can send emails or SMS (if your school enables it).

**Q: Can I change my child's pickup/dropoff location?**
A: Contact your school transportation office. Changes must be approved and typically require 24-48 hours notice.

**Q: What if I need my child dropped off at different location today?**
A: Contact school transportation ASAP. Many schools require written notice. Cannot be changed through parent app for safety reasons.

**Q: Why was my child marked absent when they were at the stop?**
A: Possible reasons:
- Bus arrived early
- Child at wrong location
- Driver error (rare)
Contact school immediately to investigate.

**Q: The bus is shown as "not started" but it's past the scheduled time. Why?**
A: Driver may not have started route in app yet. Or route was cancelled (check for notifications). If concerned after 10 minutes, call school.

**Q: Can I rate the driver or provide feedback?**
A: Yes! After each trip, you can rate service and provide comments. Go to History → Select trip → Rate & Review.

**Q: What if the app isn't working?**
A: Try:
1. Close and reopen app
2. Check internet connection
3. Update app to latest version
4. Restart phone
5. Reinstall app
6. Contact support: arvinddhasmana@gmail.com

**Q: Can my child use my phone to track the bus?**
A: Yes, but keep login credentials private. Consider creating a separate account for older children (contact school).

**Q: What if I have a complaint about the driver?**
A: Report through app (History → Select trip → Report Issue) or contact school directly. All reports are reviewed by administration.

**Q: Will I be notified if my child fights or misbehaves on the bus?**
A: Yes, school will contact you per their discipline policy. Behavioral incidents are not shown in the app but are documented by the school.

**Q: Can I see other children on the route for carpooling?**
A: No, for privacy. Contact school if you want to coordinate carpools with other families.

**Q: How much does the app cost?**
A: Free for parents! Your school pays for the system.

**Q: Can I request a route change?**
A: Contact your school transportation office. Route changes are subject to capacity and eligibility rules.

---

## Getting Help

### In-App Support

- Tap `?` icon for help
- Settings → Help → Video Tutorials
- Settings → Help → Contact Support

### School Transportation Office

**For questions about:**
- Route assignments
- Pickup/dropoff locations
- Schedule changes
- Eligibility
- General transportation policies

**Contact your school's transportation coordinator** (contact info in Settings → School Info)

### Technical Support

**For app technical issues:**
- Email: arvinddhasmana@gmail.com
- Include:
  - Your name and school
  - Issue description
  - Screenshots (if possible)
  - Device type (iPhone/Android)

### Emergency

**If child is in danger or emergency:**
- Call 911 first
- Then call school immediately

**For non-emergency but urgent issues:**
- Call school transportation office
- Use numbers provided in Settings → Emergency Contacts

---

## Feedback

**We want to hear from you!**

**Ways to provide feedback:**
- In-app surveys (occasional)
- Rate your trip (History → Select trip → Rate)
- Settings → Feedback
- Email: arvinddhasmana@gmail.com
- GitHub Discussions: https://github.com/arvinddhasmana/SBTM_Releases/discussions

**Your feedback helps us improve!**

---

**Thank you for using SBTM!**

We're committed to keeping your children safe and you informed.

---

**Last Updated**: 2026-04-30
