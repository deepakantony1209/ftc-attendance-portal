# Product Requirements Document (PRD)

## 1. Executive Summary
The **FTC Choir Attendance Portal** is a specialized web application designed to digitize and streamline the management of the Fatima Tamil Choir (FTC). It replaces manual attendance tracking with a centralized, role-based system that handles member profiles, team organizations, attendance logging, and automated performance reporting. The system incentivizes participation through a points-based "credit" system and ensures fair rotation for Sunday duties.

## 2. Product Vision
To foster a disciplined yet engaged choir community by providing transparent, data-driven insights into member participation, automating administrative burdens, and ensuring equitable distribution of responsibilities.

## 3. Problem Statement
- **Manual Tracking**: Physical registers are prone to errors and loss.
- **Opacity**: Members lack visibility into their own attendance records and standing.
- **Complex Scheduling**: manually rotating teams for Sunday masses while balancing gender and roles (e.g., Organists) is tedious.
- **Calculation Errors**: Manually calculating attendance percentages and "excuse" balances for annual reports is time-consuming and error-prone.

## 4. Goals & Success Metrics
- **Goals**:
  - Digitize 100% of attendance records.
  - Automate Sunday mass team scheduling for 12-week cycles.
  - Provide instant access to attendance statistics for all members.
- **Success Metrics**:
  - Reduction in admin time spent on reporting (target: <5 mins/month).
  - Improvement in average member attendance (monitored via Dashboard charts).
  - zero scheduling conflicts for Sunday masses.

## 5. User Personas
### 5.1 Admin
- **Role**: Choir Leadership / Committee.
- **Responsibilities**: Manage members, create teams, generate schedules, mark attendance, view all reports.
- **Needs**: Efficiency, bulk actions, accurate data export.

### 5.2 Choir Member
- **Role**: Regular singer/musician.
- **Responsibilities**: Attend events, view own stats, update personal profile.
- **Needs**: Transparency, mobile-friendly access to stats, clarity on "excuse" balance.

## 6. User Journeys
### 6.1 Admin Flow
1. **Login**: Admin logs in via email/password.
2. **Dashboard**: Views overall attendance trends and team summaries.
3. **Attendance**: Navigates to "Record Attendance", selects date/event.
4. **Marking**: Uses "Bulk Mark" to set all to Present, then adjusts specific absentees. Enters reasons for excused members.
5. **Reporting**: Downloads monthly/yearly PDF reports for meetings.

### 6.2 Member Flow
1. **Login**: Member logs in.
2. **My Stats**: Immediately sees current year attendance %, excuse balance, and points breakdown.
3. **Profile**: Updates phone number or address if changed.
4. **History**: Reviews past attendance to dispute any errors.

## 7. Functional Requirements

### 7.1 Authentication & User Management
- **FR-001**: System SHALL support Email/Password authentication via Firebase Auth.
- **FR-002**: System SHALL support "Forgot Password" functionality.
- **FR-003**: Admins SHALL be able to create new members (creating both Auth account and Firestore profile).
- **FR-004**: Users SHALL be able to update their own profile (Phone, Address, Marital Status).
- **FR-005**: System SHALL sync Firebase Auth email with Firestore profile if changed.
- **FR-006**: System SHALL support distinct roles: `admin` and `user`.

### 7.2 Member Management
- **FR-007**: Admins SHALL manage member details: Name, Gender, DOB, Phone, Email, Anbiyam, Address, Marital Status, Wedding Date.
- **FR-008**: Admins SHALL assign special attributes: `Organist`, `Sound Engineer`, `Presentation Specialist`.
- **FR-009**: System SHALL allow deletion of members (cleanup of Firestore data).

### 7.3 Team Management
- **FR-010**: Admins SHALL create Teams categorized by `Sunday` or `Marriage`.
- **FR-011**: System SHALL sort team members with priority: Organist → Female → Male → Alphabetical.
- **FR-012**: Admins SHALL be able to add/remove members from teams via a UI.
- **FR-013**: System SHALL support PDF export of Team lists.

### 7.4 Schedule Management
- **FR-014**: System SHALL auto-generate a 12-week rotation schedule for Sunday Evening Mass.
- **FR-015**: Schedule rotation SHALL follow a round-robin format based on team name.
- **FR-016**: Admins SHALL be able to manually override a scheduled week (e.g., assign "All Choir" or "NA").

### 7.5 Attendance Logging
- **FR-017**: Admins SHALL log attendance for specific configurations: `Date` + `Section` (Event Type).
- **FR-018**: Supported Event Types: `Daily mass`, `Saturday practice`, `Sunday morning mass`, `Sunday evening mass`, `Special mass practice`, `Special mass`, `Marriage mass`, `Choir meeting`, `Cleaning`, `Others`.
- **FR-019**: System SHALL require an `Event Name` for generic sections (Special mass, Others).
- **FR-020**: System SHALL require a `Scheduled Team` selection for Sunday Evening Mass.
- **FR-021**: Attendance Statuses: `Present`, `Absent`, `Excused`, `Excused but Present`.
- **FR-022**: System SHALL require a text `Reason` for `Excused` or `Excused but Present` statuses.
- **FR-023**: System SHALL support "Bulk Mark" (Present/Absent) to speed up data entry.

