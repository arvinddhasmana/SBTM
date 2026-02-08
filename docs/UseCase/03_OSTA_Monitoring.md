# 🦅 **Use Case: OSTA System-Wide Monitoring**

## 1. Description
This use case describes how an **OSTA Super Admin** monitors the health, safety, and performance of the entire transportation network across multiple schools and boards.

## 2. Actors
- **Primary Actor**: OSTA Super Admin

## 3. Pre-conditions
- Multiple schools have active buses running routes.
- GPS and Alert services are operational.

## 4. Basic Flow

1. **Dashboard Overview**
   - Admin logs in and sees the **"Global Command Center"**.
   - **Key Metrics Displayed**:
     - Total Active Buses.
     - On-Time Performance (%).
     - Active Critical Alerts (Panic, Accident, Breakdown).

2. **Geospatial Monitoring**
   - Admin views a map of the entire region.
   - Buses are color-coded:
     - 🟢 Green: On Time
     - 🟡 Yellow: Delayed (>10 mins)
     - 🔴 Red: Critical Alert / Stopped Unexpectedly
   - Admin filters map by **School Board** or **Specific School**.

3. **Handling Critical Alerts**
   - A **Panic Button** alert triggers on the dashboard (Sound + Visual Flash).
   - Admin clicks the alert.
   - **System Displays**:
     - Live location of the bus.
     - Driver details and contact info.
     - Validated list of students on board.
     - **Video Feed**: Option to request "Live Look-in" (if supported).
   - Admin acknowledges the alert and initiates **Escalation Protocol** (e.g., contact Police/EMS).

4. **Performance Reporting**
   - Admin navigates to **"Reports"**.
   - Generates "Weekly On-Time Performance" report for all schools.
   - Identifies schools with chronic delays.

## 5. Post-conditions
- Alerts are acknowledged and resolved.
- System performance data is aggregated for reporting.
