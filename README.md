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
