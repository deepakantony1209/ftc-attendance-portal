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
    -   **Special Roles**: Assign roles like **Organist**, **Sound Engineer**, and **Presentation Specialist**.
-   **Dynamic Team Management (Admin)**:
    -   Create, delete, and manage teams for different categories (e.g., Sunday Mass, Marriage Mass).
    -   Easily assign and unassign members to teams.
    -   **Smart Sorting**: Organists are listed first, followed by female members (alphabetically), then male members (alphabetically).
    -   **Export to PDF**: Download team lists with clear labelling for Organists.
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

## 🚢 Deployment

### Deploy to Firebase Hosting

1.  **Install Firebase CLI** (if not already installed):
    ```bash
    npm install -g firebase-tools
    ```

2.  **Login to Firebase:**
    ```bash
    firebase login
    ```

3.  **Build the project:**
    ```bash
    npm run build
    ```

4.  **Deploy:**
    ```bash
    firebase deploy
    ```

## 🤝 Contributing

1.  Create a new branch for your feature.
2.  Make your changes.
3.  Test thoroughly.
4.  Submit a pull request with a clear description.

## 📄 License

This project is licensed under the MIT License.