### 7.6 Scoring & Reporting Logic
- **FR-024**: System SHALL calculate points based on Event Type:
  - Special mass/practice check: 40-50 pts
  - Sunday masses: 30 pts
  - Practice: 25 pts
  - Meeting: 15 pts
  - Others: 10 pts
- **FR-025**: System SHALL apply status multipliers:
  - Present: 1.0 (100%)
  - Absent: 0.0 (0%)
  - Excused but Present: 0.4 (40%)
  - Excused: 0.2 (20%)
- **FR-026**: **Excused Limit Rule**: If a member uses >2 Excused statuses in a single month, subsequent Excused statuses count as `Absent` (0 points).
- **FR-027**: **Rotation Bonus Rule**: If a member attends Sunday Evening Mass when their team is NOT scheduled, they receive attendance credit (points) without it counting towards the denominator if they were absent (Optional attendance).
- **FR-028**: System SHALL generate PDF reports (Yearly/Monthly) containing summary stats and detailed logs.

## 8. Non-Functional Requirements
- **NFR-001**: **Performance**: Dashboard data should load within 2 seconds.
- **NFR-002**: **Security**: Firestore Rules must restrict write access to Admins only (except specific user profile fields).
- **NFR-003**: **Reliability**: Offline tolerance is not required (web-only).
- **NFR-004**: **Usability**: UI must be responsive (Mobile/Desktop) and support Dark/Light modes.
- **NFR-005**: **Scalability**: Capable of handling 5+ years of attendance history for ~100 members.

## 9. System Architecture Overview
- **Frontend**: React.js (CRA), React Bootstrap for UI.
- **State Management**: Local State + React Hooks.
- **Backend (BaaS)**: Firebase (Auth & Firestore).
- **Routing**: React Router v6 (Client-side routing).
- **Charts**: Chart.js for data visualization.

### Component Diagram (Simplified)
\`\`\`mermaid
graph TD
    App --> AuthProvider
    AuthProvider --> Dashboard
    AuthProvider --> AttendanceForm
    AuthProvider --> MyStats
    AuthProvider --> MemberReport
    AttendanceForm --> Firestore
    MyStats --> Firestore
    AttendanceForm --> ScheduleUtils
\`\`\`

## 10. Data Model Overview (Firestore)

### `choirMembers`
| Field | Type | Description |
|-------|------|-------------|
| id | string | Auth UID |
| name | string | Full Name |
| email | string | Login Email |
| role | string | 'admin' \| 'user' |
| phone | string | Contact |
| isOrganist | boolean | Role flag |
| ... | ... | Other profile fields |

### `attendanceHistory`
| Field | Type | Description |
|-------|------|-------------|
| id | string | Auto-gen ID |
| date | string | ISO Date YYYY-MM-DD |
| section | string | Event Type |
| scheduledTeamId | string | ID of team responsible (if Sunday mass) |
| records | array | Array of objects: `{id, status, reason}` |

### `teams`
| Field | Type | Description |
|-------|------|-------------|
| id | string | Auto-gen ID |
| name | string | "Team A", "Team B" |
| type | string | 'sunday' \| 'marriage' |
| members | array | Array of member UIDs |

### `sundaySchedule`
| Field | Type | Description |
|-------|------|-------------|
| date | string (Doc ID) | YYYY-MM-DD |
| teamId | string | Assigned Team ID |
| ... | ... | Metadata |

## 11. API & Integration Overview
- **Firebase SDK**: Direct integration for all DB operations.
- **No External APIs**: The system is self-contained within Firebase ecosystem.

## 12. Security & Compliance Considerations
- **Authentication**: Strict Email/Password policy.
- **Authorization**:
  - UI hides Admin routes based on `user.role`.
  - *Note: Firestore rules should mirror this to prevent API-level tampering.*
- **Data Privacy**: Members can only see their own stats (MyStats), Admins see all.

## 13. Risks & Technical Constraints
- **Data Integrity**: Attendance records are stored as arrays within a document. Large events might hit Firestore document size limits (highly unlikely for a choir size).
- **Hardcoded Logic**: Point values and Admin email (`fathimatamilchoir@gmail.com`) are hardcoded in the frontend source. Changing admin requires a code deployment.
- **Date Handling**: Heavy reliance on client-side Date objects and exact string matching (`YYYY-MM-DD`). Timezone issues could occur if admins manage from different zones.

## 14. Edge Cases & Error Handling
- **Duplicate Attendance**: Preventing multiple entries for the same section/date (Currently validated in UI?).
- **Deleted Member**: Handling historical attendance records for members who are deleted (records persist but member lookup might fail).
- **No Team Scheduled**: Admin warning if trying to save Sunday Mass attendance without a scheduled team.
- **Email Desync**: Specific handling for when a user changes email in Auth but Firestore isn't updated (handled via `syncEmailOnLogin`).
- **Long Term Leave**: Members on long-term leave are marked as 'Excused' for each event. They are subject to the monthly excuse limit (FR-026) to reflect their lack of participation in the score, while acknowledging the valid reason in the history logs.

## 15. Future Enhancements
- **Dynamic Config**: Move `pointValues` and `adminEmail` to a Firestore "Config" collection to allow updates without code changes.
- **Notification System**: Push notifications for schedule reminders.
- **Audit Logs**: Track who changed attendance records and when.
- **Mobile Native**: PWA or React Native wrapper for better mobile experience.


