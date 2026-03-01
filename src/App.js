import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';

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
import Schedule from './components/Schedule';
import HowToUse from './components/HowToUse';
import { generateRotationSchedule, getLastScheduledSunday } from './utils/scheduleUtils';
import Layout from './components/Layout/Layout';
import { requestNotificationPermissionAndSaveToken } from './utils/notificationUtils';

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
  const [eventTime, setEventTime] = useState('');
  const [selectedScheduledTeam, setSelectedScheduledTeam] = useState('');
  const [recordToEdit, setRecordToEdit] = useState(null);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const navigate = useNavigate();

  const [membersLoading, setMembersLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [bulkMarkingMode, setBulkMarkingMode] = useState('none');
  const [teamsLoading, setTeamsLoading] = useState(true);
  const [sundaySchedule, setSundaySchedule] = useState([]);
  const [eventSchedules, setEventSchedules] = useState([]);
  const hasRedirectedOnLogin = useRef(false);

  // --- Theme Toggle State Management ---
  const [theme, setTheme] = useState(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) return savedTheme;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };
  // --- End Theme Toggle ---

  // Reset redirect flag when user logs out
  useEffect(() => {
    if (!loggedInUser) {
      hasRedirectedOnLogin.current = false;
    }
  }, [loggedInUser]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const userProfileRef = doc(db, "choirMembers", user.uid);
        const userProfileDoc = await getDoc(userProfileRef);
        if (userProfileDoc.exists()) {
          setLoggedInUser({ id: userProfileDoc.id, uid: user.uid, role: 'user', ...userProfileDoc.data() });
          // Request token on successful login
          requestNotificationPermissionAndSaveToken(userProfileDoc.id);
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
    const scheduleUnsubscribe = onSnapshot(collection(db, 'sundaySchedule'), (snapshot) => {
      const schedules = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setSundaySchedule(schedules);
    });
    const eventScheduleUnsubscribe = onSnapshot(collection(db, 'eventSchedules'), (snapshot) => {
      const schedules = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setEventSchedules(schedules);
    });
    return () => { membersUnsubscribe(); historyUnsubscribe(); teamsUnsubscribe(); scheduleUnsubscribe(); eventScheduleUnsubscribe(); };
  }, [loggedInUser]);

  // Email sync on login
  useEffect(() => {
    const syncEmailOnLogin = async (authUser, userProfile) => {
      if (authUser && userProfile && authUser.email !== userProfile.email) {
        toast.info('Updating your profile with your new email address...');
        try {
          const userDocRef = doc(db, 'choirMembers', authUser.uid);
          await updateDoc(userDocRef, { email: authUser.email });
          setLoggedInUser(prevUser => ({ ...prevUser, email: authUser.email }));
          toast.success('Your profile email has been successfully updated!');
        } catch (error) {
          console.error("Failed to sync email to Firestore:", error);
          toast.error("Could not update your profile email. Please contact an admin.");
        }
      }
    };
    const currentUser = auth.currentUser;
    if (currentUser && loggedInUser) syncEmailOnLogin(currentUser, loggedInUser);
  }, [loggedInUser]);

  useEffect(() => {
    if (recordToEdit) {
      setSelectedDate(recordToEdit.date);
      setSelectedSection(recordToEdit.section);
      setEventName(recordToEdit.eventName || '');
      setEventTime(recordToEdit.time || '');
      setSelectedScheduledTeam(recordToEdit.scheduledTeamId || '');
      const attendanceMap = new Map(recordToEdit.records.map(r => [r.id, { status: r.status, reason: r.reason }]));
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
    try { await sendPasswordResetEmail(auth, email); return true; } catch { return false; }
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
      if (error.code === 'not-found') {
        await setDoc(teamDocRef, { members: updatedMembers, name: `Team ${teamId.replace('team', '')}` });
        toast.success(`Team ${teamId.replace('team', '')} has been updated.`);
      } else {
        toast.error('Failed to update team.');
      }
    }
  };

  const handleCreateTeam = async (teamName, teamType) => {
    if (!teamName || !teamName.trim()) { toast.error("Team name cannot be empty."); return false; }
    try {
      await addDoc(collection(db, 'teams'), { name: teamName.trim(), members: [], type: teamType });
      toast.success(`Team "${teamName.trim()}" created successfully.`);
      return true;
    } catch { toast.error("Failed to create team."); return false; }
  };

  const handleDeleteTeam = async (teamId, teamName) => {
    try { await deleteDoc(doc(db, 'teams', teamId)); toast.success(`Team "${teamName}" has been deleted.`); }
    catch { toast.error("Failed to delete team."); }
  };

  const handleUpdateProfile = async (updatedProfileData) => {
    const currentUser = auth.currentUser;
    if (!currentUser) { toast.error("Error: You are not logged in."); return false; }
    try {
      const { id, uid, ...dataToUpdate } = updatedProfileData;
      const memberDocRef = doc(db, 'choirMembers', id);
      await updateDoc(memberDocRef, dataToUpdate);
      setLoggedInUser(prevUser => ({ ...prevUser, ...updatedProfileData }));
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

  // --- Sunday Schedule Management ---
  const handleGenerateSchedule = async () => {
    const sundayTeams = teams.filter(t => t.type === 'sunday');
    if (sundayTeams.length === 0) { toast.error('No Sunday teams found. Please create Sunday teams first.'); return; }
    try {
      const lastScheduledSunday = getLastScheduledSunday(sundaySchedule);
      let startDate = new Date();
      let startingTeamIndex = 0;
      if (lastScheduledSunday && sundaySchedule.length > 0) {
        const lastSchedule = sundaySchedule.find(s => s.date === formatDateForSchedule(lastScheduledSunday));
        const sortedTeams = [...sundayTeams].sort((a, b) => a.name.localeCompare(b.name));
        if (lastSchedule) {
          const lastTeamIndex = sortedTeams.findIndex(t => t.id === lastSchedule.teamId);
          startingTeamIndex = (lastTeamIndex + 1) % sortedTeams.length;
        }
        startDate = new Date(lastScheduledSunday);
        startDate.setDate(startDate.getDate() + 7);
      }
      const newSchedule = generateRotationSchedule(sundayTeams, startDate, 12);
      const sortedTeams = [...sundayTeams].sort((a, b) => a.name.localeCompare(b.name));
      newSchedule.forEach((entry, index) => {
        const teamIndex = (startingTeamIndex + index) % sortedTeams.length;
        entry.teamId = sortedTeams[teamIndex].id;
        entry.teamName = sortedTeams[teamIndex].name;
      });
      for (const entry of newSchedule) {
        await setDoc(doc(db, 'sundaySchedule', entry.date), entry);
      }
      toast.success(`Generated schedule for next 12 Sundays!`);
    } catch (error) {
      console.error('Error generating schedule:', error);
      toast.error('Failed to generate schedule.');
    }
  };

  const handleUpdateScheduleEntry = async (date, newTeamId) => {
    if (newTeamId === 'all-choir' || newTeamId === 'na-team') {
      try {
        const teamName = newTeamId === 'all-choir' ? 'All Choir Members' : 'NA';
        await setDoc(doc(db, 'sundaySchedule', date), { date, teamId: newTeamId, teamName, createdBy: 'admin', modifiedAt: new Date() });
        toast.success(`Schedule updated to ${teamName} for ${formatDateForDisplay(date)}`);
        return;
      } catch (error) { console.error('Error updating schedule:', error); toast.error('Failed to update schedule.'); return; }
    }
    const sundayTeams = teams.filter(t => t.type === 'sunday').sort((a, b) => a.name.localeCompare(b.name));
    const newTeamIndex = sundayTeams.findIndex(t => t.id === newTeamId);
    if (newTeamIndex === -1) { toast.error('Team not found.'); return; }
    try {
      const targetDate = new Date(date);
      targetDate.setHours(0, 0, 0, 0);
      const futureSchedules = sundaySchedule
        .filter(s => { const sDate = new Date(s.date); sDate.setHours(0, 0, 0, 0); return sDate >= targetDate; })
        .sort((a, b) => new Date(a.date) - new Date(b.date));
      let currentTeamIndex = newTeamIndex;
      for (const entry of futureSchedules) {
        const team = sundayTeams[currentTeamIndex];
        await setDoc(doc(db, 'sundaySchedule', entry.date), { ...entry, teamId: team.id, teamName: team.name, createdBy: 'admin', modifiedAt: new Date() });
        currentTeamIndex = (currentTeamIndex + 1) % sundayTeams.length;
      }
      toast.success(`Schedule updated! Adjusted ${futureSchedules.length} weeks.`);
    } catch (error) { console.error('Error updating schedule:', error); toast.error('Failed to update schedule.'); }
  };

  const formatDateForSchedule = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // --- Event Schedule Management (Marriage Mass, etc.) ---
  const handleAddEventSchedule = async (scheduleData) => {
    try {
      await addDoc(collection(db, 'eventSchedules'), {
        ...scheduleData,
        createdAt: new Date()
      });
      toast.success('Event schedule added successfully.');
      return true;
    } catch (error) {
      console.error('Error adding event schedule:', error);
      toast.error('Failed to add event schedule.');
      return false;
    }
  };

  const handleDeleteEventSchedule = async (scheduleId) => {
    try {
      await deleteDoc(doc(db, 'eventSchedules', scheduleId));
      toast.success('Event schedule removed.');
    } catch (error) {
      console.error('Error deleting event schedule:', error);
      toast.error('Failed to remove event schedule.');
    }
  };

  const handleEditEventSchedule = async (scheduleId, updatedData) => {
    try {
      const scheduleRef = doc(db, 'eventSchedules', scheduleId);
      await updateDoc(scheduleRef, {
        ...updatedData,
        modifiedAt: new Date()
      });
      toast.success('Event schedule updated successfully.');
      return true;
    } catch (error) {
      console.error('Error updating event schedule:', error);
      toast.error('Failed to update event schedule.');
      return false;
    }
  };

  const formatDateForDisplay = (date) => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
  };

  const handleDeleteRecord = async (recordIdToDelete) => {
    await deleteDoc(doc(db, 'attendanceHistory', recordIdToDelete));
    toast.success('Attendance record has been deleted.');
  };

  const handleStartEdit = (record) => { setRecordToEdit(record); navigate('/attendance'); };
  const handleCancelEdit = () => { setRecordToEdit(null); navigate('/log'); };

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
    setMembersForAttendance(prevMembers => prevMembers.map(member => ({ ...member, status: null, reason: '' })));
    setBulkMarkingMode('none');
    toast.info('Attendance has been cleared.');
  };

  const handleToggleBulkMarking = (toggledMode) => {
    const newMode = bulkMarkingMode === toggledMode ? 'none' : toggledMode;
    setBulkMarkingMode(newMode);
    if (newMode === 'none') {
      setMembersForAttendance(prevMembers => prevMembers.map(member => ({ ...member, status: null, reason: '' })));
      toast.info('Attendance cleared.');
    } else {
      let statusToSet = 'Present';
      if (newMode === 'absent') statusToSet = 'Absent';
      else if (newMode === 'na') statusToSet = 'Not Applicable';

      setMembersForAttendance(prevMembers =>
        prevMembers.map(member => !member.status ? { ...member, status: statusToSet, reason: '' } : member)
      );
      toast.info(`Unmarked members have been marked as ${statusToSet}.`);
    }
  };

  const handleSave = async () => {
    if (!selectedDate || !selectedSection) { toast.warn('Please select a date and a section.'); return; }
    if (specialSectionsRequiringName.includes(selectedSection) && !eventName.trim()) { toast.warn('Please enter the name of the event.'); return; }
    if (selectedSection === 'Sunday evening mass' && !selectedScheduledTeam) { toast.warn('Please select which team is scheduled for this Sunday evening mass.'); return; }
    const markedMembers = membersForAttendance.filter(m => m.status !== null);
    if (markedMembers.length === 0) { toast.warn('Please mark at least one member.'); return; }
    const invalidExcuse = markedMembers.find(m => (m.status === 'Excused' || m.status === 'Excused but Present') && !m.reason?.trim());
    if (invalidExcuse) { toast.error(`Please provide a reason for the excused status for ${invalidExcuse.name}.`); return; }
    const recordPayload = {
      date: selectedDate, section: selectedSection,
      time: eventTime || null,
      eventName: specialSectionsRequiringName.includes(selectedSection) ? eventName.trim() : '',
      scheduledTeamId: selectedSection === 'Sunday evening mass' ? selectedScheduledTeam : null,
      records: markedMembers.map(({ id, name, status, reason }) => ({ id, name, status, reason })),
    };
    if (recordToEdit) {
      await handleUpdateRecord({ ...recordToEdit, ...recordPayload });
    } else {
      await addDoc(collection(db, 'attendanceHistory'), recordPayload);
      toast.success('Attendance saved.');
      // Trigger Push Notifications via Backend
      try {
        fetch('https://ftc-attendance-portal.onrender.com/api/notify-attendance', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(recordPayload)
        }).catch(err => console.error('Failed to trigger notifications:', err));
      } catch (err) {
        console.error('Failed to initiate notification fetch:', err);
      }
    }
    setRecordToEdit(null);
    setEventName('');
    setEventTime('');
    setSelectedScheduledTeam('');
    setSelectedDate(new Date().toISOString().slice(0, 10));
    setSelectedSection('Daily mass');
  };

  const handleMarkAttendanceFromSchedule = (event) => {
    setSelectedDate(event.date);
    setSelectedSection(event.type);
    setEventName(event.name || '');
    setEventTime(event.time || '');
    setSelectedScheduledTeam(event.teamId || '');
    setRecordToEdit(null);
    navigate('/attendance');
  };

  const attendanceSections = [
    'Daily mass', 'Saturday practice', 'Sunday morning mass', 'Sunday evening mass',
    'Special mass practice', 'Special mass', 'Marriage mass', 'Choir meeting', 'Cleaning', 'Others'
  ];

  if (authLoading) return (
    <div className="flex h-screen items-center justify-center bg-slate-50 dark:bg-slate-900">
      <div className="spinner"></div>
    </div>
  );

  return (
    <>
      <ToastContainer position="top-right" autoClose={3000} hideProgressBar={false} newestOnTop={false} closeOnClick rtl={false} pauseOnFocusLoss draggable pauseOnHover theme={theme === 'dark' ? 'dark' : 'colored'} />

      {!loggedInUser ? (
        <Routes>
          <Route path="*" element={<Login onLogin={handleLogin} onPasswordReset={handlePasswordReset} />} />
        </Routes>
      ) : (
        <Layout user={loggedInUser} onLogout={() => setShowLogoutConfirm(true)} theme={theme} toggleTheme={toggleTheme}>
          <Routes>
            {loggedInUser.role === 'admin' ? (
              <>
                <Route path="/" element={<Dashboard user={loggedInUser} attendanceHistory={attendanceHistory} choirMembersList={choirMembers} teams={teams} isLoading={historyLoading || membersLoading || teamsLoading} theme={theme} />} />
                <Route path="/attendance" element={<AttendanceForm members={membersForAttendance} selectedDate={selectedDate} setSelectedDate={setSelectedDate} selectedSection={selectedSection} setSelectedSection={setSelectedSection} attendanceSections={attendanceSections} handleAttendance={handleAttendance} handleReasonChange={handleReasonChange} handleSave={handleSave} eventName={eventName} setEventName={setEventName} eventTime={eventTime} setEventTime={setEventTime} specialSections={specialSectionsRequiringName} isEditing={!!recordToEdit} onCancelEdit={handleCancelEdit} handleToggleBulkMarking={handleToggleBulkMarking} handleClearAttendance={handleClearAttendance} bulkMarkingMode={bulkMarkingMode} teams={teams} selectedScheduledTeam={selectedScheduledTeam} setSelectedScheduledTeam={setSelectedScheduledTeam} sundaySchedule={sundaySchedule} eventSchedules={eventSchedules} />} />
                <Route path="/log" element={<AttendanceLog history={attendanceHistory} onDeleteRecord={handleDeleteRecord} onStartEdit={handleStartEdit} isReadOnly={false} isLoading={historyLoading} teams={teams} />} />
                <Route path="/schedule" element={<Schedule user={loggedInUser} teams={teams} sundaySchedule={sundaySchedule} eventSchedules={eventSchedules} attendanceHistory={attendanceHistory} choirMembersList={choirMembers} onGenerateSunday={handleGenerateSchedule} onUpdateSunday={handleUpdateScheduleEntry} onAddEvent={handleAddEventSchedule} onEditEvent={handleEditEventSchedule} onDeleteEvent={handleDeleteEventSchedule} onMarkAttendance={handleMarkAttendanceFromSchedule} isLoading={teamsLoading} />} />
                <Route path="/statistics" element={<MemberReport attendanceHistory={attendanceHistory} choirMembersList={choirMembers} isLoading={historyLoading || membersLoading} teams={teams} theme={theme} />} />
                <Route path="/teams" element={<ManageTeams loggedInUser={loggedInUser} choirMembersList={choirMembers} teams={teams} onUpdateTeam={handleUpdateTeam} onCreateTeam={handleCreateTeam} onDeleteTeam={handleDeleteTeam} isReadOnly={false} isLoading={teamsLoading || membersLoading} />} />
                <Route path="/members" element={<ManageMembers members={choirMembers} onAddMember={handleAddNewMember} onEditMember={handleEditMember} onRemoveMember={handleRemoveMember} isReadOnly={false} isLoading={membersLoading} />} />
                <Route path="/how-to-use" element={<HowToUse user={loggedInUser} />} />
                <Route path="*" element={<Navigate to="/" />} />
              </>
            ) : (
              <>
                <Route path="/" element={<Dashboard user={loggedInUser} attendanceHistory={attendanceHistory} choirMembersList={choirMembers} teams={teams} isLoading={historyLoading || membersLoading || teamsLoading} theme={theme} />} />
                <Route path="/my-stats" element={<MyStats user={loggedInUser} history={attendanceHistory} teams={teams} theme={theme} sundaySchedule={sundaySchedule} eventSchedules={eventSchedules} />} />
                <Route path="/schedule" element={<Schedule user={loggedInUser} teams={teams} sundaySchedule={sundaySchedule} eventSchedules={eventSchedules} attendanceHistory={attendanceHistory} choirMembersList={choirMembers} isLoading={teamsLoading} />} />
                <Route path="/log" element={<AttendanceLog history={attendanceHistory} isReadOnly={true} isLoading={historyLoading} teams={teams} />} />
                <Route path="/teams" element={<ManageTeams choirMembersList={choirMembers} teams={teams} isReadOnly={true} isLoading={teamsLoading || membersLoading} />} />
                <Route path="/members" element={<ManageMembers members={choirMembers} isReadOnly={true} isLoading={membersLoading} />} />
                <Route path="/profile" element={<Profile user={loggedInUser} onUpdateProfile={handleUpdateProfile} />} />
                <Route path="/how-to-use" element={<HowToUse user={loggedInUser} />} />
                <Route path="*" element={<Navigate to="/" />} />
              </>
            )}
          </Routes>
        </Layout>
      )}

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div className="modal-overlay" onClick={() => setShowLogoutConfirm(false)}>
          <div className="modal-content max-w-sm" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 flex-1">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-2xl bg-coral-100 dark:bg-coral-900/30 flex items-center justify-center flex-shrink-0">
                  <i className="bi bi-box-arrow-right text-coral-500 dark:text-coral-400 text-xl"></i>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-800 dark:text-white">Confirm Log Out</h3>
                  <p className="text-sm text-slate-500 dark:text-navy-300">Are you sure you want to end your session?</p>
                </div>
              </div>
            </div>
            <div className="flex gap-3 justify-end p-4 border-t border-slate-100 dark:border-navy-700 bg-slate-50 dark:!bg-navy-900 rounded-b-3xl">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 dark:text-navy-300 dark:bg-navy-800 dark:hover:bg-navy-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleLogout}
                className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white bg-coral-500 hover:bg-coral-600 shadow-lg shadow-coral-500/20 transition-all hover:-translate-y-0.5"
              >
                Log Out
              </button>
            </div>
          </div>
        </div>
      )}
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
