# 🚌 **Use Case: Driver Daily Operations**

## 1. Description
This use case outlines the daily workflow for a **Bus Driver**, including checking into their assigned bus, running AM/PM routes, and managing student boarding/alighting.

## 2. Actors
- **Primary Actor**: Bus Driver
- **Secondary Actor**: GPS Tracking Service, Student Presence Service

## 3. Pre-conditions
- Driver is registered and has a valid account.
- Bus is assigned to the Driver (or available for check-in).
- Route is scheduled for the current time.

## 4. Basic Flow

1. **Login & Bus Check-In**
   - Driver logs into the **Driver App**.
   - **Bus Selection**:
     - *Scenario A*: Driver sees their pre-assigned bus.
     - *Scenario B*: Driver scans a QR code on the bus to "Check In" (Dynamic Assignment).
   - System validates driver is authorized for this bus.

2. **Route Selection**
   - System displays **"Today's Runs"**.
   - Driver selects the current run (e.g., "Route 101 AM").
   - App downloads route data (path, stops, student list).

3. **Pre-Trip Inspection (Compliance)**
   - Driver completes a digital **"Circle Check"** form (Tires, Lights, Safety Arm).
   - Submits form to School Admin.

4. **Start Route**
   - Driver taps **"Start Route"**.
   - App starts broadcasting GPS location to the server.
   - Turn-by-turn navigation begins.

5. **Student Boarding (Stop-by-Stop)**
   - Bus arrives at a stop.
   - **App Display**: Shows list of students expected at this stop.
   - **Validation**:
     - *Scenario A (SmartTag)*: Student taps card. App beeps and marks them "Boarded".
     - *Scenario B (Manual)*: Driver manually taps "Board" next to student name.
   - **Unauthorized Entry**: System alerts if an unassigned student tries to board.

6. **End Route**
   - Driver completes all stops.
   - **"Child Check"**: App prompts driver to walk to the back of the bus to ensure no students are left behind.
   - Driver scans a specific NFC tag/QR code at the rear of the bus to confirm check.
   - Driver taps **"End Route"**.

## 5. Post-conditions
- Route status is updated to `Completed`.
- Presence logs are saved.
- Vehicle is released (if dynamic assignment).
