import React, { useState, useMemo, useEffect, useCallback } from 'react';
import PageHeader from './Layout/PageHeader';
import Button from './UI/Button';
import Card from './UI/Card';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatDateForDisplay } from '../utils/scheduleUtils';

function ManageTeams({
  loggedInUser, choirMembersList, teams, onUpdateTeam, onCreateTeam, onDeleteTeam,
  isReadOnly = false, isLoading, sundaySchedule = [], onGenerateSchedule, onUpdateScheduleEntry
}) {
  const [sundaySearch, setSundaySearch] = useState('');
  const [marriageSearch, setMarriageSearch] = useState('');
  const [sundayOpenTeams, setSundayOpenTeams] = useState({});
  const [marriageOpenTeams, setMarriageOpenTeams] = useState({});
  const [showAddModal, setShowAddModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showEditScheduleModal, setShowEditScheduleModal] = useState(false);
  const [scheduleToEdit, setScheduleToEdit] = useState(null);
  const [selectedTeamForSchedule, setSelectedTeamForSchedule] = useState('');
  const [newTeamName, setNewTeamName] = useState('');
  const [teamToModify, setTeamToModify] = useState(null);
  const [teamTypeToCreate, setTeamTypeToCreate] = useState(null);

  const memberMap = useMemo(() => new Map(choirMembersList.map(m => [m.id, m])), [choirMembersList]);

  const getProcessedTeamsForType = useCallback((type) => {
    return teams.filter(team => team.type === type).map(team => ({
      ...team,
      memberDetails: team.members.map(id => memberMap.get(id)).filter(Boolean).sort((a, b) => {
        if (a.isOrganist && !b.isOrganist) return -1;
        if (!a.isOrganist && b.isOrganist) return 1;
        if (a.gender === 'Female' && b.gender !== 'Female') return -1;
        if (a.gender !== 'Female' && b.gender === 'Female') return 1;
        return a.name.localeCompare(b.name);
      }),
    })).sort((a, b) => a.name.localeCompare(b.name));
  }, [teams, memberMap]);

  const sundayTeams = useMemo(() => getProcessedTeamsForType('sunday'), [getProcessedTeamsForType]);
  const marriageTeams = useMemo(() => getProcessedTeamsForType('marriage'), [getProcessedTeamsForType]);

  const getUnassignedMembersForType = useCallback((type) => {
    const assignedMemberIds = new Set(teams.filter(t => t.type === type).flatMap(t => t.members));
    return choirMembersList.filter(m => !assignedMemberIds.has(m.id)).sort((a, b) => a.name.localeCompare(b.name));
  }, [teams, choirMembersList]);

  const unassignedSundayMembers = useMemo(() => getUnassignedMembersForType('sunday'), [getUnassignedMembersForType]);
  const unassignedMarriageMembers = useMemo(() => getUnassignedMembersForType('marriage'), [getUnassignedMembersForType]);

  const filterTeams = (teamsToFilter, searchTerm) => {
    if (!searchTerm.trim()) return teamsToFilter;
    const lower = searchTerm.toLowerCase();
    return teamsToFilter.map(team => ({ ...team, memberDetails: team.memberDetails.filter(m => m.name.toLowerCase().includes(lower)) })).filter(team => team.memberDetails.length > 0);
  };

  const filteredSundayTeams = useMemo(() => filterTeams(sundayTeams, sundaySearch), [sundayTeams, sundaySearch]);
  const filteredMarriageTeams = useMemo(() => filterTeams(marriageTeams, marriageSearch), [marriageTeams, marriageSearch]);

  useEffect(() => {
    const openAll = (tms) => tms.reduce((acc, t) => ({ ...acc, [t.id]: true }), {});
    setSundayOpenTeams(openAll(sundayTeams));
    setMarriageOpenTeams(openAll(marriageTeams));
  }, [sundayTeams, marriageTeams]);

  const handleAddMember = (memberId) => { if (teamToModify) onUpdateTeam(teamToModify.id, [...teamToModify.members, memberId]); };
  const handleRemoveMember = (team, memberId) => onUpdateTeam(team.id, team.members.filter(id => id !== memberId));
  const handleCreateTeamSubmit = async (e) => { e.preventDefault(); const ok = await onCreateTeam(newTeamName, teamTypeToCreate); if (ok) { setNewTeamName(''); setShowCreateModal(false); } };
  const handleDeleteTeamConfirm = () => { if (teamToModify) { onDeleteTeam(teamToModify.id, teamToModify.name); setShowDeleteModal(false); setTeamToModify(null); } };
  const handleUpdateSchedule = () => { if (scheduleToEdit && selectedTeamForSchedule && onUpdateScheduleEntry) { onUpdateScheduleEntry(scheduleToEdit.date, selectedTeamForSchedule); setShowEditScheduleModal(false); } };

  const upcomingSchedule = useMemo(() => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    return sundaySchedule.filter(s => new Date(s.date) >= today).sort((a, b) => new Date(a.date) - new Date(b.date)).slice(0, 6);
  }, [sundaySchedule]);

  const scheduleContext = useMemo(() => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const sorted = [...sundaySchedule].sort((a, b) => new Date(a.date) - new Date(b.date));
    const upcomingIndex = sorted.findIndex(s => { const d = new Date(s.date); d.setHours(0, 0, 0, 0); return d >= today; });
    if (upcomingIndex === -1) return { previous: sorted.length > 0 ? sorted[sorted.length - 1] : null, current: null, next: null };
    return { previous: upcomingIndex > 0 ? sorted[upcomingIndex - 1] : null, current: sorted[upcomingIndex], next: sorted[upcomingIndex + 1] || null };
  }, [sundaySchedule]);

  const handleDownloadPdf = (teamData, title) => {
    const doc = new jsPDF();
    doc.setFontSize(18); doc.text(title, 14, 22);
    doc.setFontSize(11); doc.text(`Generated on: ${new Date().toLocaleDateString('en-GB')}`, 14, 30);
    const tableRows = [];
    teamData.forEach(team => {
      tableRows.push([{ content: `${team.name} (${team.memberDetails.length} Members)`, colSpan: 1, styles: { fontStyle: 'bold', fillColor: '#f0f0f0', textColor: '#000' } }]);
      if (team.memberDetails.length > 0) team.memberDetails.forEach(m => tableRows.push([m.isOrganist ? `${m.name} (Organist)` : m.name]));
      else tableRows.push(['- No members -']);
    });
    autoTable(doc, { head: [[`${title} List`]], body: tableRows, startY: 40, theme: 'grid', headStyles: { fillColor: [13, 110, 253] } });
    doc.save(`${title.replace(/\s+/g, '_')}_Report.pdf`);
  };

  if (isLoading) return <div className="flex items-center justify-center min-h-[60vh]"><div className="spinner"></div></div>;

  const renderTeamSection = (title, teamList, searchTerm, setSearchTerm, openTeams, setOpenTeams, type, handlePdf) => (
    <Card className="mb-5">
      <Card.Header>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <h5 className="font-bold text-slate-800 dark:text-white">{title}</h5>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <i className="bi bi-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>
              <input type="text" placeholder="Search..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="form-input pl-9 py-2 text-sm w-48" />
            </div>
            {!isReadOnly && <Button variant="success" size="sm" onClick={() => { setTeamTypeToCreate(type); setNewTeamName(''); setShowCreateModal(true); }} icon="bi-plus-lg">Create</Button>}
            <Button variant="secondary" size="sm" onClick={handlePdf} icon="bi-download">PDF</Button>
          </div>
        </div>
      </Card.Header>
      <Card.Body className="p-0">
        {teamList.map(team => (
          <div key={team.id} className="border-b border-slate-100 dark:border-slate-700/50 last:border-0">
            <button onClick={() => setOpenTeams(prev => ({ ...prev, [team.id]: !prev[team.id] }))} className="w-full flex items-center justify-between px-5 py-3 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-800 dark:text-slate-200">{team.name}</span>
                <span className="text-xs font-bold bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 px-2 py-0.5 rounded-full">{team.memberDetails.length}</span>
              </div>
              <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                {!isReadOnly && (
                  <>
                    <button onClick={() => { setTeamToModify(team); setShowAddModal(true); }} className="p-1.5 rounded text-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors" title="Add member"><i className="bi bi-person-plus-fill"></i></button>
                    <button onClick={() => { setTeamToModify(team); setShowDeleteModal(true); }} className="p-1.5 rounded text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors" title="Delete team"><i className="bi bi-trash-fill"></i></button>
                  </>
                )}
                <i className={`bi bi-chevron-${openTeams[team.id] ? 'up' : 'down'} text-slate-400 ml-2`}></i>
              </div>
            </button>
            {openTeams[team.id] && (
              <div className="bg-slate-50/50 dark:bg-slate-900/50">
                {team.memberDetails.length > 0 ? team.memberDetails.map(member => (
                  <div key={member.id} className="flex items-center justify-between px-5 py-2 border-t border-slate-100 dark:border-slate-700/30 pl-8">
                    <div className="flex items-center gap-2">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold ${member.gender === 'Female' ? 'bg-amber-500' : 'bg-sky-500'}`}>{member.name.charAt(0)}</div>
                      <span className="text-sm text-slate-700 dark:text-slate-300">{member.name}</span>
                      {member.isOrganist && <span className="text-[10px] font-bold uppercase bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400 px-1.5 py-0.5 rounded">Organist</span>}
                    </div>
                    {!isReadOnly && (
                      <button onClick={() => handleRemoveMember(team, member.id)} className="text-red-400 hover:text-red-600 transition-colors opacity-50 hover:opacity-100" title={`Remove ${member.name}`}><i className="bi bi-x-circle-fill"></i></button>
                    )}
                  </div>
                )) : (
                  <div className="px-8 py-3 text-sm italic text-slate-400 border-t border-slate-100 dark:border-slate-700/30">{searchTerm ? 'No matching members.' : 'No members assigned.'}</div>
                )}
              </div>
            )}
          </div>
        ))}
      </Card.Body>
    </Card>
  );

  return (
    <>
      <PageHeader
        title="Manage Teams"
        subtitle="Organize Sunday and Marriage mass choirs."
        actions={!isReadOnly && onGenerateSchedule && (
          <Button variant="success" onClick={onGenerateSchedule} icon="bi-calendar-week">Generate 12-Week Schedule</Button>
        )}
      />

      {/* Sunday Schedule */}
      {sundayTeams.length > 0 && (
        isReadOnly ? (
          <div className="bg-gradient-to-br from-primary-600 to-indigo-700 dark:from-primary-800 dark:to-indigo-900 rounded-2xl p-6 md:p-8 text-white text-center mb-6 shadow-xl">
            {scheduleContext.current ? (
              <>
                <div className="text-xs font-bold uppercase tracking-wider opacity-60 mb-2">Next Sunday Mass</div>
                <h2 className="text-3xl md:text-4xl font-extrabold mb-1">{scheduleContext.current.teamName}</h2>
                <div className="text-lg opacity-75 mb-5">{formatDateForDisplay(scheduleContext.current.date)}</div>
                <div className="flex justify-center gap-6 opacity-60">
                  {scheduleContext.previous && <div className="border-r border-white/20 pr-6"><div className="text-[10px] uppercase tracking-wider">Previous</div><div className="font-medium">{scheduleContext.previous.teamName}</div></div>}
                  {scheduleContext.next && <div><div className="text-[10px] uppercase tracking-wider">Next Up</div><div className="font-medium">{scheduleContext.next.teamName}</div></div>}
                </div>
              </>
            ) : (
              <div className="py-4"><i className="bi bi-calendar-x text-3xl opacity-50 block mb-2"></i>No upcoming schedule available.</div>
            )}
          </div>
        ) : (
          <Card className="mb-5">
            <Card.Header><h5 className="font-bold text-slate-800 dark:text-white text-sm">Upcoming Sunday Schedule</h5></Card.Header>
            <Card.Body className="p-0">
              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead><tr><th>Date</th><th>Scheduled Team</th>{!isReadOnly && onUpdateScheduleEntry && <th className="text-right">Action</th>}</tr></thead>
                  <tbody>
                    {upcomingSchedule.length > 0 ? upcomingSchedule.map(schedule => (
                      <tr key={schedule.date}>
                        <td className="font-medium">{formatDateForDisplay(schedule.date)}</td>
                        <td><span className="text-xs font-bold bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400 px-2.5 py-1 rounded-full">{schedule.teamName}</span></td>
                        {!isReadOnly && onUpdateScheduleEntry && (
                          <td className="text-right"><Button variant="secondary" size="sm" onClick={() => { setScheduleToEdit(schedule); setSelectedTeamForSchedule(schedule.teamId); setShowEditScheduleModal(true); }} icon="bi-pencil-square">Change</Button></td>
                        )}
                      </tr>
                    )) : (
                      <tr><td colSpan="3" className="text-center py-6 text-slate-400">No schedule generated. Use the "Generate" button above.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card.Body>
          </Card>
        )
      )}

      {renderTeamSection('Sunday Evening Mass Teams', filteredSundayTeams, sundaySearch, setSundaySearch, sundayOpenTeams, setSundayOpenTeams, 'sunday', () => handleDownloadPdf(sundayTeams, 'Sunday Evening Mass Teams'))}
      {renderTeamSection('Marriage Mass Teams', filteredMarriageTeams, marriageSearch, setMarriageSearch, marriageOpenTeams, setMarriageOpenTeams, 'marriage', () => handleDownloadPdf(marriageTeams, 'Marriage Mass Teams'))}

      {/* Add Member Modal */}
      {!isReadOnly && showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-700">
              <h3 className="font-bold text-slate-800 dark:text-white">Add Member to {teamToModify?.name}</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600"><i className="bi bi-x-lg"></i></button>
            </div>
            <div className="max-h-96 overflow-y-auto">
              {(() => {
                const members = teamToModify?.type === 'sunday' ? unassignedSundayMembers : unassignedMarriageMembers;
                return members && members.length > 0 ? members.map(m => (
                  <button key={m.id} onClick={() => { handleAddMember(m.id); setShowAddModal(false); }} className="w-full flex items-center justify-between px-5 py-3 hover:bg-slate-50 dark:hover:bg-slate-800 border-b border-slate-100 dark:border-slate-700/50 transition-colors">
                    <div><span className="font-medium text-sm text-slate-700 dark:text-slate-200">{m.name}</span>{m.isOrganist && <span className="ml-2 text-[10px] font-bold bg-sky-100 text-sky-600 px-1.5 py-0.5 rounded">Organist</span>}</div>
                    <i className="bi bi-plus-circle text-primary-500 text-lg"></i>
                  </button>
                )) : <div className="p-6 text-center text-sm text-slate-400">All members are already assigned.</div>;
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Create Team Modal */}
      {!isReadOnly && showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content max-w-sm" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-700">
              <h3 className="font-bold text-slate-800 dark:text-white">Create {teamTypeToCreate === 'sunday' ? 'Sunday' : 'Marriage'} Team</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-600"><i className="bi bi-x-lg"></i></button>
            </div>
            <form onSubmit={handleCreateTeamSubmit} className="p-5 space-y-4">
              <div><label className="form-label">Team Name</label><input type="text" value={newTeamName} onChange={(e) => setNewTeamName(e.target.value)} placeholder="e.g., Team Alpha" autoFocus required className="form-input" /></div>
              <div className="flex gap-3 justify-end"><Button variant="secondary" onClick={() => setShowCreateModal(false)}>Cancel</Button><Button variant="primary" type="submit">Create</Button></div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Team Modal */}
      {!isReadOnly && showDeleteModal && (
        <div className="modal-overlay" onClick={() => setShowDeleteModal(false)}>
          <div className="modal-content max-w-sm" onClick={(e) => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center"><i className="bi bi-exclamation-triangle-fill text-red-600"></i></div>
                <h3 className="text-lg font-bold text-slate-800 dark:text-white">Delete Team</h3>
              </div>
              <p className="text-slate-600 dark:text-slate-400 mb-1">Delete <strong>{teamToModify?.name}</strong>?</p>
              <p className="text-sm text-slate-400 mb-6">All members will be unassigned.</p>
              <div className="flex gap-3 justify-end"><Button variant="secondary" onClick={() => setShowDeleteModal(false)}>Cancel</Button><Button variant="danger" onClick={handleDeleteTeamConfirm}>Delete</Button></div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Schedule Modal */}
      {!isReadOnly && showEditScheduleModal && (
        <div className="modal-overlay" onClick={() => setShowEditScheduleModal(false)}>
          <div className="modal-content max-w-sm" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-700">
              <h3 className="font-bold text-slate-800 dark:text-white">Change Schedule</h3>
              <button onClick={() => setShowEditScheduleModal(false)} className="text-slate-400 hover:text-slate-600"><i className="bi bi-x-lg"></i></button>
            </div>
            <div className="p-5 space-y-4">
              {scheduleToEdit && (
                <>
                  <div className="text-center mb-2">
                    <div className="text-xs font-bold uppercase text-slate-400">Scheduled Date</div>
                    <div className="text-xl font-bold text-slate-800 dark:text-white">{formatDateForDisplay(scheduleToEdit.date)}</div>
                  </div>
                  <div><label className="form-label font-bold">Select New Team</label>
                    <select value={selectedTeamForSchedule} onChange={(e) => setSelectedTeamForSchedule(e.target.value)} className="form-select">
                      <option value="">-- Choose Team --</option>
                      <option value="all-choir">All Choir Members</option>
                      <option value="na-team">NA (Not Applicable)</option>
                      <option disabled>──────────</option>
                      {sundayTeams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                  </div>
                </>
              )}
              <div className="flex gap-3 justify-end"><Button variant="secondary" onClick={() => setShowEditScheduleModal(false)}>Cancel</Button><Button variant="primary" onClick={handleUpdateSchedule} disabled={!selectedTeamForSchedule}>Save</Button></div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default ManageTeams;
