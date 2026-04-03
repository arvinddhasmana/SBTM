# Parent Guide

- Document owner: Product and Operations
- Last reviewed: 2026-04-02
- Primary use: Parent-facing guide for child tracking, notifications, absence reporting, and safety visibility

---

## Your Role in SBTM

As a **Parent**, you use the Parent Portal to monitor your child's school bus in real time. You can see where the bus is, whether your child has boarded, receive safety alerts when something requires attention, report absences, and manage your notification preferences.

---

## Your Quick-Start Checklist

When you open the Parent Portal:

- [ ] Log in with your email and password
- [ ] Verify your children appear on the dashboard
- [ ] Select a child to open the live map view
- [ ] Check that the bus location is updating (green dot on map)
- [ ] Note any alert banners at the top of the screen
- [ ] Review your notification preferences in Settings (v4)
- [ ] Enable push notifications on your device/browser (v4)

---

## What You Can Do Today

| Capability                                        | Status       |
| ------------------------------------------------- | ------------ |
| Sign in to the parent portal                      | Available    |
| View children linked to your account              | Available    |
| Open live route tracking for a child              | Available    |
| Review current bus position on map                | Available    |
| Report child absence                              | Available    |
| View notification history                         | Available    |
| Receive push notifications for boarding/alighting | Planned (v4) |
| Receive push + SMS for emergency alerts           | Planned (v4) |
| Manage notification preferences                   | Planned (v4) |
| View ETA and next-stop detail                     | Planned (v4) |
| Receive route change notifications                | Planned (v4) |

## Typical Parent Workflow

### Current

1. Sign in to the parent portal.
2. Review the child cards on the dashboard.
3. Select a child and open the live map.
4. Watch the current bus position update.

### v4 Target Experience

**Morning (AM Route):**

1. Receive push notification when driver starts AM route (optional, configurable).
2. Receive push notification: "Bus is approximately 5 minutes from [Stop Name]" (v4).
3. Receive push notification: "[Child Name] boarded bus at [Stop Name] at 7:23 AM" (v4).
4. Open live map if desired to watch bus progress toward school.
5. Receive push notification: "[Child Name] has arrived at school at 7:48 AM" (v4).

**Afternoon (PM Route):**

1. Receive push notification when driver starts PM route (optional, configurable).
2. Open live map to track bus approaching your stop.
3. Receive push notification: "[Child Name] alighted from bus at [Stop Name] at 3:15 PM" (v4).

**Emergency:**

1. Receive push notification + SMS: "EMERGENCY on [Route Name]. Bus carrying [Child Name] has reported a [Incident Type] at [Time]. School has been notified. Updates will follow." (v4)
2. Open the parent portal for live updates.
3. Receive resolution notification when the situation is resolved: "Alert resolved. [Summary]." (v4)

**Absence Reporting:**

1. Open Parent Portal -> Absence Report page.
2. Select child, date, and route type (AM, PM, or Both).
3. Add optional notes (e.g., "doctor's appointment").
4. Submit. Receive confirmation: "Absence reported for [Child] on [Date]."
5. School Admin is notified. Driver's roster is updated.
6. To cancel: open the absence report and cancel before the route date.

## Notification Preferences (v4)

When v4 is delivered, you can configure your notification preferences in Settings:

| Setting                              | Options                        | Default      |  Can Disable?  |
| ------------------------------------ | ------------------------------ | ------------ | :------------: |
| Emergency alerts (safety)            | Push + SMS                     | Push + SMS   | No (always on) |
| Child boarding notification          | Push / In-app only / Off       | Push         |      Yes       |
| Child alighting notification         | Push / In-app only / Off       | Push         |      Yes       |
| Bus approaching your stop            | Push / Off                     | Push         |      Yes       |
| Route start/complete                 | Push / Off                     | Off          |      Yes       |
| Route changes affecting your child   | Push + Email / Email only      | Push + Email |       No       |
| Daily summary email                  | Email / Off                    | Off          |      Yes       |
| Quiet hours (suppress non-emergency) | Time range (e.g., 9 PM - 6 AM) | 9 PM - 6 AM  |      Yes       |

**Important:** Emergency alerts (PANIC, MEDICAL, INCIDENT) cannot be disabled and will always be delivered regardless of quiet hours or other settings. This is a safety requirement.

## Privacy and Consent (v4)

During your first login (after onboarding), you will be asked to:

1. Review the SBTM Privacy Notice explaining how your child's transport data is used.
2. Accept the consent form for child location tracking and notification delivery.
3. Your consent is recorded with a timestamp and the version of the privacy policy you accepted.
4. You can withdraw consent at any time through Settings. Withdrawing consent will disable tracking and notifications for your child. Contact your school admin to discuss implications.

## Troubleshooting

| Problem                          | Solution                                                                              |
| -------------------------------- | ------------------------------------------------------------------------------------- |
| Live location looks stale        | The route may not have new GPS data yet; check that the bus route is active           |
| Child does not appear            | Verify that the account is linked to the correct student record; contact school admin |
| Not receiving push notifications | Enable notifications in browser/device settings; check preferences in Settings (v4)   |
| Expected a proactive alert       | Notification delivery is available from v4; check your notification preferences       |
| Map is blank                     | Check browser console (F12) for 403 errors; contact school admin                      |
| Absence report not reflected     | Allow a few minutes for sync; contact school admin if issue persists                  |

## Privacy Notes

- Parent access is limited to linked children and their route context.
- Tracking data should be viewed only for legitimate student-care and transport needs.
- Your notification preferences are respected for all non-emergency events.
- Your consent to child tracking can be withdrawn at any time.
- See [v4 Alert Strategy](../../prd/v4/AlertStrategy.md) for the complete notification model.
