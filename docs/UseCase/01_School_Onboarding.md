# 🏫 **Use Case: School Onboarding & Configuration**

## 1. Description
This use case describes how an **OSTA Super Admin** creates a new School Board and School within the SBTM system, configures essential details (location, hours), and assigns a School Administrator.

## 2. Actors
- **Primary Actor**: OSTA Super Admin
- **Secondary Actor**: School Administrator (User being invited)

## 3. Pre-conditions
- OSTA Super Admin is logged into the Admin Dashboard.
- The new School Board (if applicable) does not yet exist.

## 4. Basic Flow

1. **School Board Creation**
   - Admin navigates to **"Organization Management"**.
   - Clicks **"Add School Board"**.
   - Enters Board Name (e.g., "Ottawa Catholic School Board") and Contact Info.
   - System validates uniqueness and creates the Board.

2. **School Creation**
   - Admin selects the School Board.
   - Clicks **"Add School"**.
   - Enters:
     - School Name (e.g., "St. Emily Elementary")
     - Address (System auto-fetches geocoordinates via Mapbox/Google Maps API)
     - Operating Hours (Start Time, End Time)
     - Contact Number
   - System validates address and saves the School record.

3. **Administrator Assignment**
   - Admin navigates to **"Users"** tab within the new School.
   - Clicks **"Invite School Admin"**.
   - Enters Email and Name of the School Administrator.
   - System generates an invitation link and sends an email.

4. **School Admin Activation**
   - School Admin receives email, clicks link.
   - Sets password.
   - Logging in directs them to their **School-Scoped Dashboard**.

## 5. Post-conditions
- A new School entity exists in the database.
- A new User with `SCHOOL_ADMIN` role is linked to that School.
- The School Admin can *only* see data for their specific school.
