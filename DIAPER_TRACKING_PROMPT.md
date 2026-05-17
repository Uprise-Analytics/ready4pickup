# Diaper Tracking Feature - Implementation Prompt

## Overview
Implement a comprehensive diaper change tracking system for babies in the Ready4Pickup app. This feature allows teachers to log diaper changes via QR code scanning, sends real-time notifications to parents, and provides analytics dashboards with weekly/monthly trends and time-based insights.

## Core Requirements

### 1. Data Model & Database Changes

#### New Table: `baby_classes`
- `id` (UUID, PK)
- `school_id` (UUID, FK to schools)
- `name` (text, UNIQUE per school) - e.g., "Infants", "Newborns", "Baby Room"
- `description` (text, nullable)
- `created_at` (timestamp)
- `updated_at` (timestamp)

#### Modify Table: `children`
- Add: `baby_class_id` (UUID, FK to baby_classes, nullable)
- Add: `is_baby_class_enrollment` (boolean, default: false)
- Add: `qr_code` (text, UNIQUE, nullable) - generated on enrollment to baby class

#### New Table: `diaper_changes`
- `id` (UUID, PK)
- `child_id` (UUID, FK to children)
- `teacher_id` (UUID, FK to users)
- `school_id` (UUID, FK to schools)
- `changed_at` (timestamp) - when diaper change occurred
- `logged_at` (timestamp) - when teacher logged it (via QR scan or manual)
- `notes` (text, nullable) - optional notes about the change

#### New Table: `parent_diaper_settings`
- `id` (UUID, PK)
- `parent_user_id` (UUID, FK to users)
- `child_id` (UUID, FK to children)
- `notification_enabled` (boolean, default: true)
- `created_at` (timestamp)

### 2. Backend Implementation (Supabase Functions)

#### Function: `log-diaper-change`
**Endpoint**: POST `/functions/v1/log-diaper-change`
**Input**:
```json
{
  "child_id": "uuid",
  "teacher_id": "uuid",
  "qr_code": "string (optional - for QR scanning)",
  "changed_at": "timestamp (optional - defaults to now)",
  "notes": "string (optional)"
}
```
**Output**: Returns created diaper_change record
**Logic**:
1. Validate child exists and is in a baby class
2. Validate teacher has permission for this school
3. Create diaper_change record
4. Trigger real-time notification to child's parents
5. Return confirmation with timestamp

#### Function: `get-diaper-analytics`
**Endpoint**: GET `/functions/v1/get-diaper-analytics`
**Query Parameters**:
- `child_id` (UUID, required)
- `date_from` (timestamp, required)
- `date_to` (timestamp, required)
- `group_by` (enum: "daily", "weekly", "monthly", default: "weekly")
**Output**:
```json
{
  "total_changes": number,
  "average_per_day": number,
  "trend_data": [
    {
      "period": "string",
      "count": number,
      "timestamp": "timestamp"
    }
  ]
}
```

#### Function: `get-diaper-timeline`
**Endpoint**: GET `/functions/v1/get-diaper-timeline`
**Query Parameters**:
- `child_id` (UUID, required)
- `date` (date, required) - single day to inspect
**Output**:
```json
{
  "date": "date",
  "changes": [
    {
      "id": "uuid",
      "teacher_name": "string",
      "changed_at": "timestamp",
      "logged_at": "timestamp",
      "notes": "string (nullable)"
    }
  ]
}
```

#### Function: `generate-qr-code`
**Endpoint**: POST `/functions/v1/generate-qr-code`
**Input**:
```json
{
  "child_id": "uuid"
}
```
**Output**: Returns QR code string/data that encodes the child_id
**Note**: Call automatically on baby class enrollment; return QR code for printing/display

### 3. Mobile App UI/UX Changes

#### Enrollment Page (`app/(auth)/link-child.tsx` or relevant signup flow)
**Add to existing enrollment form**:
- Dropdown: "Class" (required) - populated from baby_classes for the school
- Conditional Dropdown: "Is this a baby class enrollment?"
  - If YES → Show "Baby Class" dropdown (pre-populated list of baby classes)
  - If YES AND baby class selected → Show QR code generation button
  - If YES → Automatically enable diaper tracking for this child

#### Teacher Dashboard - New Section: "Diaper Changes Log"
**Location**: `app/(teacher)` or new tab in teacher view
**Components**:
1. **QR Scanner Widget**: 
   - Animated QR code scanner
   - On scan → Auto-logs diaper change for that child
   - Shows: child's name, confirmation, timestamp
   - Optional notes field
   - "Log" and "Cancel" buttons

2. **Manual Logging Fallback**:
   - Child name/photo search/selection dropdown
   - Timestamp picker (defaults to now)
   - Optional notes field
   - Submit button

3. **Today's Log Table**:
   - Shows all diaper changes logged today
   - Columns: Child Name | Time | Teacher | Notes
   - Sortable, filterable

#### Parent Dashboard - New "Diaper Tracker" Section
**Location**: `app/(parent)/` - new tab or collapsible section
**Components**:

1. **Quick Stats Card**:
   - "Today's Changes: X"
   - "This Week: X"
   - Highlighted in bright/friendly colors

2. **Graph 1: Weekly View**
   - X-axis: Days (Mon-Sun)
   - Y-axis: Number of changes
   - Bar chart showing daily counts for current week
   - Interactive: click bar to see detailed timeline

