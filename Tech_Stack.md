# Technical Stack Document

## 1. Architectural Overview
### Architecture Style: **Modular Monolith (Serverless / BaaS)**
The system leverages Google **Firebase** as a Backend-as-a-Service (BaaS) provider, handling Authentication, Database, and Hosting. The core application logic resides in the Frontend (React SPA) which communicates directly with Firebase via SDKs, supplemented by **Cloud Functions** for event-driven backend logic (e.g., scheduled tasks, complex aggregations).

### System Diagram Explanation
-   **Client (SPA)**: React application hosted on Firebase Hosting (CDN).
-   **Auth Layer**: Firebase Authentication (Identity Provider).
-   **Data Layer**: Cloud Firestore (NoSQL Document Store).
-   **Business Logic**:
    -   *Presentation Logic*: Within React Components.
    -   *Core Business Rules*: Validated via Firestore Security Rules.
    -   *Async/Scheduled Jobs*: Firebase Cloud Functions (Node.js environment).

### Data Flow Overview
1.  **User Action**: User interacts with UI (e.g., "Mark Attendance").
2.  **SDK Call**: React App calls `addDoc()` or `updateDoc()` via Firebase SDK.
3.  **Security Rule**: Firestore intercepts request, validates permissions (e.g., `request.auth.token.role == 'admin'`).
4.  **Persistence**: Data written to Firestore; Real-time listeners (`onSnapshot`) push updates to clients.
5.  **Trigger (Optional)**: Cloud Function triggers on write to update aggregate stats (e.g., "Monthly Report" generation).

## 2. Frontend Stack
-   **Framework**: **React 18+** (Migrating to Vite for faster builds).
-   **Language**: **JavaScript (ES6+)** with JSDoc typing (Roadmap to TypeScript).
-   **State Management**:
    -   *Server State*: React Query (TanStack Query) - for caching, synchronization, and optimistic updates.
    -   *UI State*: React Context API - for Theme, Sidebar, and Auth User session.
    -   *Form State*: React Hook Form - for performant, uncontrolled inputs.
-   **Styling Approach**: **React-Bootstrap** (Component Library) + **CSS Modules** (Scope isolation for custom overrides).
-   **Build Tool**: **Vite** (replaces Create-React-App).
-   **Testing Tools**:
    -   *Unit/Integration*: **Vitest** + **React Testing Library**.
    -   *E2E*: **Playwright** (Critical path testing: Login -> Dashboard).

## 3. Backend Stack (Serverless)
-   **Platform**: **Firebase Cloud Functions** (Node.js 18 Runtime).
-   **API Structure**:
    -   *Primary*: Direct Client-to-DB via SDK (No REST API for standard CRUD).
    -   *Secondary*: HTTPS Callable Functions for complex operations (e.g., "Generate 12-Week Schedule").
-   **Validation Strategy**:
    -   *Client-side*: Zod schema validation in Forms.
    -   *Database-side*: **Firestore Security Rules** (CEL language) for data integrity and access control.
-   **Background Jobs**:
    -   *Scheduled Functions*: **Firebase Pub/Sub Scheduler** (e.g., "Send Sunday Reminder").
    -   *Triggers*: Firestore `onCreate`/`onUpdate` triggers (e.g., "Recalculate User Stats on Attendance Mark").

## 4. Database Architecture
-   **Database Type**: **Cloud Firestore** (NoSQL Document Store).
-   **Data Modeling**:
    -   *Collection-based*: `users`, `attendance_logs`, `teams`.
    -   *Sub-collections*: Minimized to prevent read cost handling; prefer root collections with indexing.
-   **Indexing Strategy**:
    -   Composite Indexes required for specific queries (e.g., `attendance_logs` where `date > X` AND `userId == Y`).
    -   Single-field indexes enabled by default.
-   **Migration Strategy**:
    -   No schema enforcement = flexible migration.
    -   Write scripts (Node.js) to batch update documents for structural changes.
-   **Backup Strategy**:
    -   Daily automated export to **Google Cloud Storage (GCS)** bucket.

## 5. Authentication & Authorization
-   **Auth Mechanism**: **Firebase Authentication**.
    -   Method: Email/Password (Identity Provider).
    -   Persistence: Local Storage (persisted across sessions).
-   **Role-Based Access Control (RBAC)**:
    -   **Custom Claims**: Add `{ role: 'admin' }` to user's ID Token via Admin SDK (Cloud Function).
    -   **Enforcement**:
        -   *Frontend*: `PrivateRoute` wrapper checks token claim.
        -   *Backend*: Firestore Rules check `request.auth.token.role`.
-   **Session Management**: handled automatically by Firebase SDK (token refresh every hour).

