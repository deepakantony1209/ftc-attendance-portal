import React, { useState, useEffect } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import { BrowserRouter, Routes, Route, Navigate, Link, useLocation, useNavigate } from 'react-router-dom';
import { Nav, Navbar, Container, Button, Modal, Spinner } from 'react-bootstrap';

import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Import Firebase services
import { auth, db } from './firebase';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, sendPasswordResetEmail, createUserWithEmailAndPassword } from 'firebase/auth';
import { collection, onSnapshot, doc, addDoc, deleteDoc, updateDoc, getDoc, setDoc } from 'firebase/firestore';

// Import all components
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import AttendanceLog from './components/AttendanceLog';
import ManageMembers from './components/ManageMembers';
import AttendanceForm from './components/AttendanceForm';
import MemberReport from './components/MemberReport';
import MyStats from './components/MyStats';
import Profile from './components/Profile';
import ManageTeams from './components/ManageTeams';
import './App.css';

const specialSectionsRequiringName = ['Special mass practice', 'Special mass', 'Others'];

function AppContent() {
  const [loggedInUser, setLoggedInUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [attendanceHistory, setAttendanceHistory] = useState([]);
  const [choirMembers, setChoirMembers] = useState([]);
  const [membersForAttendance, setMembersForAttendance] = useState([]);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedSection, setSelectedSection] = useState('');
  const [teams, setTeams] = useState([]);
  const [eventName, setEventName] = useState('');
  const [recordToEdit, setRecordToEdit] = useState(null);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  
  const [membersLoading, setMembersLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [bulkMarkingMode, setBulkMarkingMode] = useState('none');
  const [teamsLoading, setTeamsLoading] = useState(true);

  // --- Theme Toggle State Management ---
  const [theme, setTheme] = useState(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
      return savedTheme;
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-bs-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prevTheme) => (prevTheme === 'light' ? 'dark' : 'light'));
  };
  // --- End Theme Toggle ---

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const userProfileRef = doc(db, "choirMembers", user.uid);
        const userProfileDoc = await getDoc(userProfileRef);
        if (userProfileDoc.exists()) {
          setLoggedInUser({ id: userProfileDoc.id, uid: user.uid, role: 'user', ...userProfileDoc.data() });
        } else if (user.email === 'fathimatamilchoir@gmail.com') {
          setLoggedInUser({ uid: user.uid, email: user.email, name: 'Admin', role: 'admin' });
        } else {
          signOut(auth);
        }
      } else {
        setLoggedInUser(null);
      }
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!loggedInUser) {
      setMembersLoading(false);
      setHistoryLoading(false);
      return;
    }
    const membersUnsubscribe = onSnapshot(collection(db, 'choirMembers'), (snapshot) => {
      setChoirMembers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setMembersLoading(false);
    });
    const historyUnsubscribe = onSnapshot(collection(db, 'attendanceHistory'), (snapshot) => {
      setAttendanceHistory(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setHistoryLoading(false);
    });
    const teamsUnsubscribe = onSnapshot(collection(db, 'teams'), (snapshot) => {
          setTeams(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
          setTeamsLoading(false);
        });
    return () => { membersUnsubscribe(); historyUnsubscribe(); teamsUnsubscribe(); };
  }, [loggedInUser]);

  // --- [NEW CODE] ---
  // This useEffect hook implements the client-side workaround for syncing email changes.
  // It runs every time the user successfully logs in and their profile data is loaded.
  useEffect(() => {
    /**
     * Checks if the email in Firebase Auth is different from the email in the Firestore profile.
     * This happens after a user verifies a new email address and logs back in.
     * If a mismatch is found, it updates the Firestore document to match the Auth email.
     */
    const syncEmailOnLogin = async (authUser, userProfile) => {
      // Check if we have both user objects and if their emails are different.
      if (authUser && userProfile && authUser.email !== userProfile.email) {
        console.log('Email mismatch detected. Syncing Auth email to Firestore...');
        toast.info('Updating your profile with your new email address...');

        try {
          // Get a reference to the user's document in Firestore.
          const userDocRef = doc(db, 'choirMembers', authUser.uid);
          // Update the 'email' field in the Firestore document.
          await updateDoc(userDocRef, { email: authUser.email });

          // Also update the local state immediately for a fast UI update.
          setLoggedInUser(prevUser => ({ ...prevUser, email: authUser.email }));

          toast.success('Your profile email has been successfully updated!');
        } catch (error) {
          console.error("Failed to sync email to Firestore:", error);
          toast.error("Could not update your profile email. Please contact an admin.");
        }
      }
    };

    // Get the currently signed-in user from Firebase Auth.
    const currentUser = auth.currentUser;

    // Run the synchronization logic only when we have both the Auth user and the profile data.
    if (currentUser && loggedInUser) {
      syncEmailOnLogin(currentUser, loggedInUser);
    }
  }, [loggedInUser]); // The dependency array ensures this runs when loggedInUser state changes.
  // --- [END OF NEW CODE] ---
  
  useEffect(() => {
    if (recordToEdit) {
      setSelectedDate(recordToEdit.date);
      setSelectedSection(recordToEdit.section);
      setEventName(recordToEdit.eventName || '');
      const attendanceMap = new Map(recordToEdit.records.map(r => [r.id, {status: r.status, reason: r.reason}]));
      setMembersForAttendance(choirMembers.map(member => ({
        ...member,
        status: attendanceMap.get(member.id)?.status || null,
        reason: attendanceMap.get(member.id)?.reason || '',
      })));
    } else {
      setMembersForAttendance(choirMembers.map(m => ({ ...m, status: null, reason: '' })));
    }
  }, [choirMembers, recordToEdit]);

  const handleLogin = async (email, password) => {
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      return { success: true, user: result.user };
    } catch (error) {
      return { success: false, code: error.code };
    }
  };

  const handleLogout = () => {
    signOut(auth);
    setShowLogoutConfirm(false);
  };

  const handlePasswordReset = async (email) => {
    try {
      await sendPasswordResetEmail(auth, email);
      return true;
    } catch (error) {
      return false;
    }
  };

  const handleAddNewMember = async (newMemberData) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, newMemberData.email, 'choirmember');
      const newUserId = userCredential.user.uid;
      await setDoc(doc(db, 'choirMembers', newUserId), newMemberData);
      toast.success(`${newMemberData.name} has been added and their account has been created.`);
      return true;
    } catch (error) {
      if (error.code === 'auth/email-already-in-use') {
        toast.error('Error: This email address is already in use by another account.');
      } else {
        toast.error('An error occurred while adding the new member.');
      }
      return false;
    }
  };
  
  const handleEditMember = async (memberData) => {
    const { id, ...dataToUpdate } = memberData;
    const memberDocRef = doc(db, 'choirMembers', id);
    await updateDoc(memberDocRef, dataToUpdate);
    toast.success(`${memberData.name}'s profile has been updated.`);
  };

  const handleRemoveMember = async (memberIdToRemove) => {
    const member = choirMembers.find(m => m.id === memberIdToRemove);
    if (!member) return;
    await deleteDoc(doc(db, 'choirMembers', memberIdToRemove));
    toast.info(`${member.name}'s profile removed. Remember to delete their login from the Firebase console.`);
  };
  const handleUpdateTeam = async (teamId, updatedMembers) => {
    const teamDocRef = doc(db, 'teams', teamId);
    try {
      await updateDoc(teamDocRef, { members: updatedMembers });
      toast.success(`Team ${teamId.replace('team', '')} has been updated.`);
    } catch (error) {
      // If the document doesn't exist, create it
      if (error.code === 'not-found') {
        await setDoc(teamDocRef, { members: updatedMembers, name: `Team ${teamId.replace('team', '')}` });
        toast.success(`Team ${teamId.replace('team', '')} has been updated.`);
      } else {
        toast.error('Failed to update team.');
      }
    }
  };
  const handleCreateTeam = async (teamName, teamType) => { // Add teamType parameter
    if (!teamName || !teamName.trim()) {
      toast.error("Team name cannot be empty.");
      return false;
    }
    try {
      await addDoc(collection(db, 'teams'), {
        name: teamName.trim(),
        members: [],
        type: teamType // Add the 'type' field to the new document
      });
      toast.success(`Team "${teamName.trim()}" created successfully.`);
      return true;
    } catch (error) {
      toast.error("Failed to create team.");
      return false;
    }
  };
  
  const handleDeleteTeam = async (teamId, teamName) => {
    try {
      await deleteDoc(doc(db, 'teams', teamId));
      toast.success(`Team "${teamName}" has been deleted.`);
    } catch (error) {
      toast.error("Failed to delete team.");
    }
  };
 
  const handleUpdateProfile = async (updatedProfileData) => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      toast.error("Error: You are not logged in.");
      return false;
    }

    try {
      console.log('Updating profile in Firestore:', updatedProfileData);
      
      const { id, uid, ...dataToUpdate } = updatedProfileData;
      const memberDocRef = doc(db, 'choirMembers', id);
      await updateDoc(memberDocRef, dataToUpdate);
      
      console.log('Firestore update successful');
      
      setLoggedInUser(prevUser => ({ ...prevUser, ...updatedProfileData }));
      
      console.log('Local state updated');
      
      if (!updatedProfileData.email || updatedProfileData.email === currentUser.email) {
        toast.success("Profile updated successfully!");
      }
      
      return true;
    } catch (error) {
      console.error('Profile update error:', error);
      toast.error("Failed to update profile in database. Please try again.");
      return false;
    }
  };

  const handleDeleteRecord = async (recordIdToDelete) => {
    await deleteDoc(doc(db, 'attendanceHistory', recordIdToDelete));
    toast.success('Attendance record has been deleted.');
  };

  const handleStartEdit = (record) => {
    setRecordToEdit(record);
    navigate('/attendance');
  };

  const handleCancelEdit = () => {
    setRecordToEdit(null);
    navigate('/log');
  };

  const handleUpdateRecord = async (updatedRecord) => {
    const { id, ...recordData } = updatedRecord;
    const recordDocRef = doc(db, 'attendanceHistory', id);
    await updateDoc(recordDocRef, recordData);
    toast.success('Attendance record updated.');
    setRecordToEdit(null);
    navigate('/log');
  };

  const handleAttendance = (memberId, status) => {
    setMembersForAttendance(prevMembers =>
      prevMembers.map(member => {
        if (member.id === memberId) {
          const isNowExcused = status === 'Excused' || status === 'Excused but Present';
          return { ...member, status, reason: isNowExcused ? member.reason : '' };
        }
        return member;
      })
    );
  };
  
  const handleReasonChange = (memberId, reason) => {
    setMembersForAttendance(prevMembers =>
      prevMembers.map(member => member.id === memberId ? { ...member, reason } : member)
    );
  };
  const handleClearAttendance = () => {
    setMembersForAttendance(prevMembers =>
      prevMembers.map(member => ({ ...member, status: null, reason: '' }))
    );
    setBulkMarkingMode('none');
    toast.info('Attendance has been cleared.');
  };

  const handleToggleBulkMarking = (toggledMode) => {
    const newMode = bulkMarkingMode === toggledMode ? 'none' : toggledMode;
    setBulkMarkingMode(newMode);

    if (newMode === 'none') {
      setMembersForAttendance(prevMembers =>
        prevMembers.map(member => ({ ...member, status: null, reason: '' }))
      );
      toast.info('Attendance cleared.');
    } else {
      const statusToSet = newMode === 'present' ? 'Present' : 'Absent';
      setMembersForAttendance(prevMembers =>
        prevMembers.map(member => 
          !member.status ? { ...member, status: statusToSet, reason: '' } : member
        )
      );
      toast.info(`Unmarked members have been marked as ${statusToSet}.`);
    }
  };
  const handleSave = async () => {
    if (!selectedDate || !selectedSection) {
    toast.warn('Please select a date and a section.');
    return;
  }
    if (specialSectionsRequiringName.includes(selectedSection) && !eventName.trim()) {
      toast.warn('Please enter the name of the event.');
      return;
    }
    const markedMembers = membersForAttendance.filter(m => m.status !== null);
    if (markedMembers.length === 0) {
      toast.warn('Please mark at least one member.');
      return;
    }
    const invalidExcuse = markedMembers.find(m => (m.status === 'Excused' || m.status === 'Excused but Present') && !m.reason?.trim());
    if (invalidExcuse) {
      toast.error(`Please provide a reason for the excused status for ${invalidExcuse.name}.`);
      return;
    }
    const recordPayload = {
      date: selectedDate, section: selectedSection,
      eventName: specialSectionsRequiringName.includes(selectedSection) ? eventName.trim() : '',
      records: markedMembers.map(({ id, name, status, reason }) => ({ id, name, status, reason })),
    };
    if (recordToEdit) {
      await handleUpdateRecord({ ...recordToEdit, ...recordPayload });
    } else {
      await addDoc(collection(db, 'attendanceHistory'), recordPayload);
      toast.success('Attendance saved.');
    }
    setRecordToEdit(null);
    setEventName('');
    setSelectedDate(new Date().toISOString().slice(0, 10));
    setSelectedSection('Daily mass');
  };

  const attendanceSections = [
    'Daily mass', 'Saturday practice', 'Sunday morning mass', 'Sunday evening mass',
    'Special mass practice', 'Special mass', 'Marriage mass', 'Choir meeting', 'Cleaning', 'Others'
  ];

  if (authLoading) return <div className="d-flex vh-100 justify-content-center align-items-center"><Spinner animation="border" /></div>;

  const PrimaryNav = () => (
    <Navbar bg="dark" variant="dark" expand="lg" sticky="top" className="shadow-sm">
      <Container>
        <Navbar.Brand as={Link} to="/">FTC Choir Attendance</Navbar.Brand>
        
        <Button variant="outline-light" onClick={toggleTheme} className="ms-auto me-2" title="Toggle Theme">
          <i className={theme === 'light' ? 'bi bi-moon-stars-fill' : 'bi bi-sun-fill'}></i>
        </Button>

        <Navbar.Toggle aria-controls="primary-navbar-nav" className="border-0">
          <i className="bi bi-person-circle fs-3"></i>
        </Navbar.Toggle>

        <Navbar.Collapse id="primary-navbar-nav">
          <Nav className="ms-auto align-items-center">
            <Navbar.Text className="me-3">
              Hello, {loggedInUser.name}
            </Navbar.Text>
            <Button variant="outline-light" onClick={() => setShowLogoutConfirm(true)}>
              <i className="bi bi-box-arrow-right me-2"></i>Logout
            </Button>
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );

  const SecondaryNav = () => (
    <Navbar bg="light" variant="light" expand="lg" className="shadow-sm sub-navbar">
      <Container>
        <Navbar.Toggle aria-controls="secondary-navbar" />
        <Navbar.Collapse id="secondary-navbar">
          <Nav className="w-100 justify-content-center" activeKey={location.pathname}>
            {loggedInUser.role === 'admin' ? (
              <>
                <Nav.Link as={Link} to="/" eventKey="/"><i className="bi bi-house-door-fill me-2"></i>Home</Nav.Link>
                <Nav.Link as={Link} to="/attendance" eventKey="/attendance"><i className="bi bi-check2-square me-2"></i>Record Attendance</Nav.Link>
                <Nav.Link as={Link} to="/log" eventKey="/log"><i className="bi bi-list-task me-2"></i>Attendance History</Nav.Link>
                <Nav.Link as={Link} to="/statistics" eventKey="/statistics"><i className="bi bi-pie-chart-fill me-2"></i>Member Reports</Nav.Link>
                <Nav.Link as={Link} to="/teams" eventKey="/teams"><i className="bi bi-collection-fill me-2"></i>Teams</Nav.Link>
                <Nav.Link as={Link} to="/members" eventKey="/members"><i className="bi bi-people-fill me-2"></i>Members list</Nav.Link>
              </>
            ) : (
              <>
                <Nav.Link as={Link} to="/" eventKey="/"><i className="bi bi-house-door-fill me-2"></i>Home</Nav.Link>
                <Nav.Link as={Link} to="/my-stats" eventKey="/my-stats"><i className="bi bi-person-vcard me-2"></i>My Summary</Nav.Link>
                  <Nav.Link as={Link} to="/log" eventKey="/log"><i className="bi bi-list-task me-2"></i>Attendance History</Nav.Link>
                  <Nav.Link as={Link} to="/teams" eventKey="/teams"><i className="bi bi-collection-fill me-2"></i>Teams</Nav.Link>
                <Nav.Link as={Link} to="/members" eventKey="/members"><i className="bi bi-people-fill me-2"></i>Members list</Nav.Link>
                <Nav.Link as={Link} to="/profile" eventKey="/profile"><i className="bi bi-person-fill me-2"></i>Profile</Nav.Link>
              </>
            )}
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );

  return (
    <>
      <ToastContainer position="top-right" autoClose={3000} hideProgressBar={false} newestOnTop={false} closeOnClick rtl={false} pauseOnFocusLoss draggable pauseOnHover theme="colored" />
      
      {loggedInUser && (
        <>
          <PrimaryNav />
          <SecondaryNav />
        </>
      )}
      <main className="container mt-4">
        <Routes>
          {!loggedInUser ? (
            <Route path="*" element={<Login onLogin={handleLogin} onPasswordReset={handlePasswordReset} />} />
          ) : loggedInUser.role === 'admin' ? (
            <>
              <Route path="/" element={<Dashboard attendanceHistory={attendanceHistory} choirMembersList={choirMembers} isLoading={historyLoading || membersLoading} />} />
              <Route path="/attendance" element={<AttendanceForm members={membersForAttendance} selectedDate={selectedDate} setSelectedDate={setSelectedDate} selectedSection={selectedSection} setSelectedSection={setSelectedSection} attendanceSections={attendanceSections} handleAttendance={handleAttendance} handleReasonChange={handleReasonChange} handleSave={handleSave} eventName={eventName} setEventName={setEventName} specialSections={specialSectionsRequiringName} isEditing={!!recordToEdit} onCancelEdit={handleCancelEdit} handleToggleBulkMarking={handleToggleBulkMarking} handleClearAttendance={handleClearAttendance} bulkMarkingMode={bulkMarkingMode} />} />
              <Route path="/log" element={<AttendanceLog history={attendanceHistory} onDeleteRecord={handleDeleteRecord} onStartEdit={handleStartEdit} isReadOnly={false} isLoading={historyLoading} />} />
              <Route path="/statistics" element={<MemberReport attendanceHistory={attendanceHistory} choirMembersList={choirMembers} isLoading={historyLoading || membersLoading} />} />
              <Route path="/teams" element={<ManageTeams loggedInUser={loggedInUser} choirMembersList={choirMembers} teams={teams} onUpdateTeam={handleUpdateTeam} onCreateTeam={handleCreateTeam} onDeleteTeam={handleDeleteTeam} isReadOnly={false} isLoading={teamsLoading || membersLoading} />} />
              <Route path="/members" element={<ManageMembers members={choirMembers} onAddMember={handleAddNewMember} onEditMember={handleEditMember} onRemoveMember={handleRemoveMember} isReadOnly={false} isLoading={membersLoading} />} />
              <Route path="*" element={<Navigate to="/" />} />
            </>
          ) : (
            <>
              <Route path="/" element={<Dashboard attendanceHistory={attendanceHistory} choirMembersList={choirMembers} isLoading={historyLoading || membersLoading} />} />
              <Route path="/my-stats" element={<MyStats user={loggedInUser} history={attendanceHistory} />} />
              <Route path="/log" element={<AttendanceLog history={attendanceHistory} isReadOnly={true} isLoading={historyLoading} />} />
              <Route path="/teams" element={<ManageTeams choirMembersList={choirMembers} teams={teams} isReadOnly={true} isLoading={teamsLoading || membersLoading} />} />
              <Route path="/members" element={<ManageMembers members={choirMembers} isReadOnly={true} isLoading={membersLoading} />} />
              <Route path="/profile" element={<Profile user={loggedInUser} onCreateTeam={handleCreateTeam} onDeleteTeam={handleDeleteTeam} onUpdateProfile={handleUpdateProfile} />} />
              <Route path="*" element={<Navigate to="/" />} />
            </>
          )}
        </Routes>
      </main>
      <Modal show={showLogoutConfirm} onHide={() => setShowLogoutConfirm(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Confirm Log Out</Modal.Title>
        </Modal.Header>
        <Modal.Body>Are you sure you want to log out?</Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowLogoutConfirm(false)}>Cancel</Button>
          <Button variant="danger" onClick={handleLogout}>Log Out</Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

export default App;