3. **Graph 2: Monthly View**
   - X-axis: Weeks of month
   - Y-axis: Number of changes
   - Line chart with trend indicators
   - Shows 4-week rolling average

4. **Graph 3: Time-Based Timeline**
   - Calendar widget to select specific date
   - Once date selected, shows detailed breakdown:
     - Timeline of exact times diaper was changed
     - Teacher name for each change
     - Any notes added
   - Visual timeline format (e.g., 09:30 AM, 12:15 PM, 03:45 PM)

5. **Settings Toggle**:
   - Enable/disable diaper change notifications for each child

### 4. Real-Time Notifications

#### On Diaper Change Logged
**Send to**: Child's parents (via registered notification channels)
**Notification Content**:
```
"[Child Name]'s diaper was changed at [TIME] by [Teacher Name]"
```
**Include**:
- Timestamp of change
- Teacher name
- Deep link to diaper tracker
- Any notes if provided

**Push Notification**: Immediate
**In-App Notification**: Real-time via Supabase realtime subscriptions
**Email**: Optional (per parent preference)

### 5. Security & Validation

#### Row-Level Security (RLS) Policies
1. `baby_classes`: Parents can read baby classes for their school; teachers can read
2. `diaper_changes`: 
   - Teachers can INSERT only for their school
   - Parents can READ only for their children
   - Teachers can READ only for their school's children
3. `parent_diaper_settings`: Users can only modify their own settings

#### QR Code Security
- QR codes encode only child_id
- QR code access is verified via teacher's school authorization
- QR codes are unique per child in baby class
- Consider: expiration/regeneration strategy (optional: rotate monthly)

### 6. Configuration & Feature Flags

**Conditional Display**:
- Diaper tracking section only shows if child is enrolled in baby class
- Teacher diaper logging UI only available if authenticated teacher
- Parent graphs only show for children in baby classes

### 7. Implementation Checklist

**Database**:
- [ ] Create `baby_classes` table
- [ ] Modify `children` table with baby_class_id, is_baby_class_enrollment, qr_code
- [ ] Create `diaper_changes` table
- [ ] Create `parent_diaper_settings` table
- [ ] Write RLS policies for new tables
- [ ] Create indexes on frequently queried columns

**Backend (Supabase)**:
- [ ] Implement `log-diaper-change` function with validation & notification trigger
- [ ] Implement `get-diaper-analytics` function with grouping logic
- [ ] Implement `get-diaper-timeline` function with filtering
- [ ] Implement `generate-qr-code` function
- [ ] Create trigger to send notifications on diaper_changes INSERT
- [ ] Create test cases for each function

**Frontend - Enrollment**:
- [ ] Add class dropdown to enrollment form
- [ ] Add conditional baby class selector
- [ ] Add QR code display/print after baby class enrollment

**Frontend - Teacher Dashboard**:
- [ ] Create QR scanner component (use expo-camera or similar)
- [ ] Create manual logging form
- [ ] Create today's log display table
- [ ] Add success/error feedback

**Frontend - Parent Dashboard**:
- [ ] Create quick stats card
- [ ] Implement weekly bar chart (use ChartJS, react-native-chart, or similar)
- [ ] Implement monthly line chart
- [ ] Implement date picker with time-based timeline display
- [ ] Add notification preference toggle
- [ ] Create real-time subscription to diaper_changes for logged-in parent

**Testing & Deployment**:
- [ ] E2E test: Enrollment → QR generation → Teacher scan → Parent notification
- [ ] Test analytics calculations with various time ranges
- [ ] Performance test: analytics with 1000+ diaper changes
- [ ] Test notifications delivery

### 8. Tech Stack Recommendations

**Charts**: 
- React Native: `react-native-chart-kit` or `react-native-svg`
- Web: `Chart.js` or `Recharts`

**QR Code**:
- Generation: `qrcode.react` (web), `qrcode.js` (universal)
- Scanning: `expo-camera` + QR decoding library

**Real-time**: Supabase realtime subscriptions (already integrated)

**Date/Time**: `date-fns` or `dayjs`

### 9. User Flow Summary

**Enrollment Flow**:
1. Parent creates account, selects school
2. Parent selects "Link Child" → needs Class dropdown
3. Parent selects baby class → Triggered baby enrollment mode
4. System generates QR code for that child
5. Parent sees QR code to print/display in classroom

**Teacher Flow**:
1. Teacher logs in, navigates to "Diaper Changes"
2. Teacher opens QR scanner
3. Teacher scans baby's QR code
4. System logs change, shows confirmation
5. Child's parents receive notification instantly

**Parent Flow**:
1. Parent opens app, navigates to child's "Diaper Tracker"
2. Parent sees today's count, weekly/monthly graphs
3. Parent clicks on specific week/month for details
4. Parent selects date using calendar to see exact times
5. Parent receives push notification each time diaper is changed

---

## Success Metrics
- Teachers can log diaper change in < 5 seconds (QR scan to confirmation)
- Parents receive notification within < 30 seconds of logging
- Analytics load within < 2 seconds for any 3-month date range
- Visual clarity: at-a-glance parent understanding within 3 seconds

---

## Notes
- Consider phased rollout: Week 1 (backend), Week 2 (teacher UI), Week 3 (parent UI)
- QR codes can be printed on stickers for baby cribs/mats in classroom
- Future enhancement: Send weekly summary emails to parents
- Accessibility: Ensure charts are accessible; provide data exports as CSV/PDF
