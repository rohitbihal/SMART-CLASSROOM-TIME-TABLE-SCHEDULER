import React, { useState, useMemo } from 'react';
import { SectionCard, Modal, FormField, SelectInput, SearchInput, TextInput } from '../../components/common';
import { QueryIcon, ClockIcon, CheckCircleIcon, XCircleIcon, InfoIcon, FilterIcon, SendIcon } from '../../components/Icons';
import { useAppContext } from '../../context/AppContext';
import { TeacherQuery, StudentQuery } from '../../types';

type TeacherStatus = TeacherQuery['status'];
type StudentStatus = StudentQuery['status'];


const teacherStatusStyles: Record<TeacherStatus, { icon: React.ReactNode, text: string, chip: string }> = {
    'Pending': { icon: <ClockIcon className="h-5 w-5 text-yellow-500" />, text: 'text-yellow-500', chip: 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-700 dark:text-yellow-300' },
    'Approved': { icon: <CheckCircleIcon className="h-5 w-5 text-green-500" />, text: 'text-green-500', chip: 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300' },
    'Rejected': { icon: <XCircleIcon className="h-5 w-5 text-red-500" />, text: 'text-red-500', chip: 'bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300' },
    'Under Review': { icon: <InfoIcon className="h-5 w-5 text-blue-500" />, text: 'text-blue-500', chip: 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300' },
};

const studentStatusStyles: Record<StudentStatus, { chip: string }> = {
    'Pending': { chip: 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-700 dark:text-yellow-300' },
    'Resolved': { chip: 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300' },
    'Closed': { chip: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300' },
}

const QueryChat = ({ author, initialMessages }: { author: string, initialMessages: {author: string, text: string}[] }) => {
    const [messages, setMessages] = useState(initialMessages);
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


const TeacherQueryDetailModal = ({ query, facultyName, isOpen, onClose, onStatusChange }: { query: TeacherQuery; facultyName: string; isOpen: boolean; onClose: () => void; onStatusChange: (id: string, status: TeacherStatus, response: string) => void; }) => {
    const [adminResponse, setAdminResponse] = useState('');
    if (!isOpen) return null;

    const handleStatusUpdate = (status: TeacherStatus) => {
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
                <QueryChat author={facultyName} initialMessages={[{author: facultyName, text: query.reason}, {author: 'Admin', text: 'Acknowledged. Looking into this.'}]} />
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

const StudentQueryDetailModal = ({ query, studentName, isOpen, onClose, onStatusChange }: { query: StudentQuery; studentName: string; isOpen: boolean; onClose: () => void; onStatusChange: (id: string, status: StudentStatus, response: string) => void; }) => {
    const [adminResponse, setAdminResponse] = useState(query.adminResponse || '');
    if (!isOpen) return null;

    const handleStatusUpdate = (status: StudentStatus) => {
        onStatusChange(query.id, status, adminResponse);
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Query from ${studentName}`} size="3xl">
            <div className="space-y-4">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div><strong>Date:</strong> {new Date(query.submittedDate).toLocaleString()}</div>
                    <div><strong>Type:</strong> {query.queryType}</div>
                </div>
                <div className="p-3 bg-bg-primary rounded-md">
                    <p className="font-semibold">Query Details</p>
                    <p>{query.details}</p>
                </div>
                <QueryChat author={studentName} initialMessages={[{author: studentName, text: query.details}]} />
                <FormField label="Admin Response / Comments" htmlFor="admin-response-student">
                    <textarea id="admin-response-student" value={adminResponse} onChange={e => setAdminResponse(e.target.value)} rows={4} className="input-base" placeholder="Add your comments here..."></textarea>
                </FormField>
                <div className="flex justify-end gap-2 pt-4 border-t border-border-primary">
                    <button onClick={() => handleStatusUpdate('Pending')} className="btn-secondary">Mark as Pending</button>
                    <button onClick={() => handleStatusUpdate('Closed')} className="btn-danger">Close</button>
                    <button onClick={() => handleStatusUpdate('Resolved')} className="btn-primary">Mark as Resolved</button>
                </div>
            </div>
        </Modal>
    );
};


const QueryPage = () => {
    const { teacherRequests, studentQueries, faculty, students } = useAppContext();
    const [activeTab, setActiveTab] = useState('teacher');

    const [selectedTeacherQuery, setSelectedTeacherQuery] = useState<TeacherQuery | null>(null);
    const [selectedStudentQuery, setSelectedStudentQuery] = useState<StudentQuery | null>(null);

    const [filters, setFilters] = useState({ search: '', status: 'all', priority: 'all' });
    
    // Reset filters when tab changes
    const handleTabChange = (tab: string) => {
        setActiveTab(tab);
        setFilters({ search: '', status: 'all', priority: 'all' });
    }

    const facultyMap = useMemo(() => new Map(faculty.map(f => [f.id, f.name])), [faculty]);
    const studentMap = useMemo(() => new Map(students.map(s => [s.id, s.name])), [students]);

    const filteredTeacherQueries = useMemo(() => {
        return teacherRequests
            .filter(q => filters.status === 'all' || q.status === filters.status)
            .filter(q => filters.priority === 'all' || q.priority === filters.priority)
            .filter(q => {
                const facultyName = facultyMap.get(q.facultyId) || '';
                return facultyName.toLowerCase().includes(filters.search.toLowerCase()) || q.requestedChange.toLowerCase().includes(filters.search.toLowerCase());
            })
            .sort((a, b) => new Date(b.submittedDate).getTime() - new Date(a.submittedDate).getTime());
    }, [teacherRequests, filters, facultyMap]);
    
    const filteredStudentQueries = useMemo(() => {
         return (studentQueries || [])
            .filter(q => filters.status === 'all' || q.status === filters.status)
            .filter(q => {
                const studentName = studentMap.get(q.studentId) || '';
                return studentName.toLowerCase().includes(filters.search.toLowerCase()) || q.details.toLowerCase().includes(filters.search.toLowerCase());
            })
            .sort((a, b) => new Date(b.submittedDate).getTime() - new Date(a.submittedDate).getTime());
    }, [studentQueries, filters, studentMap]);

    
    const handleTeacherStatusChange = (id: string, status: TeacherStatus, response: string) => {
        console.log(`Updating teacher query ${id} to status ${status} with response: "${response}"`);
        alert(`Teacher Query status updated to ${status}. (This is a mock action)`);
    };

    const handleStudentStatusChange = (id: string, status: StudentStatus, response: string) => {
        console.log(`Updating student query ${id} to status ${status} with response: "${response}"`);
        alert(`Student Query status updated to ${status}. (This is a mock action)`);
    };

    const teacherQueryStats = useMemo(() => ({
        total: teacherRequests.length,
        pending: teacherRequests.filter(q=>q.status==='Pending').length,
        approved: teacherRequests.filter(q=>q.status==='Approved').length,
        rejected: teacherRequests.filter(q=>q.status==='Rejected').length
    }), [teacherRequests]);

    const studentQueryStats = useMemo(() => ({
        total: studentQueries.length,
        pending: studentQueries.filter(q=>q.status==='Pending').length,
        resolved: studentQueries.filter(q=>q.status==='Resolved').length,
        closed: studentQueries.filter(q=>q.status==='Closed').length
    }), [studentQueries]);

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold">Query Management</h1>
            <TeacherQueryDetailModal 
                isOpen={!!selectedTeacherQuery}
                onClose={() => setSelectedTeacherQuery(null)}
                query={selectedTeacherQuery!}
                facultyName={facultyMap.get(selectedTeacherQuery?.facultyId || '') || 'Unknown'}
                onStatusChange={handleTeacherStatusChange}
            />
             <StudentQueryDetailModal 
                isOpen={!!selectedStudentQuery}
                onClose={() => setSelectedStudentQuery(null)}
                query={selectedStudentQuery!}
                studentName={studentMap.get(selectedStudentQuery?.studentId || '') || 'Unknown'}
                onStatusChange={handleStudentStatusChange}
            />
            <SectionCard title="Query Dashboard">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-center">
                    <div className="p-4 bg-blue-100 dark:bg-blue-900/50 rounded-lg"><p className="text-2xl font-bold">{teacherQueryStats.total + studentQueryStats.total}</p><p>Total Queries</p></div>
                    <div className="p-4 bg-yellow-100 dark:bg-yellow-900/50 rounded-lg"><p className="text-2xl font-bold">{teacherQueryStats.pending + studentQueryStats.pending}</p><p>Pending</p></div>
                    <div className="p-4 bg-green-100 dark:bg-green-900/50 rounded-lg"><p className="text-2xl font-bold">{teacherQueryStats.approved + studentQueryStats.resolved}</p><p>Approved/Resolved</p></div>
                    <div className="p-4 bg-red-100 dark:bg-red-900/50 rounded-lg"><p className="text-2xl font-bold">{teacherQueryStats.rejected + studentQueryStats.closed}</p><p>Rejected/Closed</p></div>
                </div>
            </SectionCard>
            <div className="bg-white dark:bg-slate-800 border dark:border-slate-700 p-2 rounded-xl flex flex-wrap gap-2">
                <button onClick={() => handleTabChange('teacher')} className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-md transition-colors ${activeTab === 'teacher' ? 'bg-indigo-600 text-white' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-700'}`}>Teacher Queries</button>
                <button onClick={() => handleTabChange('student')} className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-md transition-colors ${activeTab === 'student' ? 'bg-indigo-600 text-white' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-700'}`}>Student Queries</button>
            </div>
            {activeTab === 'teacher' ? (
                <SectionCard title="Manage Teacher Queries">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 p-4 border-b border-border-primary">
                        <SearchInput id="query-search" label="Search queries" value={filters.search} onChange={v => setFilters(p => ({...p, search: v}))} placeholder="Search by teacher or request..." />
                        {/* FIX: Add explicit type annotation to onChange event handler. */}
                        <FormField label="Filter by Status" htmlFor="status-filter"><SelectInput id="status-filter" value={filters.status} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFilters(p => ({...p, status: e.target.value}))}>
                            <option value="all">All Statuses</option><option value="Pending">Pending</option><option value="Approved">Approved</option><option value="Rejected">Rejected</option><option value="Under Review">Under Review</option>
                        </SelectInput></FormField>
                        {/* FIX: Add explicit type annotation to onChange event handler. */}
                        <FormField label="Filter by Priority" htmlFor="priority-filter"><SelectInput id="priority-filter" value={filters.priority} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFilters(p => ({...p, priority: e.target.value}))}>
                            <option value="all">All Priorities</option><option value="Urgent">Urgent</option><option value="Normal">Normal</option>
                        </SelectInput></FormField>
                    </div>
                     <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left"><thead className="bg-bg-tertiary text-xs uppercase"><tr><th className="p-3">Teacher</th><th className="p-3">Request</th><th className="p-3">Date</th><th className="p-3">Priority</th><th className="p-3">Status</th><th className="p-3">Actions</th></tr></thead>
                            <tbody>
                                {filteredTeacherQueries.length > 0 ? filteredTeacherQueries.map(q => (
                                    <tr key={q.id} className="border-b border-border-primary hover:bg-bg-primary">
                                        <td className="p-3 font-semibold">{facultyMap.get(q.facultyId) || 'Unknown'}</td><td className="p-3 max-w-sm truncate" title={q.requestedChange}>{q.requestedChange}</td>
                                        <td className="p-3 whitespace-nowrap">{new Date(q.submittedDate).toLocaleDateString()}</td><td className="p-3"><span className={q.priority === 'Urgent' ? 'font-bold text-red-500' : ''}>{q.priority}</span></td>
                                        <td className="p-3"><span className={`px-2 py-1 text-xs font-bold rounded-full ${teacherStatusStyles[q.status].chip}`}>{q.status}</span></td>
                                        <td className="p-3"><button onClick={() => setSelectedTeacherQuery(q)} className="font-semibold text-accent-primary hover:underline">View</button></td>
                                    </tr>)) : (<tr><td colSpan={6} className="text-center p-8 text-text-secondary">No queries match the current filters.</td></tr>)}
                            </tbody>
                        </table>
                    </div>
                </SectionCard>
            ) : (
                 <SectionCard title="Manage Student Queries">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 p-4 border-b border-border-primary">
                        <SearchInput id="query-search-student" label="Search queries" value={filters.search} onChange={v => setFilters(p => ({...p, search: v}))} placeholder="Search by student or query..." />
                        {/* FIX: Add explicit type annotation to onChange event handler. */}
                        <FormField label="Filter by Status" htmlFor="status-filter-student"><SelectInput id="status-filter-student" value={filters.status} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFilters(p => ({...p, status: e.target.value}))}>
                            <option value="all">All Statuses</option><option value="Pending">Pending</option><option value="Resolved">Resolved</option><option value="Closed">Closed</option>
                        </SelectInput></FormField>
                    </div>
                     <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left"><thead className="bg-bg-tertiary text-xs uppercase"><tr><th className="p-3">Student</th><th className="p-3">Query</th><th className="p-3">Date</th><th className="p-3">Status</th><th className="p-3">Actions</th></tr></thead>
                            <tbody>
                                {filteredStudentQueries.length > 0 ? filteredStudentQueries.map(q => (
                                    <tr key={q.id} className="border-b border-border-primary hover:bg-bg-primary">
                                        <td className="p-3 font-semibold">{studentMap.get(q.studentId) || 'Unknown'}</td><td className="p-3 max-w-sm truncate" title={q.details}>{q.details}</td>
                                        <td className="p-3 whitespace-nowrap">{new Date(q.submittedDate).toLocaleDateString()}</td>
                                        <td className="p-3"><span className={`px-2 py-1 text-xs font-bold rounded-full ${studentStatusStyles[q.status].chip}`}>{q.status}</span></td>
                                        <td className="p-3"><button onClick={() => setSelectedStudentQuery(q)} className="font-semibold text-accent-primary hover:underline">View</button></td>
                                    </tr>)) : (<tr><td colSpan={5} className="text-center p-8 text-text-secondary">No queries match the current filters.</td></tr>)}
                            </tbody>
                        </table>
                    </div>
                </SectionCard>
            )}
        </div>
    );
};

export default QueryPage;