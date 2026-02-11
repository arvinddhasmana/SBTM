# 📋 SBTM Multi-Tenant Upgrade Feature List

This document outlines the detailed feature set required to upgrade the School Bus Transport Management (SBTM) system to a multi-tenant, OSTA-compliant platform.

## 1. Core Multi-Tenancy & Administration

### 1.1 hierarchical Organization Management
- **School Board Management**: Ability for super-admins (OSTA) to create and manage School Boards/Consortia.
- **School Management**:
  - Create, update, and manage individual schools.
  - Define school locations (address, geocoordinates for geofencing).
  - Set operating hours and contact details.
  - **[New]** Assign schools to specific School Boards.
- **Data Isolation**: Strict logical separation of data (students, routes, buses) by School ID at the database level.

### 1.2 Enhanced Role-Based Access Control (RBAC)
- **OSTA Admin (Super Admin)**:
  - Global view of all schools, routes, and buses.
  - Cross-school reporting and analytics.
  - System-wide configuration.
- **School Admin**:
  - Scoped access to only their specific school's data.
  - Manage routes, students, and drivers for their school.
  - View alerts and reports for their school only.
- **Driver & Parent Roles**:
  - Inherit school-scoped permissions based on assigned routes/children.

---

## 2. Advanced Route Management

### 2.1 Route Planning & Optimization **[AI Powered]**
- **AI Route Optimizer**:
  - Automatic stop sequencing based on student addresses and traffic data.
  - Optimization for shortest path, minimum time, or fuel efficiency.
  - **[New]** Integration with mapping services (e.g., Mapbox/OpenRouteService) for visual route editing.
- **AM/PM Route Pairing**:
  - Distinct route definitions for Morning (Inbound) and Afternoon (Outbound) runs.
  - Logical pairing of AM/PM routes for consistent driver assignment.
- **Stop Management**:
  - Visual drag-and-drop interface for adding/moving stops.
  - Define safe pick-up/drop-off zones per stop.
  - Assign specific students to specific stops.

### 2.2 Route Operations
- **Single-School Coupling**: Enforce 1:1 relationship between a Route and a School.
- **Geo-fencing**:
  - Auto-generate geofences for routes and stops.
  - Configurable deviation thresholds (distance/time).

---

## 3. Fleet & Driver Operations

### 3.1 Bus/Vehicle Management
- **Vehicle Registry**:
  - Manage vehicle profiles (License Plate, VIN, Make/Model, Capacity).
  - Track vehicle status (Active, Maintenance, Retired).
  - Assign vehicles to specific Schools or Contractors.
- **Bus-Route Assignment**:
  - **[New]** Strict validation: 1 Bus assigned to 1 Route at a time.
  - Schedule-based assignment (e.g., Bus A for Route 101 AM, Route 101 PM).

### 3.2 Driver Management
- **Driver Profiles**:
  - manage driver details, certifications, and license expiry.
  - **[New]** Background check status tracking.
- **Driver-Bus Association**:
  - Assign drivers to specific buses (permanent or shift-based).
  - **[New]** Digital "Check-in/Check-out" for drivers to confirm bus assignment via app.

---

## 4. Student Safety & Parent Engagement

### 4.1 Student Management
- **Student Repository**:
  - Centralized student database linked to Schools.
  - Bulk import/export capabilities (CSV/Excel) for school admins.
- **Route Assignment**:
  - Assign students to logic AM/PM routes and specific stops.
  - **[New]** "Child Left Behind" prevention features (post-trip bus scan requirements).

### 4.2 Parent App Enhancements
- **Multi-Child Support**: Support for parents with children in different schools/buses.
- **Absence Reporting**: Allow parents to mark child as "Absent" for specific dates/runs.
- **Notification Preferences**: Granular control over push/SMS/Email alerts per child.

---

## 5. Compliance, Reporting & Safety

### 5.1 Operational Intelligence
- **School-Scoped Dashboards**:
  - Real-time view of all buses for a specific school.
  - On-time performance metrics per route/school.
- **OSTA Global Dashboard**:
  - Aggregated view of network health.
  - Critical alert monitoring across all schools.

### 5.2 Safety & Compliance
- **Video Event Association**: Link video events to specific Routes/Schools for easier retrieval.
- **Incident Reporting**: Digital forms for drivers to report incidents, automatically routed to School Admin.
- **Audit Logs**: Full traceability of route changes, student assignments, and manual overrides.
