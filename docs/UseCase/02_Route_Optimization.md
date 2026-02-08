# 🗺️ **Use Case: AI-Assisted Route Optimization**

## 1. Description
This use case details how a **School Administrator** uses the AI Route Optimizer to create efficient bus routes based on student addresses, optimizing for time and distance.

## 2. Actors
- **Primary Actor**: School Administrator
- **Secondary Actor**: AI Route Optimization Service (Internal or External API)

## 3. Pre-conditions
- Students have been imported and have valid addresses/geocoordinates.
- School location is set.
- Vehicles are registered in the system.

## 4. Basic Flow

1. **Initiate Route Planning**
   - Admin navigates to **"Route Planner"**.
   - Selects **"Create New Route"**.
   - Chooses Route Type: `AM (Inbound)` or `PM (Outbound)`.

2. **Select Students**
   - Admin selects a group of students (e.g., by Grade, Neighborhood, or manual selection).
   - System displays students on the map.

3. **AI Optimization**
   - Admin clicks **"Optimize Route"**.
   - Admin selects optimization criteria:
     - *Shortest Time*
     - *Minimum Distance*
     - *Fewer Turns*
   - System sends student coordinates and school location to Optimization API.
   - **System returns**:
     - Suggested ordered list of stops.
     - Expected Arrival Times (ETAs) for each stop.
     - Total route duration and distance.
     - Visual map overlay of the path.

4. **Review and Adjust**
   - Admin reviews the proposed route on the map.
   - **Drag-and-Drop**: Admin drags a stop to a different sequence or location if needed.
   - System re-calculates ETAs instantly.

5. **Bus Assignment**
   - System suggests available buses based on capacity (Student Count vs. Vehicle Capacity).
   - Admin confirms Bus assignment.

6. **Finalize Route**
   - Admin clicks **"Publish Route"**.
   - Route status changes to `Active`.
   - Notifications represent sent to assigned Driver and Parents.

## 5. Alternate Flows
- **Capacity Exceeded**: If selected students exceed bus capacity, System flags a warning and suggests splitting into two routes.
- **Unreachable Stop**: If a student address is invalid, System flags it for manual correction.

## 6. Post-conditions
- A new `Route` entity is created with `SchoolId`.
- `RouteStops` are generated and sequenced.
- Students are assigned to the Route.