## 6. Infrastructure & Hosting
-   **Provider**: **Google Cloud Platform (GCP)** via Firebase.
-   **Hosting**: **Firebase Hosting** (Global CDN, HTTP/2, SSL by default).
-   **Containerization**: Not required for core logic (Serverless). Docker used only for local emulation (Firebase Emulators).
-   **Load Balancing**: Handled implicitly by Google's global infrastructure.
-   **Auto-scaling**: Cloud Functions scale to 0 (cost-saving) and up to 1000+ concurrently.

## 7. DevOps & CI/CD
-   **Repo**: GitHub.
-   **Branching Model**: **GitHub Flow** (Main + Feature Branches).
-   **Pipeline**: **GitHub Actions**.
    -   *Stage 1: Lint & Test*: Runs on PR (`npm run lint`, `npm test`).
    -   *Stage 2: Build*: Runs `npm run build`.
    -   *Stage 3: Deploy (Preview)*: Deploys to Firebase Hosting Preview Channel on PR.
    -   *Stage 4: Deploy (Prod)*: Deploys to Live Channel on merge to `main`.
-   **Environment Separation**:
    -   *Development*: Local Emulator Suite.
    -   *Staging*: Separate Firebase Project (recommended) or Preview Channels.
    -   *Production*: Primary Firebase Project.

## 8. Observability & Monitoring
-   **Logging**: **Cloud Logging** (stack traces from Functions).
-   **Metrics**: **Firebase Performance Monitoring** (FCP, FID, CLS for Frontend).
-   **Error Tracking**: **Sentry** (Frontend) + **Crashlytics** (if mobile app added later).
-   **Alerting**: Google Cloud Monitoring alerts on "Function Error Rate > 1%" or "Firestore Usage Spike".

## 9. Security Architecture
-   **Data Encryption**:
    -   *At Rest*: Encrypted by default (Google managed keys).
    -   *In Transit*: TLS 1.2+ (HTTPS forced).
-   **Rate Limiting**:
    -   Implied protections by Firebase/Google Infrastructure.
    -   App Check (ReCAPTCHA Enterprise) implementation required to prevent abuse of unauthenticated read paths.
-   **Secrets Management**: **Google Secret Manager** for sensitive API keys (if external integrations added).
-   **OWASP Mitigation**:
    -   *XSS*: React escapes content by default.
    -   *CSRF*: Not applicable (Auth tokens in header, not cookies).
    -   *Injection*: NoSQL injection mitigated by parameterization in SDK.

## 10. Performance Strategy
-   **Caching**:
    -   *Frontend*: React Query `staleTime` (5 minutes for reports).
    -   *CDN*: Firebase Hosting cache-control headers for static assets (Images, JS chunks).
-   **Lazy Loading**:
    -   Code Splitting: `React.lazy()` for massive components (e.g., `StatisticsReport`).
-   **Query Optimization**:
    -   Pagination: Use `limit()` and `startAfter()` cursors for Attendance Logs table.
    -   Aggregation: Create "Counter" documents for totals (e.g., `total_members`) instead of `count()` updates on full collections.

## 11. Scalability Roadmap
### Phase 1: MVP (Current)
-   Single Firebase Project.
-   Direct Firestore reads/writes.
-   Manual deployments or Basic CI.

### Phase 2: Growth (100-500 Users)
-   Implement Aggregation Cloud Functions (avoid calculating reports on client).
-   Enable CDN Caching for public/static content.
-   Implement App Check (Security).

### Phase 3: Enterprise (1000+ Users)
-   Sharding: If single collection exceeds write limits (1 write/sec per doc).
-   BigQuery Export: Sync Firestore data to BigQuery for advanced analytics.
-   Redis (MemoryStore): If read-hot spots occur (unlikely for attendance app).

## 12. Risk & Tradeoff Analysis
-   **Vendor Lock-in**: High. Heavy reliance on Firebase features (Auth, Firestore, Rules). *Mitigation*: Design service abstraction layer in code to isolate Firebase logic.
-   **Cost Spikes**: Read-heavy operations (e.g., "Download All Reports") can spike bills. *Mitigation*: Strict indexing and Aggregation counters.
-   **Offline Support**: Firestore enables offline persistence, but conflict resolution can be complex. *Mitigation*: Last-write-wins policy is acceptable for attendance.

## 13. Technology Decision Matrix

| Technology | Decision | Alternative Considered | Rationale |
| :--- | :--- | :--- | :--- |
| **React** | **Keep** | Angular / Vue | Existing codebase, strong ecosystem, component reuse. |
| **Vite** | **Adopt** | Webpack (CRA) | Significantly faster dev server and build times. |
| **Firebase** | **Keep** | AWS Amplify / Supabase | Current infrastructure, zero-devops overhead for Auth/DB. |
| **React Query** | **Adopt** | Redux | Redux is overkill for server-state caching; React Query simplifies data fetching. |
| **Vitest** | **Adopt** | Jest | Native Vite integration, faster execution. |
