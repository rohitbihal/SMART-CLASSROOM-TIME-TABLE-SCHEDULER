import React, { useState, useMemo } from 'react';
import { SectionCard, Modal, FormField, SelectInput, SearchInput, TextInput } from '../../components/common';
import { QueryIcon, ClockIcon, CheckCircleIcon, XCircleIcon, InfoIcon, FilterIcon, SendIcon } from '../../components/Icons';
import { useAppContext } from '../../context/AppContext';
import { TeacherQuery } from '../../types';

type Status = TeacherQuery['status'];

const statusStyles: Record<Status, { icon: React.ReactNode, text: string, chip: string }> = {
    'Pending': { icon: <ClockIcon className="h-5 w-5 text-yellow-500" />, text: 'text-yellow-500', chip: 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-700 dark:text-yellow-300' },
    'Approved': { icon: <CheckCircleIcon className="h-5 w-5 text-green-500" />, text: 'text-green-500', chip: 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300' },
    'Rejected': { icon: <XCircleIcon className="h-5 w-5 text-red-500" />, text: 'text-red-500', chip: 'bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300' },
    'Under Review': { icon: <InfoIcon className="h-5 w-5 text-blue-500" />, text: 'text-blue-500', chip: 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300' },
};

// NEW: Mock chat component for query details
const QueryChat = ({ query, facultyName }: { query: TeacherQuery, facultyName: string }) => {
    const [messages, setMessages] = useState([
        { author: facultyName, text: "I've submitted the request for a classroom change. The current room is too small." },
        { author: 'Admin', text: "Thanks, I'm looking into available rooms now."}
    ]);
    const [newMessage, setNewMessage] = useState('');

    const handleSend = () => {
        if (newMessage.trim()) {
            setMessages([...messages, { author: 'Admin', text: newMessage.trim() }]);
            setNewMessage('');
        }
    };

    return (
        <div className="mt-4 pt-4 border-t border-border-primary">
            <h4 className="font-semibold mb-2">Discussion Thread</h4>
            <div className="h-40 bg-bg-primary rounded-lg p-2 overflow-y-auto space-y-2 text-sm">
                {messages.map((msg, i) => (
                    <div key={i}>
                        <span className={`font-bold ${msg.author === 'Admin' ? 'text-accent-primary' : ''}`}>{msg.author}: </span>
                        <span>{msg.text}</span>
                    </div>
                ))}
            </div>
            <div className="flex gap-2 mt-2">
                <TextInput value={newMessage} onChange={e => setNewMessage(e.target.value)} placeholder="Type a message..." />
                <button onClick={handleSend} className="btn-primary p-2.5"><SendIcon /></button>
            </div>
        </div>
    );
};


const QueryDetailModal = ({ query, facultyName, isOpen, onClose, onStatusChange }: { query: TeacherQuery; facultyName: string; isOpen: boolean; onClose: () => void; onStatusChange: (id: string, status: Status, response: string) => void; }) => {
    const [adminResponse, setAdminResponse] = useState('');
    if (!isOpen) return null;

    const handleStatusUpdate = (status: Status) => {
        onStatusChange(query.id, status, adminResponse);
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Query from ${facultyName}`} size="3xl">
            <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div><strong>Date:</strong> {new Date(query.submittedDate).toLocaleString()}</div>
                    <div><strong>Type:</strong> {query.queryType}</div>
                    <div><strong>Priority:</strong> <span className={query.priority === 'Urgent' ? 'text-red-500 font-bold' : ''}>{query.priority}</span></div>
                </div>
                <div className="p-3 bg-bg-primary rounded-md">
                    <p className="font-semibold">Request Details</p>
                    <p>{query.requestedChange}</p>
                </div>
                <div className="p-3 bg-bg-primary rounded-md">
                    <p className="font-semibold">Reason</p>
                    <p>{query.reason}</p>
                </div>
                <QueryChat query={query} facultyName={facultyName} />
                <FormField label="Admin Response / Final Comments" htmlFor="admin-response">
                    <textarea id="admin-response" value={adminResponse} onChange={e => setAdminResponse(e.target.value)} rows={4} className="input-base" placeholder="Add your comments here..."></textarea>
                </FormField>
                <div className="flex justify-end gap-2 pt-4 border-t border-border-primary">
                    <button onClick={() => handleStatusUpdate('Under Review')} className="btn-secondary">Mark as Under Review</button>
                    <button onClick={() => handleStatusUpdate('Rejected')} className="btn-danger">Reject</button>
                    <button onClick={() => handleStatusUpdate('Approved')} className="btn-primary">Approve</button>
                </div>
            </div>
        </Modal>
    );
}

const QueryPage = () => {
    const { teacherRequests, faculty } = useAppContext();
    const [selectedQuery, setSelectedQuery] = useState<TeacherQuery | null>(null);
    const [filters, setFilters] = useState({ search: '', status: 'all', priority: 'all' });

    const facultyMap = useMemo(() => new Map(faculty.map(f => [f.id, f.name])), [faculty]);

    const filteredQueries = useMemo(() => {
        return teacherRequests
            .filter(q => filters.status === 'all' || q.status === filters.status)
            .filter(q => filters.priority === 'all' || q.priority === filters.priority)
            .filter(q => {
                const facultyName = facultyMap.get(q.facultyId) || '';
                return facultyName.toLowerCase().includes(filters.search.toLowerCase()) || q.requestedChange.toLowerCase().includes(filters.search.toLowerCase());
            })
            .sort((a, b) => new Date(b.submittedDate).getTime() - new Date(a.submittedDate).getTime());
    }, [teacherRequests, filters, facultyMap]);
    
    const handleStatusChange = (id: string, status: Status, response: string) => {
        // In a real app, this would call a context function to update the backend
        console.log(`Updating query ${id} to status ${status} with response: "${response}"`);
        // You would then update the local state:
        // updateQueryStatus(id, status, response);
        alert(`Query status updated to ${status}. (This is a mock action)`);
    };

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold">Query Management</h1>
            <QueryDetailModal 
                isOpen={!!selectedQuery}
                onClose={() => setSelectedQuery(null)}
                query={selectedQuery!}
                facultyName={facultyMap.get(selectedQuery?.facultyId || '') || 'Unknown'}
                onStatusChange={handleStatusChange}
            />
            <SectionCard title="Query Dashboard">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-center">
                    <div className="p-4 bg-blue-100 dark:bg-blue-900/50 rounded-lg"><p className="text-2xl font-bold">{teacherRequests.length}</p><p>Total Queries</p></div>
                    <div className="p-4 bg-yellow-100 dark:bg-yellow-900/50 rounded-lg"><p className="text-2xl font-bold">{teacherRequests.filter(q=>q.status==='Pending').length}</p><p>Pending</p></div>
                    <div className="p-4 bg-green-100 dark:bg-green-900/50 rounded-lg"><p className="text-2xl font-bold">{teacherRequests.filter(q=>q.status==='Approved').length}</p><p>Approved</p></div>
                    <div className="p-4 bg-red-100 dark:bg-red-900/50 rounded-lg"><p className="text-2xl font-bold">{teacherRequests.filter(q=>q.status==='Rejected').length}</p><p>Rejected</p></div>
                </div>
            </SectionCard>
            <SectionCard title="Manage Teacher Queries">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 p-4 border-b border-border-primary">
                    <SearchInput id="query-search" label="Search queries" value={filters.search} onChange={v => setFilters(p => ({...p, search: v}))} placeholder="Search by teacher or request..." />
                    <FormField label="Filter by Status" htmlFor="status-filter">
                        <SelectInput id="status-filter" value={filters.status} onChange={e => setFilters(p => ({...p, status: e.target.value}))}>
                            <option value="all">All Statuses</option>
                            <option value="Pending">Pending</option>
                            <option value="Approved">Approved</option>
                            <option value="Rejected">Rejected</option>
                            <option value="Under Review">Under Review</option>
                        </SelectInput>
                    </FormField>
                    <FormField label="Filter by Priority" htmlFor="priority-filter">
                        <SelectInput id="priority-filter" value={filters.priority} onChange={e => setFilters(p => ({...p, priority: e.target.value}))}>
                            <option value="all">All Priorities</option>
                            <option value="Urgent">Urgent</option>
                            <option value="Normal">Normal</option>
                        </SelectInput>
                    </FormField>
                </div>
                 <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-bg-tertiary text-xs uppercase">
                            <tr>
                                <th className="p-3">Teacher</th>
                                <th className="p-3">Request</th>
                                <th className="p-3">Date</th>
                                <th className="p-3">Priority</th>
                                <th className="p-3">Status</th>
                                <th className="p-3">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredQueries.length > 0 ? filteredQueries.map(q => (
                                <tr key={q.id} className="border-b border-border-primary hover:bg-bg-primary">
                                    <td className="p-3 font-semibold">{facultyMap.get(q.facultyId) || 'Unknown'}</td>
                                    <td className="p-3 max-w-sm truncate" title={q.requestedChange}>{q.requestedChange}</td>
                                    <td className="p-3 whitespace-nowrap">{new Date(q.submittedDate).toLocaleDateString()}</td>
                                    <td className="p-3"><span className={q.priority === 'Urgent' ? 'font-bold text-red-500' : ''}>{q.priority}</span></td>
                                    <td className="p-3"><span className={`px-2 py-1 text-xs font-bold rounded-full ${statusStyles[q.status].chip}`}>{q.status}</span></td>
                                    <td className="p-3"><button onClick={() => setSelectedQuery(q)} className="font-semibold text-accent-primary hover:underline">View</button></td>
                                </tr>
                            )) : (
                                <tr><td colSpan={6} className="text-center p-8 text-text-secondary">No queries match the current filters.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </SectionCard>
        </div>
    );
};

export default QueryPage;