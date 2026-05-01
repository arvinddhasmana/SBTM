# SBTM Admin User Guide

Complete guide for school administrators and transportation coordinators using the SBTM Admin Dashboard.

## Table of Contents

1. [Getting Started](#getting-started)
2. [Dashboard Overview](#dashboard-overview)
3. [Managing Routes](#managing-routes)
4. [Managing Students](#managing-students)
5. [Managing Drivers](#managing-drivers)
6. [Managing Buses](#managing-buses)
7. [GPS Tracking](#gps-tracking)
8. [Emergency Alerts](#emergency-alerts)
9. [Reports and Analytics](#reports-and-analytics)
10. [System Settings](#system-settings)

---

## Getting Started

### First Login

1. Navigate to your Admin Dashboard URL (provided after deployment)
2. Login credentials:
   - **Demo**: admin@sbtm.demo / Admin123!
   - **Production**: Use credentials provided by your IT team

3. After first login, you'll be prompted to:
   - Change your password
   - Set up two-factor authentication (recommended)
   - Configure your profile

### Dashboard Layout

```
┌────────────────────────────────────────────────────────────┐
│  SBTM Admin Dashboard                    [Profile] [Help]  │
├──────────┬─────────────────────────────────────────────────┤
│          │                                                  │
│  Home    │   Main Content Area                             │
│  Routes  │   - Map View                                    │
│  Schools │   - Lists and Forms                             │
│  Students│   - Reports                                     │
│  Drivers │   - Analytics                                   │
│  Buses   │                                                  │
│  Alerts  │                                                  │
│  Reports │                                                  │
│  Settings│                                                  │
│          │                                                  │
└──────────┴─────────────────────────────────────────────────┘
```

---

## Dashboard Overview

### Home Screen

The home screen shows:

**Live Statistics:**
- Total active routes
- Buses currently running
- Students on buses
- Active alerts

**Today's Summary:**
- AM routes completed: X of Y
- PM routes in progress: X of Y
- On-time performance: XX%
- Incidents today: X

**Quick Actions:**
- Start emergency broadcast
- View all buses on map
- Generate today's report
- Manage alerts

**Recent Activity:**
- Last 10 system events
- Recent alerts
- Route changes
- Driver check-ins

---

## Managing Routes

### View All Routes

**Navigation**: Sidebar → Routes → All Routes

**Route List Shows:**
- Route name/number
- AM/PM schedule
- Assigned bus
- Assigned driver
- Number of students
- Status (Active/Inactive)
- Actions (View, Edit, Delete)

### Create New Route

**Navigation**: Routes → Create New Route

**Required Information:**
1. **Route Details:**
   - Route name (e.g., "Route 101 AM")
   - Route number
   - Type (AM/PM/Special)
   - School assignment
   - Description

2. **Schedule:**
   - Start time
   - End time
   - Days of week
   - Effective date range

3. **Stops:**
   - Click map to add stops
   - Or upload CSV with addresses
   - Set pickup time for each stop
   - Define geofence radius (default: 50m)

4. **Assignments:**
   - Select bus
   - Select driver
   - Assign students to stops

**Steps:**
```bash
1. Click "Create New Route"
2. Fill in route details
3. Click on map to add stops (or import)
4. Drag stops to reorder
5. Set pickup times
6. Assign bus and driver
7. Assign students to stops
8. Click "Save Route"
9. Activate route
```

### Edit Existing Route

**Navigation**: Routes → Select route → Edit

**What You Can Edit:**
- Route details (name, number, etc.)
- Schedule and times
- Add/remove/reorder stops
- Change bus or driver assignment
- Add/remove students
- Update pickup times

**Important Notes:**
- Changes take effect immediately
- Driver app is notified of changes
- Parents receive notification if their stop changed
- Historical data is preserved

### Clone Route

**Use Case**: Create PM route from AM route

**Steps:**
```bash
1. View route you want to clone
2. Click "Clone Route"
3. Give new name (e.g., "Route 101 PM")
4. Adjust schedule times
5. Reverse stop order (if needed)
6. Save
```

### Import Routes from CSV

**Navigation**: Routes → Import

**CSV Format:**
```csv
route_name,route_number,type,start_time,end_time,bus_number,driver_id
Route 101 AM,101,AM,07:00,08:30,BUS001,DRV001
Route 101 PM,101,PM,15:00,16:30,BUS001,DRV001
```

**Steps:**
```bash
1. Download template CSV
2. Fill in route data
3. Upload CSV file
4. Review import preview
5. Confirm import
6. Edit routes as needed
```

---

## Managing Students

### View All Students

**Navigation**: Students → All Students

**Student List Shows:**
- Student name
- Student ID
- Grade
- Assigned route(s)
- Stop location
- Parent contact
- Status (Active/Inactive)

**Search and Filter:**
- By name or ID
- By grade
- By school
- By route
- By status

### Add New Student

**Navigation**: Students → Add Student

**Required Information:**
1. **Basic Info:**
   - First name, Last name
   - Student ID
   - Date of birth
   - Grade
   - Gender (optional)
   - Photo (optional)

2. **Address:**
   - Street address
   - City, State, ZIP
   - Geocoded location (auto-calculated)

3. **School Assignment:**
   - Select school
   - Grade level

4. **Transportation:**
   - Eligible for transportation? Yes/No
   - AM route and stop
   - PM route and stop
   - Special needs (if any)

5. **Emergency Contacts:**
   - Primary contact (name, phone, email)
   - Secondary contact
   - Relationship

6. **Parent Portal Access:**
   - Parent email
   - Auto-send invitation? Yes/No

### Bulk Import Students

**Navigation**: Students → Import

**CSV Format:**
```csv
student_id,first_name,last_name,grade,address,parent_email,parent_phone
12345,John,Doe,5,123 Main St,parent@example.com,555-0100
12346,Jane,Smith,3,456 Oak Ave,parent2@example.com,555-0101
```

**Steps:**
```bash
1. Export from your SIS
2. Map fields to SBTM format
3. Upload CSV
4. Review mapping
5. Confirm import
6. SBTM sends parent invitations automatically
```

### Assign Student to Route

**Method 1: From Student Profile**
```bash
1. Open student profile
2. Click "Transportation" tab
3. Click "Add Route"
4. Select route (AM/PM)
5. Select stop
6. Set effective date
7. Save
```

**Method 2: From Route Editor**
```bash
1. Open route in editor
2. Click on a stop
3. Click "Assign Students"
4. Search and select students
5. Confirm assignments
6. Save route
```

### Handle Student Transfers

**Scenario**: Student moves to different address

**Steps:**
```bash
1. Open student profile
2. Update address
3. System suggests new route based on address
4. Review suggestion
5. Approve new route assignment
6. System notifies parents of change
7. Old route assignment archived
```

---

## Managing Drivers

### View All Drivers

**Navigation**: Drivers → All Drivers

**Driver List Shows:**
- Driver name
- Driver ID
- License number
- Certifications status
- Current route (if active)
- Status (Active/On Leave/Inactive)

### Add New Driver

**Navigation**: Drivers → Add Driver

**Required Information:**
1. **Personal Info:**
   - First name, Last name
   - Employee ID
   - Date of birth
   - Contact info (phone, email)
   - Address

2. **Licensing:**
   - Driver's license number
   - License state
   - CDL class
   - Expiration date
   - Restrictions/endorsements

3. **Certifications:**
   - First aid (Y/N, expiration)
   - CPR (Y/N, expiration)
   - Passenger endorsement
   - Air brake endorsement
   - Background check (date, status)

4. **Employment:**
   - Hire date
   - Employment status (Full-time/Part-time)
   - Pay rate (optional)

5. **Driver App Access:**
   - Username (auto-generated or custom)
   - Temporary password
   - Send welcome email? Yes/No

### Assign Driver to Route

**Method 1: From Route**
```bash
1. Open route in editor
2. Click "Assign Driver"
3. Select driver from dropdown
4. Set effective date
5. Save
```

**Method 2: From Driver Profile**
```bash
1. Open driver profile
2. Click "Assignments" tab
3. Click "Add Route"
4. Select route
5. Set schedule (daily/specific days)
6. Save
```

### Handle Substitute Drivers

**Scenario**: Regular driver is sick

**Steps:**
```bash
1. Go to Today's Routes
2. Find affected route
3. Click "Change Driver"
4. Select substitute
5. Choose:
   - Today only
   - Specific date range
   - Until further notice
6. Save
7. Substitute driver sees route in their app
8. Parents notified of driver change
```

### Driver Performance Monitoring

**Navigation**: Drivers → Select driver → Performance

**Metrics Shown:**
- On-time performance (last 30 days)
- Route compliance
- Incidents/alerts
- Student feedback
- Inspection completion rate

---

## Managing Buses

### View All Buses

**Navigation**: Buses → All Buses

**Bus List Shows:**
- Bus number
- Make/model/year
- Capacity
- GPS device status
- Maintenance status
- Current location (if active)
- Assigned route

### Add New Bus

**Navigation**: Buses → Add Bus

**Required Information:**
1. **Vehicle Details:**
   - Bus number
   - VIN
   - Make, Model, Year
   - License plate
   - State of registration

2. **Capacity:**
   - Total seats
   - Wheelchair capacity
   - Aide seat available

3. **Equipment:**
   - GPS device ID
   - GPS device type
   - Camera system (Y/N)
   - Number of cameras
   - Wheelchair lift (Y/N)

4. **Registration:**
   - Registration number
   - Expiration date
   - Insurance policy
   - Insurance expiration

5. **Maintenance:**
   - Last inspection date
   - Next inspection due
   - Current mileage
   - Maintenance schedule

### Bus Maintenance Tracking

**Navigation**: Buses → Select bus → Maintenance

**Features:**
- Log inspections (pre-trip, post-trip)
- Schedule maintenance
- Record repairs
- Track mileage
- Set reminders for:
  - Oil changes
  - Tire rotation
  - Inspections
  - Registration renewal

**Add Maintenance Record:**
```bash
1. Select bus
2. Click "Maintenance" tab
3. Click "Add Record"
4. Select type (Inspection/Repair/Service)
5. Fill in details
6. Upload photos/documents
7. Set next service date
8. Save
```

---

## GPS Tracking

### Live Map View

**Navigation**: Home → View All Buses on Map

**Map Features:**
- 🚌 Bus icons (color-coded by status)
  - Green: On route, on time
  - Yellow: On route, delayed
  - Red: Alert/emergency
  - Gray: Inactive
- 📍 Stop markers
- 🔵 Student pickup locations
- 🏫 School locations
- Route lines

**Map Controls:**
- Zoom in/out
- Search for bus
- Filter by route
- Toggle layers (stops, schools, etc.)
- Full screen mode

**Bus Info Popup:**
Click on bus to see:
- Bus number
- Route name
- Driver name
- Current speed
- Last update time
- Next stop
- ETA to next stop
- Number of students on board

### Track Specific Bus

**Navigation**: Buses → Select bus → Track

**Features:**
- Follow bus in real-time
- See route progress
- Completed stops (green checkmarks)
- Upcoming stops (gray)
- Current location
- Speed and direction
- Historical breadcrumb trail

### Route Replay

**Use Case**: Review yesterday's route

**Steps:**
```bash
1. Routes → Select route
2. Click "History"
3. Select date/time
4. Click "Replay"
5. Playback controls:
   - Play/pause
   - Speed (1x, 2x, 5x, 10x)
   - Jump to stop
   - Export report
```

---

## Emergency Alerts

### View Active Alerts

**Navigation**: Alerts → Active

**Alert List Shows:**
- Alert type (Emergency/Warning/Info)
- Alert message
- Route/bus affected
- Time triggered
- Status (Active/Acknowledged/Resolved)

### Create Manual Alert

**Use Case**: School closure due to weather

**Steps:**
```bash
1. Click "Create Alert" (top-right)
2. Select type:
   - Emergency (red)
   - Warning (yellow)
   - Info (blue)
3. Select scope:
   - Specific route
   - Specific school
   - All routes
4. Write message
5. Choose delivery:
   - Push notification
   - SMS (if configured)
   - Email
6. Click "Send"
7. Confirmation sent to all affected parents
```

### Respond to Driver Alert

**Scenario**: Driver triggered emergency alert

**Steps:**
```bash
1. Alert appears in dashboard
2. Click alert to view details
3. See:
   - Bus location
   - Driver name
   - Alert message
   - Students on board
4. Actions:
   - Call driver (click to call)
   - Send message to driver
   - Dispatch help
   - Notify parents
   - Mark as acknowledged
5. Log response
6. Resolve when situation cleared
```

### Alert Templates

**Navigation**: Alerts → Templates

**Common Templates:**
- Bus breakdown
- Traffic delay
- Weather-related delay
- Route cancellation
- Early dismissal
- Emergency evacuation

**Create Custom Template:**
```bash
1. Alerts → Templates → Create
2. Give template a name
3. Write message (use variables like {{bus_number}}, {{route_name}})
4. Set default recipients
5. Save template
6. Use template for quick alerts
```

---

## Reports and Analytics

### Standard Reports

**Navigation**: Reports → Standard Reports

**Available Reports:**

**1. Daily Trip Report**
- All routes for selected date
- Completion times
- On-time performance
- Incidents

**2. Student Attendance**
- By route or student
- Date range
- Absences and no-shows
- Export to Excel

**3. Driver Performance**
- On-time percentage
- Route compliance
- Incidents
- Comparison across drivers

**4. Fleet Utilization**
- Bus usage by day/week/month
- Miles driven
- Idle time
- Maintenance costs

**5. Cost Analysis**
- Cost per student
- Cost per route
- Fuel costs
- Maintenance costs
- Total transportation budget

### Generate Report

**Steps:**
```bash
1. Reports → Select report type
2. Set parameters:
   - Date range
   - Routes (all or specific)
   - Format (PDF/Excel/CSV)
3. Click "Generate"
4. View in browser or download
5. Option to schedule recurring report
```

### Custom Report Builder

**Navigation**: Reports → Custom Report

**Steps:**
```bash
1. Select data source (routes, students, drivers, etc.)
2. Choose fields to include
3. Add filters
4. Set grouping and sorting
5. Preview report
6. Save as template (optional)
7. Generate and export
```

### Schedule Automated Reports

**Navigation**: Reports → Scheduled Reports

**Steps:**
```bash
1. Select report type
2. Set parameters
3. Choose frequency:
   - Daily
   - Weekly
   - Monthly
4. Select delivery method:
   - Email
   - Save to cloud storage
5. Add recipients
6. Save schedule
```

**Example**: Email daily trip report every morning at 9 AM

---

## System Settings

### Organization Settings

**Navigation**: Settings → Organization

**Configure:**
- Organization name
- Logo upload
- Primary color
- Time zone
- Date format
- Language

### User Management

**Navigation**: Settings → Users

**User Roles:**
- **Super Admin**: Full access
- **Admin**: Most features except system settings
- **Coordinator**: Manage routes, students, drivers
- **Viewer**: Read-only access

**Add New User:**
```bash
1. Settings → Users → Add User
2. Enter email
3. Set name
4. Select role
5. Click "Send Invitation"
6. User receives email with setup link
```

### Integration Settings

**Navigation**: Settings → Integrations

**Available Integrations:**

**1. Student Information System (SIS)**
- Configure API credentials
- Map fields
- Set sync schedule (daily/hourly)
- Test connection

**2. Email Service**
- SMTP settings
- Or use AWS SES, SendGrid
- Test email delivery

**3. SMS Service**
- Twilio configuration
- AWS SNS configuration
- Test SMS delivery

**4. Calendar Integration**
- Google Calendar API
- Microsoft Outlook API
- Sync school calendar

### Notification Settings

**Navigation**: Settings → Notifications

**Configure:**
- Default notification methods (push/SMS/email)
- Alert escalation rules
- Quiet hours (no non-emergency alerts)
- Notification templates

---

## Best Practices

### Daily Workflow

**Morning Routine:**
```bash
1. Check dashboard for today's routes
2. Verify all drivers are assigned
3. Check for any maintenance alerts
4. Review overnight system notifications
5. Monitor AM routes in progress
```

**Afternoon Routine:**
```bash
1. Review AM route completion
2. Prepare for PM routes
3. Check for any student changes
4. Monitor PM routes in progress
```

**End of Day:**
```bash
1. Review daily summary
2. Address any incidents
3. Check for tomorrow's changes
4. Generate daily report (if needed)
```

### Weekly Tasks

- Review driver performance metrics
- Check bus maintenance schedules
- Update any route changes
- Review parent feedback
- Generate weekly reports

### Monthly Tasks

- Driver certification review
- Bus registration/insurance check
- Student roster reconciliation
- Cost analysis review
- System backup verification

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+H` | Go to Home |
| `Ctrl+M` | Open Map View |
| `Ctrl+R` | View Routes |
| `Ctrl+S` | View Students |
| `Ctrl+F` | Search |
| `Ctrl+N` | Create New (contextual) |
| `Escape` | Close modal/dialog |
| `?` | Show help |

---

## Troubleshooting

### Issue: Bus not showing on map

**Causes:**
- GPS device offline
- No recent GPS data
- Bus not assigned to active route

**Solution:**
1. Check GPS device status (Buses → Select bus)
2. Verify route is active
3. Contact driver to check GPS device

### Issue: Parent says they're not receiving notifications

**Solution:**
```bash
1. Students → Find student
2. Check parent contact info is correct
3. Settings → Notifications → Test notification
4. Check parent's app notification settings
5. Verify parent has active account
```

### Issue: Cannot assign student to route

**Causes:**
- Route at capacity
- Stop not on route
- Student already assigned

**Solution:**
1. Check route capacity
2. Verify stop exists on route
3. Remove conflicting assignment
4. Try again

---

## Getting Help

- **In-App Help**: Click `?` icon
- **Video Tutorials**: Settings → Help → Video Library
- **Community Forum**: https://github.com/arvinddhasmana/SBTM_Releases/discussions
- **Email Support**: arvinddhasmana@gmail.com
- **Professional Support**: Available with paid plans

---

**Last Updated**: 2026-04-30
