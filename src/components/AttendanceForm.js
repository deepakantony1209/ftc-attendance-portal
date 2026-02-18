import React, { useState, useMemo, useEffect } from 'react';
import PageHeader from './Layout/PageHeader';
import Button from './UI/Button';
import Card from './UI/Card';

function AttendanceForm({
  members,
  selectedDate, setSelectedDate, selectedSection, setSelectedSection,
  attendanceSections, handleAttendance, handleReasonChange, handleSave,
  eventName, setEventName, specialSections,
  isEditing, onCancelEdit,
  handleToggleBulkMarking, handleClearAttendance, bulkMarkingMode,
  teams, selectedScheduledTeam, setSelectedScheduledTeam,
  sundaySchedule = []
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [openPanels, setOpenPanels] = useState({ male: false, female: false });

  const isSectionDisabled = !selectedDate;
  const isContentDisabled = !selectedDate || !selectedSection || (specialSections.includes(selectedSection) && !eventName.trim());

  const getStatusClasses = (status) => {
    if (status === 'Present' || status === 'Excused but Present') return 'bg-emerald-600 text-white border-emerald-600';
    if (status === 'Absent' || status === 'Excused') return 'bg-red-600 text-white border-red-600';
    return '';
  };

  const { maleMembers, femaleMembers } = useMemo(() => {
    const filtered = members.filter(member =>
      member.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    return {
      maleMembers: filtered.filter(m => m.gender === 'Male').sort((a, b) => a.name.localeCompare(b.name)),
      femaleMembers: filtered.filter(m => m.gender === 'Female').sort((a, b) => a.name.localeCompare(b.name)),
    };
  }, [members, searchTerm]);

  useEffect(() => {
    if (searchTerm.trim()) {
      setOpenPanels({ male: maleMembers.length > 0, female: femaleMembers.length > 0 });
    }
  }, [searchTerm, maleMembers.length, femaleMembers.length]);

  useEffect(() => {
    if (selectedDate && selectedSection === 'Sunday evening mass' && sundaySchedule.length > 0) {
      const dateObj = new Date(selectedDate);
      if (dateObj.getDay() === 0) {
        const schedule = sundaySchedule.find(s => s.date === selectedDate);
        if (schedule && schedule.teamId) setSelectedScheduledTeam(schedule.teamId);
      }
    }
  }, [selectedDate, selectedSection, sundaySchedule, setSelectedScheduledTeam]);

  const renderMemberList = (memberList, gender) => {
    if (memberList.length === 0) {
      return <div className="p-4 text-center text-slate-400 italic text-sm">No {gender} members found.</div>;
    }
    return memberList.map(member => (
      <div key={member.id} className="flex flex-wrap md:flex-nowrap items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-700/50 last:border-0 hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
        <div className="flex items-center gap-3 mb-2 md:mb-0">
          <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0 ${gender === 'male' ? 'bg-sky-500' : 'bg-amber-500'}`}>
            {member.name.charAt(0)}
          </div>
          <div>
            <div className="font-semibold text-slate-800 dark:text-slate-100 text-sm">{member.name}</div>
            {member.role === 'admin' && <span className="text-[10px] font-bold uppercase bg-slate-200 dark:bg-slate-700 text-slate-500 px-1.5 py-0.5 rounded">Admin</span>}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end w-full md:w-auto">
          <select
            value={member.status || ''}
            onChange={(e) => handleAttendance(member.id, e.target.value)}
            disabled={isContentDisabled}
            className={`form-select min-w-[160px] w-auto text-sm font-medium ${getStatusClasses(member.status)}`}
          >
            <option value="" disabled>Mark Attendance</option>
            <option value="Present">Present</option>
            <option value="Absent">Absent</option>
            <option value="Excused but Present">Excused but Present</option>
            <option value="Excused">Excused</option>
          </select>
          {(member.status === 'Excused' || member.status === 'Excused but Present') && (
            <input
              type="text"
              placeholder="Reason..."
              value={member.reason || ''}
              onChange={(e) => handleReasonChange(member.id, e.target.value)}
              disabled={isContentDisabled}
              required
              className="form-input min-w-[180px] w-auto text-sm"
            />
          )}
        </div>
      </div>
    ));
  };

  const togglePanel = (panel) => {
    setOpenPanels(prev => ({ ...prev, [panel]: !prev[panel] }));
  };

  return (
    <>
      <PageHeader
        title={isEditing ? "Edit Attendance" : "Record Attendance"}
        subtitle={isEditing ? "Modify existing attendance record." : "Log attendance for mass or practice."}
      />

      {/* Date & Section Selector */}
      <Card className="mb-5">
        <Card.Body>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="form-label">Select Date</label>
              <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} required className="form-input" />
            </div>
            <div>
              <label className="form-label">Activity Type</label>
              <select value={selectedSection} onChange={(e) => setSelectedSection(e.target.value)} required disabled={isSectionDisabled} className="form-select">
                <option value="" disabled>Select an Activity Type</option>
                {attendanceSections.map(section => (
                  <option key={section} value={section}>{section}</option>
                ))}
              </select>
            </div>

            {specialSections.includes(selectedSection) && (
              <div className="md:col-span-2">
                <label className="form-label">Activity Name</label>
                <input type="text" value={eventName} onChange={(e) => setEventName(e.target.value)} placeholder="e.g., Easter Vigil, St. Cecilia Feast" required disabled={isSectionDisabled} className="form-input" />
              </div>
            )}

            {selectedSection === 'Sunday evening mass' && (
              <div className="md:col-span-2">
                <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                  {selectedScheduledTeam && sundaySchedule.find(s => s.date === selectedDate) && (
                    <div className="alert alert-info mb-3">
                      <i className="bi bi-info-circle"></i> Team auto-selected based on rotation schedule.
                    </div>
                  )}
                  <label className="form-label">Scheduled Team</label>
                  <select value={selectedScheduledTeam} onChange={(e) => setSelectedScheduledTeam(e.target.value)} required disabled={isSectionDisabled} className="form-select mb-2">
                    <option value="">Select which team is scheduled...</option>
                    <option value="all-choir">All Choir Members</option>
                    <option value="na-team">NA (Not Applicable)</option>
                    <option disabled>──────────</option>
                    {teams.filter(team => team.type === 'sunday').sort((a, b) => a.name.localeCompare(b.name)).map(team => (
                      <option key={team.id} value={team.id}>{team.name}</option>
                    ))}
                  </select>
                  {selectedScheduledTeam === 'na-team' && (
                    <div className="text-amber-600 dark:text-amber-400 text-sm flex items-center gap-1"><i className="bi bi-exclamation-triangle"></i> Attendance will not count.</div>
                  )}
                  {selectedScheduledTeam === 'all-choir' && (
                    <div className="text-emerald-600 dark:text-emerald-400 text-sm flex items-center gap-1"><i className="bi bi-people-fill"></i> Open for all members.</div>
                  )}
                </div>
              </div>
            )}
          </div>
        </Card.Body>
      </Card>

      {/* Members List */}
      <div className={isContentDisabled ? 'opacity-50 pointer-events-none' : ''}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h5 className="font-bold text-slate-800 dark:text-white">Members List</h5>
            <p className="text-sm text-slate-500 dark:text-slate-400">Mark attendance for each member below.</p>
          </div>
          <div className="relative w-full sm:w-72">
            <i className="bi bi-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"></i>
            <input type="text" placeholder="Search member..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} disabled={isContentDisabled} className="form-input pl-10" />
          </div>
        </div>

        {/* Accordion Panels */}
        <div className="mb-5 nock-card overflow-hidden">
          {/* Men Panel */}
          <div className="border-b border-slate-100 dark:border-slate-700/50 last:border-0">
            <button onClick={() => togglePanel('male')} className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
              <div className="flex items-center gap-2">
                <i className="bi bi-gender-male text-sky-500 text-lg"></i>
                <span className="font-bold text-slate-800 dark:text-slate-200">Men</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300 px-2 py-1 rounded-full">{maleMembers.length}</span>
                <i className={`bi bi-chevron-${openPanels.male ? 'up' : 'down'} text-slate-400`}></i>
              </div>
            </button>
            {openPanels.male && (
              <div className="border-t border-slate-100 dark:border-slate-700/50">
                {renderMemberList(maleMembers, 'male')}
              </div>
            )}
          </div>
          {/* Women Panel */}
          <div>
            <button onClick={() => togglePanel('female')} className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
              <div className="flex items-center gap-2">
                <i className="bi bi-gender-female text-amber-500 text-lg"></i>
                <span className="font-bold text-slate-800 dark:text-slate-200">Women</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300 px-2 py-1 rounded-full">{femaleMembers.length}</span>
                <i className={`bi bi-chevron-${openPanels.female ? 'up' : 'down'} text-slate-400`}></i>
              </div>
            </button>
            {openPanels.female && (
              <div className="border-t border-slate-100 dark:border-slate-700/50">
                {renderMemberList(femaleMembers, 'female')}
              </div>
            )}
          </div>
        </div>

        {/* Action Bar */}
        <Card className="shadow-lg bg-slate-900 dark:bg-slate-950 border-slate-700 mb-6">
          <Card.Body className="p-4">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
                {/* Mark Remaining Present */}
                <label className="flex items-center gap-3 cursor-pointer">
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={bulkMarkingMode === 'present'}
                      disabled={bulkMarkingMode === 'absent' || isContentDisabled}
                      onChange={() => handleToggleBulkMarking('present')}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-600 rounded-full peer peer-checked:bg-emerald-500 transition-colors"></div>
                    <div className="absolute left-0.5 top-0.5 w-5 h-5 bg-white rounded-full peer-checked:translate-x-5 transition-transform"></div>
                  </div>
                  <span className="text-sm font-medium text-white">Mark Remaining Present</span>
                </label>

                {/* Mark Remaining Absent */}
                <label className="flex items-center gap-3 cursor-pointer">
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={bulkMarkingMode === 'absent'}
                      disabled={bulkMarkingMode === 'present' || isContentDisabled}
                      onChange={() => handleToggleBulkMarking('absent')}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-600 rounded-full peer peer-checked:bg-red-500 transition-colors"></div>
                    <div className="absolute left-0.5 top-0.5 w-5 h-5 bg-white rounded-full peer-checked:translate-x-5 transition-transform"></div>
                  </div>
                  <span className="text-sm font-medium text-white">Mark Remaining Absent</span>
                </label>
              </div>

              <div className="flex gap-2 w-full md:w-auto justify-end">
                {isEditing && (
                  <Button variant="secondary" onClick={onCancelEdit} disabled={isContentDisabled}>Cancel</Button>
                )}
                <button onClick={handleClearAttendance} disabled={isContentDisabled} className="px-4 py-2.5 rounded-xl text-sm font-semibold border border-slate-500 text-slate-300 hover:bg-slate-800 transition-colors disabled:opacity-50">
                  Clear
                </button>
                <Button variant="primary" onClick={handleSave} disabled={isContentDisabled}>
                  {isEditing ? 'Update Changes' : 'Save Attendance'}
                </Button>
              </div>
            </div>
          </Card.Body>
        </Card>

      </div>
    </>
  );
}

export default AttendanceForm;