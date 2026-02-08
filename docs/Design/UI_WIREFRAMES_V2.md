# 🖼️ **UI Wireframes V2: Multi-Tenant Interfaces**

## 1. OSTA Super Admin Dashboard (Web)

### 1.1 Global Overview
- **Header**: "OSTA Command Center" | [Alerts Bell] | [User Profile]
- **Map View**: Full region map with clustered bus icons (Green/Yellow/Red status).
- **Sidebar**:
  - `Dashboard`: Aggregate stats (Total Active Buses, On-Time %).
  - `Organizations`: Manage School Boards.
  - `Global Reports`: System-wide performance.

### 1.2 School Board Management
- **List View**: Table of School Boards (Name, Region, # Schools).
- **Action**: `[+ Add Board]` button.
- **Detail View**: Board profile, list of associated schools.

---

## 2. School Administrator Portal (Web)

### 2.1 Route Planner
- **Layout**: Split screen (Left: List, Right: Map).
- **Left Panel**:
  - **Route List**: `101-AM`, `101-PM`, `102-AM`...
  - **Editor Form**: Name, Bus Assignment (Dropdown), Driver (Dropdown).
  - **Stops**: Drag-and-drop list of stops.
- **Right Panel (Map)**:
  - Interactive map showing route path.
  - **Optimize Button**: Triggers AI re-sequencing.
  - **Geofence Editor**: Visual polygon tool for adjusting stop zones.

### 2.2 Student Roster
- **Table**: Student Name, Grade, Guardian, AM Route, PM Route.
- **Filters**: By Route, By Grade, Unassigned.
- **Bulk Action**: `Import CSV`, `Assign to Route`.

---

## 3. Driver App (Mobile) - UPDATED

### 3.1 Bus Check-In (New)
- **Screen**: "Confirm Vehicle"
- **Content**:
  - "You are assigned to **Bus 42**."
  - **Action**: `[Confirm Bus]` or `[Scan QR Code]` (for dynamic assignment).
  - **Check**: "Is safety inspection complete?" (Checkbox).

### 3.2 Live Route
- **Header**: Next Stop: "Main St & 1st Ave" (ETA: 2 min).
- **Body**: Turn-by-turn map.
- **Footer**:
  - `[Board Student]` (Opens list).
  - `[Panic]` (Red button, hold 3s).

### 3.3 Post-Trip Child Check (New)
- **Prompt**: "Route Complete. Please walk to the back of the bus."
- **Action**: "Scan NFC Tag at Rear Door".
- **Confirmation**: "Child Check Verified. Route Ended."

---

## 4. Parent App (Mobile) - UPDATED

### 4.1 Multi-Child Home
- **Cards**: One card per child.
  - **Child A (School X)**: Bus 42 is Arriving in 5 mins.
  - **Child B (School Y)**: Bus 10 has arrived at school.
- **Action**: `[Report Absence]` button on each card.
