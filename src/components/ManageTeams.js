import React, { useState, useMemo, useEffect, useCallback } from 'react';
import PageHeader from './Layout/PageHeader';
import Button from './UI/Button';
import Card from './UI/Card';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';


function ManageTeams({
  loggedInUser, choirMembersList, teams, onUpdateTeam, onCreateTeam, onDeleteTeam,

  isReadOnly = false, isLoading
}) {
  const [sundaySearch, setSundaySearch] = useState('');
  const [marriageSearch, setMarriageSearch] = useState('');
  const [sundayOpenTeams, setSundayOpenTeams] = useState({});
  const [marriageOpenTeams, setMarriageOpenTeams] = useState({});
  const [showAddModal, setShowAddModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

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
      />



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


    </>
  );
}

export default ManageTeams;
