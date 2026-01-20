<<<<<<< HEAD
# Attendance Portal

A comprehensive React-based attendance management system with Firebase integration for tracking member attendance, generating reports, and managing teams and members.

## Features

- **User Authentication**: Secure login system with Firebase
- **Attendance Tracking**: Log and track member attendance
- **Dashboard**: Visual overview of attendance data with charts
- **Member Management**: Add, edit, and manage team members
- **Team Management**: Create and manage different teams
- **Reports**: Generate attendance reports and member statistics
- **Scoring System**: Automatic scoring based on attendance records
- **PDF Export**: Export reports as PDF documents

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v18 or higher) - [Download](https://nodejs.org/)
- **npm** (comes with Node.js) - Check version with `npm --version`
- **Git** - [Download](https://git-scm.com/)

## Installation & Setup

### 1. Clone the Repository

```bash
git clone <your-github-repo-url>
cd attendance-portal
```

### 2. Install Dependencies

```bash
npm install
```

This will install all the required packages listed in `package.json`, including React, Firebase, Bootstrap, and other dependencies.

### 3. Configure Firebase

1. Create a Firebase project at [Firebase Console](https://console.firebase.google.com/)
2. Get your Firebase configuration details
3. Update the Firebase configuration in [src/firebase.js](src/firebase.js) with your credentials:

```javascript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID",
};
```

## Running the Project Locally

### Start Development Server

```bash
npm start
```

The application will automatically open in your browser at `http://localhost:3000`. The app will hot-reload whenever you make changes to the code.

### Build for Production

```bash
npm run build
```

This creates an optimized production build in the `build/` folder.

### Run Tests

```bash
npm test
```

Launches the test runner in interactive watch mode.

## Project Structure

```
src/
├── components/
│   ├── AttendanceForm.js      # Attendance entry form
│   ├── AttendanceLog.js        # View attendance logs
│   ├── Dashboard.js            # Main dashboard with charts
│   ├── Login.js                # Authentication component
│   ├── ManageMembers.js        # Member management interface
│   ├── ManageTeams.js          # Team management interface
│   ├── MemberForm.js           # Form to add/edit members
│   ├── MemberReport.js         # Member attendance reports
│   ├── MyStats.js              # Personal statistics
│   ├── Profile.js              # User profile management
│   └── ScoreLogic.js           # Scoring calculation logic
├── App.js                      # Main app component
├── firebase.js                 # Firebase configuration
└── index.js                    # React entry point
```

## Available Dependencies

- **React** (^19.2.3) - UI library
- **React DOM** (^19.2.3) - React rendering
- **Firebase** (^12.3.0) - Backend services & authentication
- **React Bootstrap** (^2.10.10) - Bootstrap components for React
- **Chart.js** (^4.5.0) - Charting library
- **React Chart.js 2** (^5.3.0) - React wrapper for Chart.js
- **jsPDF** (^3.0.3) - PDF generation
- **React Router DOM** (^7.9.1) - Client-side routing
- **React Toastify** (^11.0.5) - Notifications

## Deployment

### Deploy to Firebase Hosting

```bash
# Install Firebase CLI (if not already installed)
npm install -g firebase-tools

# Login to Firebase
firebase login

# Build the project
npm run build

# Deploy
firebase deploy
```

Refer to [firebase.json](firebase.json) for deployment configuration.

## Troubleshooting

### Port Already in Use

If port 3000 is already in use:

```bash
npm start -- --port 3001
```

### Dependencies Issues

Clear cache and reinstall:

```bash
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

### Firebase Connection Issues

- Verify Firebase configuration in [src/firebase.js](src/firebase.js)
- Check internet connection
- Ensure Firebase project rules allow read/write access

## Contributing

1. Create a new branch for your feature
2. Make your changes
3. Test thoroughly
4. Submit a pull request with a clear description

## License

This project is licensed under the MIT License.

## Support

For issues or questions, please open an issue in the GitHub repository.

### Analyzing the Bundle Size

This section has moved here: [https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size](https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size)

### Making a Progressive Web App

This section has moved here: [https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app](https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app)

### Advanced Configuration

This section has moved here: [https://facebook.github.io/create-react-app/docs/advanced-configuration](https://facebook.github.io/create-react-app/docs/advanced-configuration)

### Deployment

This section has moved here: [https://facebook.github.io/create-react-app/docs/deployment](https://facebook.github.io/create-react-app/docs/deployment)

### `npm run build` fails to minify

This section has moved here: [https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify](https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify)
=======
# FTC Choir Attendance Portal

A comprehensive web application designed to manage attendance, teams, and member information for the Fatima Tamil Choir (FTC). This portal provides a seamless experience for both administrators and choir members with role-based access and detailed reporting features.

## ✨ Key Features

-   **Secure Authentication**: User login with email and password, including a "Forgot Password" feature powered by Firebase.
-   **Role-Based Access Control (RBAC)**: Distinct dashboards and permissions for **Admins** and regular **Choir Members**.
-   **Interactive Dashboard**: An overview of the choir's performance, including yearly attendance percentages, total activities, and member statistics.
-   **Efficient Attendance Tracking**:
    -   Mark attendance for various activities (e.g., Daily Mass, Sunday Practice, Special Events).
    -   Statuses include Present, Absent, Excused, and Excused but Present.
    -   Bulk-marking options to quickly set remaining members to 'Present' or 'Absent'.
-   **Comprehensive Member Management (Admin)**:
    -   Full CRUD (Create, Read, Update, Delete) functionality for choir members.
    -   Add new members with automatic account creation in Firebase Authentication.
-   **Dynamic Team Management (Admin)**:
    -   Create, delete, and manage teams for different categories (e.g., Sunday Mass, Marriage Mass).
    -   Easily assign and unassign members to teams.
-   **In-Depth Reporting**:
    -   Visualize personal and overall attendance with charts (Doughnut and Bar).
    -   Filter reports by year and month.
    -   **Download reports as PDF** for individual members, teams, and specific attendance logs.
-   **Personalized User Experience**:
    -   Members can view their own detailed attendance statistics.
    -   Users can update their personal profile information.
    -   Secure flow for users to change their login email, complete with re-authentication and email verification.
-   **Modern UI/UX**:
    -   Clean, responsive interface built with React Bootstrap.
    -   **Light/Dark mode theme** toggle for user preference.
    -   User-friendly notifications for all actions using React Toastify.

## 👥 User Roles

1.  **Admin**:
    -   Has full access to all features.
    -   Can record and edit attendance for all members.
    -   Manages the choir member list (add, edit, delete).
    -   Manages teams and member assignments.
    -   Can view detailed reports for any member.
    -   Can delete past attendance records.

2.  **Choir Member**:
    -   Can view their personal attendance summary and statistics (`My Stats`).
    -   Can view (but not edit) the full attendance history, member list, and team compositions.
    -   Can update their own profile information (e.g., phone number, address, marital status).

## 🛠️ Technology Stack

-   **Frontend**: React.js
-   **UI Framework**: React Bootstrap
-   **Routing**: React Router
-   **State Management**: React Hooks (`useState`, `useEffect`, `useMemo`)
-   **Charting**: Chart.js with `react-chartjs-2`
-   **PDF Generation**: jsPDF & jsPDF-AutoTable
-   **Notifications**: React Toastify
-   **Backend-as-a-Service (BaaS)**:
    -   **Firebase Authentication**: For user login and management.
    -   **Firestore Database**: For storing all application data (members, attendance, teams).

## 🚀 Getting Started

Follow these instructions to set up and run the project locally.

### Prerequisites

-   Node.js and npm (or yarn) installed on your machine.
-   A Firebase project.

### Installation & Setup

1.  **Clone the repository:**
    ```sh
    git clone <your-repository-url>
    cd <repository-folder>
    ```

2.  **Install dependencies:**
    ```sh
    npm install
    ```

3.  **Configure Firebase:**
    -   Create a project on the [Firebase Console](https://console.firebase.google.com/).
    -   In your project, go to **Project Settings** > **General** and find your web app's configuration object.
    -   Open the `src/firebase.js` file in the project.
    -   Replace the placeholder `firebaseConfig` object with your actual Firebase project credentials.

    ```javascript
    // In src/firebase.js
    const firebaseConfig = {
      apiKey: "YOUR_API_KEY",
      authDomain: "YOUR_AUTH_DOMAIN",
      projectId: "YOUR_PROJECT_ID",
      storageBucket: "YOUR_STORAGE_BUCKET",
      messagingSenderId: "YOUR_SENDER_ID",
      appId: "YOUR_APP_ID",
      measurementId: "YOUR_MEASUREMENT_ID"
    };
    ```

4.  **Set up Firestore and Authentication:**
    -   In the Firebase console, enable **Firestore Database** and **Authentication**.
    -   For Authentication, enable the **Email/Password** sign-in method.
    -   Manually add the admin user (`fathimatamilchoir@gmail.com` or your preferred admin email) in the Authentication tab so you can log in for the first time.

5.  **Run the application:**
    ```sh
    npm start
    ```
    The application will be available at `http://localhost:3000`.
>>>>>>> d01242c725c10f1fff2d628301e1e0efd80e4707
