

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { AddIcon, ConstraintsIcon, DeleteIcon, DownloadIcon, EditIcon, GenerateIcon, LoadingIcon, SaveIcon, SetupIcon, ViewIcon, AvailabilityIcon, AnalyticsIcon, UploadIcon } from '../../components/Icons';
import { SectionCard, Modal, FormField, TextInput, SelectInput, SearchInput, ErrorDisplay } from '../../App';
import { PlaceholderContent } from '../dashboard/PlaceholderContent';
import { DAYS, TIME_SLOTS } from '../../constants';
import { generateTimetable } from '../../services/geminiService';
import { Class, Constraints, Faculty, Room, Subject, TimetableEntry, Student, TimePreferences, FacultyPreference, InstitutionDetails } from '../../types';

type EntityType = 'class' | 'faculty' | 'subject' | 'room';
type Entity = Class | Faculty | Subject | Room;

interface TimetableSchedulerProps {
    classes: Class[];
    faculty: Faculty[];
    subjects: Subject[];
    rooms: Room[];
    students: Student[];
    constraints: Constraints | null;
    setConstraints: (c: Constraints) => void;
    onSaveEntity: (type: EntityType | 'student', data: any) => Promise<void>;
    onDeleteEntity: (type: EntityType | 'student', id: string) => Promise<void>;
    onResetData: () => Promise<void>;
    token: string;
    onSaveTimetable: (timetable: TimetableEntry[]) => Promise<void>;
}

const DataTable = <T extends { id: string }>({ headers, data, renderRow, emptyMessage = "No data available.", headerPrefix = null }: { headers: string[]; data: T[]; renderRow: (item: T) => React.ReactNode; emptyMessage?: string; headerPrefix?: React.ReactNode; }) => (
    <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
            <thead className="bg-gray-100 dark:bg-slate-900/50 text-gray-500 uppercase text-xs">
                <tr>
                    {headerPrefix}
                    {headers.map(h => <th key={h} className="px-6 py-3">{h}</th>)}
                </tr>
            </thead>
            <tbody className="text-gray-700 dark:text-gray-300">
                {data.length > 0 ? data.map(renderRow) : (
                    <tr>
                        <td colSpan={headers.length + (headerPrefix ? 1 : 0)} className="text-center p-8 text-gray-500">{emptyMessage}</td>
                    </tr>
                )}
            </tbody>
        </table>
    </div>
);
const ClassForm = ({ initialData, onSave }: { initialData: Class | null; onSave: (data: any) => Promise<void>; }) => {
    const [data, setData] = useState(initialData || { id: '', name: '', branch: '', year: 1, section: '', studentCount: 0 });
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => setData({ ...data, [e.target.name]: e.target.type === 'number' ? parseInt(e.target.value, 10) : e.target.value });
    const formId = initialData?.id || 'new-class';
    return (
        <form onSubmit={(e) => { e.preventDefault(); onSave(data); }}>
            <FormField label="Name" htmlFor={`${formId}-name`}><TextInput id={`${formId}-name`} name="name" value={data.name} onChange={handleChange} required /></FormField>
            <FormField label="Branch" htmlFor={`${formId}-branch`}><TextInput id={`${formId}-branch`} name="branch" value={data.branch} onChange={handleChange} required /></FormField>
            <FormField label="Year" htmlFor={`${formId}-year`}><TextInput type="number" id={`${formId}-year`} name="year" value={data.year} onChange={handleChange} required min={1} /></FormField>
            <FormField label="Section" htmlFor={`${formId}-section`}><TextInput id={`${formId}-section`} name="section" value={data.section} onChange={handleChange} required /></FormField>
            <FormField label="Student Count" htmlFor={`${formId}-studentCount`}><TextInput type="number" id={`${formId}-studentCount`} name="studentCount" value={data.studentCount} onChange={handleChange} required min={1} /></FormField>
            <button type="submit" className="w-full mt-4 bg-indigo-600 text-white font-bold py-2 px-4 rounded-lg flex items-center justify-center gap-2"><SaveIcon />Save</button>
        </form>
    );
};
const FacultyForm = ({ initialData, onSave }: { initialData: Faculty | null; onSave: (data: any) => Promise<void>; }) => {
    const [data, setData] = useState(initialData ? { ...initialData, specialization: initialData.specialization.join(', '), email: initialData.email || '' } : { id: '', name: '', department: '', specialization: '', email: '' });
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => setData({ ...data, [e.target.name]: e.target.value });
    const handleSave = (e: React.FormEvent) => { e.preventDefault(); onSave({ ...data, specialization: data.specialization.split(',').map(s => s.trim()).filter(Boolean) }); };
    const formId = initialData?.id || 'new-faculty';
    return (
        <form onSubmit={handleSave}>
            <FormField label="Name" htmlFor={`${formId}-name`}><TextInput id={`${formId}-name`} name="name" value={data.name} onChange={handleChange} required /></FormField>
            <FormField label="Email" htmlFor={`${formId}-email`}><TextInput type="email" id={`${formId}-email`} name="email" value={data.email} onChange={handleChange} required /></FormField>
            <FormField label="Department" htmlFor={`${formId}-department`}><TextInput id={`${formId}-department`} name="department" value={data.department} onChange={handleChange} required /></FormField>
            <FormField label="Specializations (comma-separated)" htmlFor={`${formId}-specialization`}><TextInput id={`${formId}-specialization`} name="specialization" value={data.specialization} onChange={handleChange} /></FormField>
            <button type="submit" className="w-full mt-4 bg-indigo-600 text-white font-bold py-2 px-4 rounded-lg flex items-center justify-center gap-2"><SaveIcon />Save</button>
        </form>
    );
};
const SubjectForm = ({ initialData, onSave, faculty }: { initialData: Subject | null; onSave: (data: any) => Promise<void>; faculty: Faculty[]; }) => {
    const [data, setData] = useState(initialData || { id: '', name: '', code: '', department: '', type: 'theory', hoursPerWeek: 3, assignedFacultyId: '' });
    const departments = useMemo(() => [...new Set(faculty.map(f => f.department))], [faculty]);
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setData({ ...data, [e.target.name]: e.target.type === 'number' ? parseInt(e.target.value, 10) : e.target.value });
    const formId = initialData?.id || 'new-subject';
    return (
        <form onSubmit={(e) => { e.preventDefault(); onSave(data); }}>
            <FormField label="Name" htmlFor={`${formId}-name`}><TextInput id={`${formId}-name`} name="name" value={data.name} onChange={handleChange} required /></FormField>
            <FormField label="Code" htmlFor={`${formId}-code`}><TextInput id={`${formId}-code`} name="code" value={data.code} onChange={handleChange} required /></FormField>
            <FormField label="Department" htmlFor={`${formId}-department`}>
                <SelectInput id={`${formId}-department`} name="department" value={data.department} onChange={handleChange} required>
                    <option value="" disabled>Select Department...</option>
                    {departments.map(dep => <option key={dep} value={dep}>{dep}</option>)}
                </SelectInput>
            </FormField>
            <FormField label="Type" htmlFor={`${formId}-type`}>
                <SelectInput id={`${formId}-type`} name="type" value={data.type} onChange={handleChange}>
                    <option value="theory">Theory</option>
                    <option value="lab">Lab</option>
                </SelectInput>
            </FormField>
            <FormField label="Hours/Week" htmlFor={`${formId}-hoursPerWeek`}><TextInput type="number" id={`${formId}-hoursPerWeek`} name="hoursPerWeek" value={data.hoursPerWeek} onChange={handleChange} required min={1} /></FormField>
            <FormField label="Assigned Faculty" htmlFor={`${formId}-assignedFacultyId`}>
                <SelectInput id={`${formId}-assignedFacultyId`} name="assignedFacultyId" value={data.assignedFacultyId} onChange={handleChange} required>
                    <option value="" disabled>Select...</option>
                    {faculty.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                </SelectInput>
            </FormField>
            <button type="submit" className="w-full mt-4 bg-indigo-600 text-white font-bold py-2 px-4 rounded-lg flex items-center justify-center gap-2"><SaveIcon />Save</button>
        </form>
    );
};
const RoomForm = ({ initialData, onSave }: { initialData: Room | null; onSave: (data: any) => Promise<void>; }) => {
    const [data, setData] = useState(initialData || { id: '', number: '', type: 'classroom', capacity: 0 });
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setData({ ...data, [e.target.name]: e.target.type === 'number' ? parseInt(e.target.value, 10) : e.target.value });
    const formId = initialData?.id || 'new-room';
    return (
        <form onSubmit={(e) => { e.preventDefault(); onSave(data); }}>
            <FormField label="Number" htmlFor={`${formId}-number`}><TextInput id={`${formId}-number`} name="number" value={data.number} onChange={handleChange} required /></FormField>
            <FormField label="Type" htmlFor={`${formId}-type`}>
                <SelectInput id={`${formId}-type`} name="type" value={data.type} onChange={handleChange}>
                    <option value="classroom">Classroom</option>
                    <option value="lab">Lab</option>
                </SelectInput>
            </FormField>
            <FormField label="Capacity" htmlFor={`${formId}-capacity`}><TextInput type="number" id={`${formId}-capacity`} name="capacity" value={data.capacity} onChange={handleChange} required min={1} /></FormField>
            <button type="submit" className="w-full mt-4 bg-indigo-600 text-white font-bold py-2 px-4 rounded-lg flex items-center justify-center gap-2"><SaveIcon />Save</button>
        </form>
    );
};
const HeaderCheckbox = <T extends { id: string }>({ type, items, selectedItems, onToggleSelectAll }: { type: EntityType; items: T[]; selectedItems: { [key in EntityType]: string[] }; onToggleSelectAll: (type: EntityType, items: T[]) => void; }) => {
    const checkboxRef = useRef<HTMLInputElement>(null);
    const visibleIds = useMemo(() => items.map(item => item.id), [items]);
    const selectedVisibleIds = useMemo(() => visibleIds.filter(id => (selectedItems[type] || []).includes(id)), [visibleIds, selectedItems, type]);
    const isAllSelected = visibleIds.length > 0 && selectedVisibleIds.length === visibleIds.length;
    const isSomeSelected = selectedVisibleIds.length > 0 && selectedVisibleIds.length < visibleIds.length;
    useEffect(() => { if (checkboxRef.current) { checkboxRef.current.indeterminate = isSomeSelected; } }, [isSomeSelected]);
    return (
        <th className="px-4 py-3">
            <input type="checkbox" ref={checkboxRef} className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" checked={isAllSelected} onChange={() => onToggleSelectAll(type, items)} />
        </th>
    );
};

const ImportModal = ({ isOpen, onClose, entityType }: { isOpen: boolean; onClose: () => void; entityType: string; }) => {
    if (!isOpen) return null;
    const capitalEntityType = entityType.charAt(0).toUpperCase() + entityType.slice(1);
    
    const formats: { [key: string]: string } = {
        class: "Required columns: name, branch, year, section, studentCount",
        faculty: "Required columns: name, department, specialization (comma-separated), email",
        subject: "Required columns: name, code, department, type (theory/lab), hoursPerWeek, assignedFacultyId",
        room: "Required columns: number, type (classroom/lab), capacity"
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={`Import ${capitalEntityType} Data`}
        >
            <div className="space-y-4">
                <p className="text-sm text-gray-500 dark:text-gray-400">Upload a CSV or Excel file to bulk-add data. Make sure your file follows the specified format.</p>
                <div className="p-3 bg-gray-100 dark:bg-slate-700/50 rounded-md">
                    <p className="text-sm font-semibold">File Format:</p>
                    <p className="text-xs font-mono mt-1 text-gray-600 dark:text-gray-300">{formats[entityType] || "No format specified."}</p>
                </div>
                <div>
                    <label htmlFor="file-upload" className="block text-sm font-medium mb-1">Upload File</label>
                    <input
                        id="file-upload"
                        name="file-upload"
                        type="file"
                        accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                        className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 dark:file:bg-indigo-900/50 file:text-indigo-700 dark:file:text-indigo-300 hover:file:bg-indigo-100 dark:hover:file:bg-indigo-800/50"
                    />
                </div>
                 <p className="text-xs text-center text-gray-400">PDF import support is coming soon.</p>
                <div className="flex justify-end pt-4">
                     <button type="button" onClick={() => { alert('File processing is a placeholder and not yet implemented.'); onClose(); }} className="bg-indigo-600 text-white font-bold py-2 px-4 rounded-lg flex items-center justify-center gap-2">Process File</button>
                </div>
            </div>
        </Modal>
    );
};

const SetupTab = ({ classes, faculty, subjects, rooms, constraints, onUpdateConstraints, openModal, handleDelete, handleResetData, selectedItems, onToggleSelect, onToggleSelectAll, onInitiateBulkDelete, pageError, openImportModal }: { classes: Class[]; faculty: Faculty[]; subjects: Subject[]; rooms: Room[]; constraints: Constraints | null; onUpdateConstraints: (c: Constraints) => void; openModal: (mode: 'add' | 'edit', type: EntityType, data?: Entity | null) => void; handleDelete: (type: EntityType, id: string) => Promise<void>; handleResetData: () => Promise<void>; selectedItems: { [key in EntityType]: string[] }; onToggleSelect: (type: EntityType, id: string) => void; onToggleSelectAll: (type: EntityType, displayedItems: any[]) => void; onInitiateBulkDelete: (type: EntityType) => void; pageError: string | null; openImportModal: (type: EntityType) => void; }) => {
    const [search, setSearch] = useState({ class: '', faculty: '', subject: '', room: '' });

    const handleInstituteFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        if (!constraints) return;
        const { name, value } = e.target;
        const newDetails = { ...(constraints.institutionDetails || {}), [name]: value };
        onUpdateConstraints({ ...constraints, institutionDetails: newDetails as InstitutionDetails });
    };

    const handleSearch = (type: EntityType, value: string) => setSearch(prev => ({ ...prev, [type]: value }));
    const filter = <T extends object>(data: T[], query: string) => data.filter(item => Object.values(item).some(val => String(val).toLowerCase().includes(query.toLowerCase())));
    const filtered = { class: filter(classes, search.class), faculty: filter(faculty, search.faculty), subject: filter(subjects, search.subject), room: filter(rooms, search.room) };
    const facultyMap = useMemo(() => Object.fromEntries(faculty.map(f => [f.id, f.name])), [faculty]);
    
    const details: Partial<InstitutionDetails> = constraints?.institutionDetails || {};

    return (
        <>
            <ErrorDisplay message={pageError} />
            <SectionCard title="Institution Details">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
                    <FormField label="Institution Name" htmlFor="inst-name">
                        <TextInput id="inst-name" name="name" placeholder="Enter college/university name" value={details.name || ''} onChange={handleInstituteFormChange} />
                    </FormField>
                    <FormField label="Academic Year" htmlFor="inst-acad-year">
                        <TextInput id="inst-acad-year" name="academicYear" placeholder="e.g., 2024-2025" value={details.academicYear || ''} onChange={handleInstituteFormChange} />
                    </FormField>
                    <FormField label="Semester" htmlFor="inst-semester">
                        <SelectInput id="inst-semester" name="semester" value={details.semester || 'Odd'} onChange={handleInstituteFormChange}>
                            <option value="Odd">Odd Semester (Aug-Dec)</option>
                            <option value="Even">Even Semester (Jan-May)</option>
                        </SelectInput>
                    </FormField>
                    <FormField label="Academic Session" htmlFor="inst-session">
                        <SelectInput id="inst-session" name="session" value={details.session || 'Regular'} onChange={handleInstituteFormChange}>
                            <option value="Regular">Regular</option>
                            <option value="Summer School">Summer School</option>
                            <option value="Winter School">Winter School</option>
                        </SelectInput>
                    </FormField>
                </div>
                 <p className="text-xs text-right text-gray-400 mt-2">Changes are saved automatically.</p>
            </SectionCard>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <SectionCard title="Classes & Sections" actions={<div className="flex items-center gap-2"><button onClick={() => openImportModal('class')} className="flex items-center gap-1 text-sm bg-gray-100 dark:bg-slate-700/50 text-gray-700 dark:text-gray-300 font-semibold px-3 py-1.5 rounded-md"><UploadIcon />Import</button><button onClick={() => openModal('add', 'class')} className="flex items-center gap-1 text-sm bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-300 font-semibold px-3 py-1.5 rounded-md"><AddIcon />Add Class</button></div>}>
                    <SearchInput value={search.class} onChange={v => handleSearch('class', v)} placeholder="Search classes..." label="Search Classes" id="search-class" />
                    <DataTable headers={["Name", "Branch", "Year", "Section", "Students", "Actions"]} data={filtered.class} renderRow={(c: Class) => (
                        <tr key={c.id} className="border-b dark:border-slate-700">
                            <td className="px-4 py-3"><input type="checkbox" className="h-4 w-4" checked={selectedItems.class.includes(c.id)} onChange={() => onToggleSelect('class', c.id)} /></td>
                            <td className="px-6 py-3 font-medium">{c.name}</td>
                            <td className="px-6 py-3">{c.branch}</td>
                            <td className="px-6 py-3">{c.year}</td>
                            <td className="px-6 py-3">{c.section}</td>
                            <td className="px-6 py-3">{c.studentCount}</td>
                            <td className="px-6 py-3 flex gap-2"><button onClick={() => openModal('edit', 'class', c)}><EditIcon /></button><button onClick={() => handleDelete('class', c.id)}><DeleteIcon /></button></td>
                        </tr>
                    )} headerPrefix={<HeaderCheckbox type="class" items={filtered.class} selectedItems={selectedItems} onToggleSelectAll={onToggleSelectAll} />} />
                </SectionCard>
                <SectionCard title="Faculty" actions={<div className="flex items-center gap-2"><button onClick={() => openImportModal('faculty')} className="flex items-center gap-1 text-sm bg-gray-100 dark:bg-slate-700/50 text-gray-700 dark:text-gray-300 font-semibold px-3 py-1.5 rounded-md"><UploadIcon />Import</button><button onClick={() => openModal('add', 'faculty')} className="flex items-center gap-1 text-sm bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-300 font-semibold px-3 py-1.5 rounded-md"><AddIcon />Add Faculty</button></div>}>
                    <SearchInput value={search.faculty} onChange={v => handleSearch('faculty', v)} placeholder="Search faculty..." label="Search Faculty" id="search-faculty" />
                    <DataTable headers={["Name", "Department", "Specialization", "Actions"]} data={filtered.faculty} renderRow={(f: Faculty) => (
                        <tr key={f.id} className="border-b dark:border-slate-700">
                            <td className="px-4 py-3"><input type="checkbox" className="h-4 w-4" checked={selectedItems.faculty.includes(f.id)} onChange={() => onToggleSelect('faculty', f.id)} /></td>
                            <td className="px-6 py-3 font-medium">{f.name}</td>
                            <td className="px-6 py-3">{f.department}</td>
                            <td className="px-6 py-3">{f.specialization.join(', ')}</td>
                            <td className="px-6 py-3 flex gap-2"><button onClick={() => openModal('edit', 'faculty', f)}><EditIcon /></button><button onClick={() => handleDelete('faculty', f.id)}><DeleteIcon /></button></td>
                        </tr>
                    )} headerPrefix={<HeaderCheckbox type="faculty" items={filtered.faculty} selectedItems={selectedItems} onToggleSelectAll={onToggleSelectAll} />} />
                </SectionCard>
                <SectionCard title="Subjects" actions={<div className="flex items-center gap-2"><button onClick={() => openImportModal('subject')} className="flex items-center gap-1 text-sm bg-gray-100 dark:bg-slate-700/50 text-gray-700 dark:text-gray-300 font-semibold px-3 py-1.5 rounded-md"><UploadIcon />Import</button><button onClick={() => openModal('add', 'subject')} className="flex items-center gap-1 text-sm bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-300 font-semibold px-3 py-1.5 rounded-md"><AddIcon />Add Subject</button></div>}>
                    <SearchInput value={search.subject} onChange={v => handleSearch('subject', v)} placeholder="Search subjects..." label="Search Subjects" id="search-subject" />
                    <DataTable headers={["Name", "Code", "Department", "Type", "Hrs/Week", "Faculty", "Actions"]} data={filtered.subject} renderRow={(s: Subject) => (
                        <tr key={s.id} className="border-b dark:border-slate-700">
                            <td className="px-4 py-3"><input type="checkbox" className="h-4 w-4" checked={selectedItems.subject.includes(s.id)} onChange={() => onToggleSelect('subject', s.id)} /></td>
                            <td className="px-6 py-3 font-medium">{s.name}</td>
                            <td className="px-6 py-3">{s.code}</td>
                            <td className="px-6 py-3">{s.department}</td>
                            <td className="px-6 py-3">{s.type}</td>
                            <td className="px-6 py-3">{s.hoursPerWeek}</td>
                            <td className="px-6 py-3">{facultyMap[s.assignedFacultyId] || 'N/A'}</td>
                            <td className="px-6 py-3 flex gap-2"><button onClick={() => openModal('edit', 'subject', s)}><EditIcon /></button><button onClick={() => handleDelete('subject', s.id)}><DeleteIcon /></button></td>
                        </tr>
                    )} headerPrefix={<HeaderCheckbox type="subject" items={filtered.subject} selectedItems={selectedItems} onToggleSelectAll={onToggleSelectAll} />} />
                </SectionCard>
                <SectionCard title="Rooms" actions={<div className="flex items-center gap-2"><button onClick={() => openImportModal('room')} className="flex items-center gap-1 text-sm bg-gray-100 dark:bg-slate-700/50 text-gray-700 dark:text-gray-300 font-semibold px-3 py-1.5 rounded-md"><UploadIcon />Import</button><button onClick={() => openModal('add', 'room')} className="flex items-center gap-1 text-sm bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-300 font-semibold px-3 py-1.5 rounded-md"><AddIcon />Add Room</button></div>}>
                    <SearchInput value={search.room} onChange={v => handleSearch('room', v)} placeholder="Search rooms..." label="Search Rooms" id="search-room" />
                    <DataTable headers={["Number", "Type", "Capacity", "Actions"]} data={filtered.room} renderRow={(r: Room) => (
                        <tr key={r.id} className="border-b dark:border-slate-700">
                            <td className="px-4 py-3"><input type="checkbox" className="h-4 w-4" checked={selectedItems.room.includes(r.id)} onChange={() => onToggleSelect('room', r.id)} /></td>
                            <td className="px-6 py-3 font-medium">{r.number}</td>
                            <td className="px-6 py-3">{r.type}</td>
                            <td className="px-6 py-3">{r.capacity}</td>
                            <td className="px-6 py-3 flex gap-2"><button onClick={() => openModal('edit', 'room', r)}><EditIcon /></button><button onClick={() => handleDelete('room', r.id)}><DeleteIcon /></button></td>
                        </tr>
                    )} headerPrefix={<HeaderCheckbox type="room" items={filtered.room} selectedItems={selectedItems} onToggleSelectAll={onToggleSelectAll} />} />
                </SectionCard>
            </div>
        </>
    );
};

const TimePreferencesVisual = ({ prefs, onChange }: { prefs: TimePreferences, onChange: (newPrefs: TimePreferences) => void; }) => {
    const handleDayToggle = (day: string) => {
        const newWorkingDays = prefs.workingDays.includes(day)
            ? prefs.workingDays.filter(d => d !== day)
            : [...prefs.workingDays, day].sort((a, b) => DAYS.indexOf(a) - DAYS.indexOf(b));
        onChange({ ...prefs, workingDays: newWorkingDays });
    };
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, type } = e.target;
        onChange({ ...prefs, [name]: type === 'number' ? parseInt(value, 10) || 0 : value });
    };

    const timeToMinutes = (timeStr: string) => { const [h, m] = timeStr.split(':').map(Number); return h * 60 + m; };
    const TIMELINE_START_MINS = 7 * 60; // 7 AM
    const TIMELINE_END_MINS = 21 * 60; // 9 PM
    const TIMELINE_DURATION_MINS = TIMELINE_END_MINS - TIMELINE_START_MINS;
    
    const timeToPercent = (timeStr: string) => {
        const minutes = timeToMinutes(timeStr);
        const pos = ((minutes - TIMELINE_START_MINS) / TIMELINE_DURATION_MINS) * 100;
        return Math.max(0, Math.min(100, pos));
    };
    const durationToPercent = (duration: number) => (duration / TIMELINE_DURATION_MINS) * 100;

    const workingHoursLeft = timeToPercent(prefs.startTime);
    const workingHoursWidth = timeToPercent(prefs.endTime) - workingHoursLeft;
    const lunchLeft = timeToPercent(prefs.lunchStartTime);
    const lunchWidth = durationToPercent(prefs.lunchDurationMinutes);

    return (
        <SectionCard title="Institutional Time Preferences">
            <div className="space-y-6">
                <div>
                    <h4 className="font-semibold mb-3 text-gray-700 dark:text-gray-300">Working Days</h4>
                    <div className="flex flex-wrap gap-2">
                        {DAYS.map(day => (
                            <button
                                key={day}
                                onClick={() => handleDayToggle(day)}
                                className={`px-4 py-2 text-sm font-bold rounded-full transition-colors capitalize ${prefs.workingDays.includes(day) ? 'bg-indigo-600 text-white' : 'bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-slate-600'}`}
                            >
                                {day.substring(0, 3)}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="border-t border-gray-200 dark:border-slate-700 pt-6">
                    <h4 className="font-semibold mb-4 text-gray-700 dark:text-gray-300">Academic Day Schedule</h4>
                    <div className="relative h-8 bg-gray-200 dark:bg-slate-700 rounded-lg my-2">
                        <div className="absolute h-full bg-indigo-400 dark:bg-indigo-600 rounded-lg" style={{ left: `${workingHoursLeft}%`, width: `${workingHoursWidth}%` }}></div>
                        <div className="absolute h-full bg-amber-400 dark:bg-amber-500 border-x-2 border-white/50 dark:border-slate-900/50" style={{ left: `${lunchLeft}%`, width: `${lunchWidth}%` }}></div>
                    </div>
                    <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 px-1 mb-6">
                        <span>7 AM</span><span>10 AM</span><span>1 PM</span><span>4 PM</span><span>7 PM</span><span>9 PM</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4">
                        <div><label htmlFor="startTime" className="block text-sm font-medium mb-1">Start Time</label><TextInput type="time" id="startTime" name="startTime" value={prefs.startTime} onChange={handleInputChange} className="p-2" /></div>
                        <div><label htmlFor="endTime" className="block text-sm font-medium mb-1">End Time</label><TextInput type="time" id="endTime" name="endTime" value={prefs.endTime} onChange={handleInputChange} className="p-2" /></div>
                        <div><label htmlFor="slotDurationMinutes" className="block text-sm font-medium mb-1">Slot Duration (minutes)</label><TextInput type="number" id="slotDurationMinutes" name="slotDurationMinutes" value={prefs.slotDurationMinutes} onChange={handleInputChange} className="p-2" min="15" step="5" /></div>
                        <div><label htmlFor="lunchStartTime" className="block text-sm font-medium mb-1">Lunch Start</label><TextInput type="time" id="lunchStartTime" name="lunchStartTime" value={prefs.lunchStartTime} onChange={handleInputChange} className="p-2" /></div>
                        <div><label htmlFor="lunchDurationMinutes" className="block text-sm font-medium mb-1">Lunch Duration (minutes)</label><TextInput type="number" id="lunchDurationMinutes" name="lunchDurationMinutes" value={prefs.lunchDurationMinutes} onChange={handleInputChange} className="p-2" min="15" step="5" /></div>
                    </div>
                </div>
            </div>
        </SectionCard>
    );
};

const FacultyPreferencesContent = ({ constraints, onConstraintsChange, faculty, subjects }: { constraints: Constraints; onConstraintsChange: (c: Constraints) => void; faculty: Faculty[], subjects: Subject[] }) => {
    const [selectedFacultyId, setSelectedFacultyId] = useState<string>('');
    const [isUnavailabilityModalOpen, setIsUnavailabilityModalOpen] = useState(false);

    const currentPref = useMemo(() => {
        return constraints.facultyPreferences?.find(p => p.facultyId === selectedFacultyId) || { facultyId: selectedFacultyId };
    }, [selectedFacultyId, constraints.facultyPreferences]);

    const handlePrefChange = (field: keyof FacultyPreference, value: any) => {
        if (!selectedFacultyId) return;
        const newPrefs = [...(constraints.facultyPreferences || [])];
        let prefIndex = newPrefs.findIndex(p => p.facultyId === selectedFacultyId);

        let newPref: FacultyPreference;
        if (prefIndex === -1) {
            newPref = { facultyId: selectedFacultyId, [field]: value };
            newPrefs.push(newPref);
        } else {
            newPref = { ...newPrefs[prefIndex], [field]: value };
            newPrefs[prefIndex] = newPref;
        }
        onConstraintsChange({ ...constraints, facultyPreferences: newPrefs });
    };
    
    const handleUnavailabilityToggle = (day: string, timeSlot: string) => {
        if (!selectedFacultyId) return;
        const currentUnavailability = currentPref.unavailability || [];
        const slotExists = currentUnavailability.some(slot => slot.day === day && slot.timeSlot === timeSlot);
        const newUnavailability = slotExists
            ? currentUnavailability.filter(slot => !(slot.day === day && slot.timeSlot === timeSlot))
            : [...currentUnavailability, { day, timeSlot }];
        handlePrefChange('unavailability', newUnavailability);
    };

    const WeeklyUnavailabilityGrid = () => {
        const unavailabilitySet = new Set((currentPref.unavailability || []).map(s => `${s.day}:${s.timeSlot}`));
        return (
            <div className="overflow-x-auto">
                <table className="w-full border-collapse text-xs table-fixed">
                    <thead>
                        <tr>
                            <th className="p-2 border dark:border-slate-600 bg-gray-50 dark:bg-slate-700 w-24">Time</th>
                            {DAYS.map(day => <th key={day} className="p-2 border dark:border-slate-600 bg-gray-50 dark:bg-slate-700 capitalize">{day.substring(0, 3)}</th>)}
                        </tr>
                    </thead>
                    <tbody>
                        {TIME_SLOTS.map(time => (
                            <tr key={time}>
                                <td className="p-2 border dark:border-slate-600 font-medium whitespace-nowrap">{time}</td>
                                {DAYS.map(day => {
                                    const isUnavailable = unavailabilitySet.has(`${day}:${time}`);
                                    return (
                                        <td
                                            key={`${day}-${time}`}
                                            onClick={() => handleUnavailabilityToggle(day, time)}
                                            className={`p-2 border dark:border-slate-600 text-center cursor-pointer transition-colors ${isUnavailable ? 'bg-red-500/80 hover:bg-red-600' : 'bg-green-500/20 hover:bg-green-500/40'}`}
                                        ></td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    };

    const handleDayToggle = (day: string) => {
        const currentDays = currentPref.preferredDays || [];
        const newDays = currentDays.includes(day) ? currentDays.filter(d => d !== day) : [...currentDays, day];
        handlePrefChange('preferredDays', newDays);
    }

    return (
        <div>
            <Modal
                isOpen={isUnavailabilityModalOpen}
                onClose={() => setIsUnavailabilityModalOpen(false)}
                title={`Weekly Unavailability for ${faculty.find(f => f.id === selectedFacultyId)?.name || '...'}`}
                size="4xl"
            >
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Click on a time slot to toggle its availability. Red slots are unavailable.</p>
                <WeeklyUnavailabilityGrid />
            </Modal>
            <FormField label="Time Preferences for" htmlFor="faculty-pref-select">
                <SelectInput id="faculty-pref-select" name="faculty-pref-select" value={selectedFacultyId} onChange={e => setSelectedFacultyId(e.target.value)}>
                    <option value="">Select a faculty member...</option>
                    {faculty.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                </SelectInput>
            </FormField>
            {selectedFacultyId && (
                <div className="space-y-6 pt-4 border-t dark:border-slate-700 mt-4">
                    <SectionCard title="Availability">
                         <div className="mb-4">
                             <button onClick={() => setIsUnavailabilityModalOpen(true)} className="bg-gray-200 dark:bg-slate-700 hover:bg-gray-300 dark:hover:bg-slate-600 font-semibold py-2 px-4 rounded-md">Set Weekly Unavailability</button>
                         </div>
                         <h4 className="font-semibold mb-2 text-gray-700 dark:text-gray-300">Preferred Days</h4>
                         <div className="flex flex-wrap gap-2">
                            {DAYS.map(day => <button key={day} onClick={() => handleDayToggle(day)} className={`px-3 py-1 text-sm font-semibold rounded-full capitalize ${currentPref.preferredDays?.includes(day) ? 'bg-indigo-600 text-white' : 'bg-gray-200 dark:bg-slate-700'}`}>{day.substring(0,3)}</button>)}
                         </div>
                    </SectionCard>
                    <SectionCard title="Scheduling Rules (Soft Constraints)">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                 <h4 className="font-semibold mb-2">Daily Schedule Preference</h4>
                                 <div className="space-y-2">
                                    {['morning', 'afternoon', 'none'].map(pref => (
                                        <label key={pref} className="flex items-center gap-2">
                                            <input type="radio" name="dailySchedule" value={pref} checked={currentPref.dailySchedulePreference === pref} onChange={e => handlePrefChange('dailySchedulePreference', e.target.value)} />
                                            <span className="capitalize">{pref === 'none' ? 'No Preference' : `Prefer ${pref}s`}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                            <div>
                                 <h4 className="font-semibold mb-2" id="max-consecutive-label">Max Consecutive Classes</h4>
                                 <SelectInput aria-labelledby="max-consecutive-label" value={currentPref.maxConsecutiveClasses || 3} onChange={e => handlePrefChange('maxConsecutiveClasses', parseInt(e.target.value))}>
                                    {[1, 2, 3, 4].map(n => <option key={n} value={n}>{n}</option>)}
                                 </SelectInput>
                            </div>
                            <div className="col-span-1 md:col-span-2">
                                <h4 className="font-semibold mb-2">Gaps Between Classes</h4>
                                <div className="flex gap-4">
                                    {[
                                        ['back-to-back', 'Try to schedule back-to-back'],
                                        ['one-hour-gap', 'Prefer at least one-hour gaps']
                                    ].map(([val, label]) => (
                                        <label key={val} className="flex items-center gap-2">
                                            <input type="radio" name="gapPreference" value={val} checked={currentPref.gapPreference === val} onChange={e => handlePrefChange('gapPreference', e.target.value)} />
                                            {label}
                                        </label>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </SectionCard>
                     <SectionCard title="Course-Specific Preferences">
                        <p>Feature coming soon.</p>
                     </SectionCard>
                </div>
            )}
        </div>
    );
};

const AdditionalConstraintsContent = ({ constraints, onConstraintsChange, classes, faculty, subjects }: { constraints: Constraints; onConstraintsChange: (c: Constraints) => void; classes: Class[], faculty: Faculty[], subjects: Subject[] }) => {
    
    const handleToggle = (category: 'room' | 'student' | 'advanced', field: string, value: boolean) => {
        const keyMap = { room: 'roomResourceConstraints', student: 'studentSectionConstraints', advanced: 'advancedConstraints'};
        const categoryKey = keyMap[category];
        onConstraintsChange({ ...constraints, [categoryKey]: { ...constraints[categoryKey], [field]: value } });
    };

    const handleNumberChange = (category: 'student' | 'advanced', field: string, value: string) => {
        const keyMap = { student: 'studentSectionConstraints', advanced: 'advancedConstraints'};
        const categoryKey = keyMap[category];
        onConstraintsChange({ ...constraints, [categoryKey]: { ...constraints[categoryKey], [field]: parseInt(value) || 0 } });
    };

    return (
        <div className="space-y-6">
            <SectionCard title="Category 1: Room & Resource Constraints">
                <div className="space-y-4">
                    <div><h4 className="font-semibold mb-2">Subject-Specific Room Type</h4><p className="text-sm text-gray-500">Rule builder coming soon.</p></div>
                    <div><h4 className="font-semibold">Room Capacity</h4><p className="text-sm text-gray-500">Room capacity is automatically checked against class size during generation.</p></div>
                    <div><h4 className="font-semibold mb-2">Resource Booking</h4><p className="text-sm text-gray-500">Feature coming soon.</p></div>
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" id="prioritizeSameRoom" name="prioritizeSameRoom" checked={constraints.roomResourceConstraints?.prioritizeSameRoomForConsecutive || false} onChange={(e) => handleToggle('room', 'prioritizeSameRoomForConsecutive', e.target.checked)} />
                        Prioritize keeping a faculty's consecutive classes in the same room.
                    </label>
                </div>
            </SectionCard>
            <SectionCard title="Category 2: Student & Section Constraints">
                 <div className="space-y-4">
                    <div><label className="font-semibold mb-1 block" htmlFor="studentMaxConsecutive">Max Consecutive Classes for Students/Section</label><TextInput type="number" id="studentMaxConsecutive" name="studentMaxConsecutive" value={constraints.studentSectionConstraints?.maxConsecutiveClasses || 4} onChange={e => handleNumberChange('student', 'maxConsecutiveClasses', e.target.value)} className="max-w-xs" /></div>
                    <div><h4 className="font-semibold mb-2">Core Subject Spacing</h4><p className="text-sm text-gray-500">Feature coming soon.</p></div>
                    <div><h4 className="font-semibold">Lunch Break for Sections</h4><p className="text-sm text-gray-500">A single lunch break for the institution is defined in the 'Time & Day' tab.</p></div>
                 </div>
            </SectionCard>
            <SectionCard title="Category 3: Advanced Faculty & Institutional Constraints">
                <div className="space-y-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" id="loadBalancing" name="loadBalancing" checked={constraints.advancedConstraints?.enableFacultyLoadBalancing || false} onChange={(e) => handleToggle('advanced', 'enableFacultyLoadBalancing', e.target.checked)} />
                        Enable weekly load balancing for faculty.
                    </label>
                    <div><h4 className="font-semibold mb-2">Twin/Block Periods</h4><p className="text-sm text-gray-500">Rule builder coming soon.</p></div>
                    <div><h4 className="font-semibold mb-2">Teacher Co-location Constraint</h4><p className="text-sm text-gray-500">Rule builder coming soon.</p></div>
                    <div><label className="font-semibold mb-1 block" htmlFor="travelTime">Travel Time (for Multi-Campus Institutions)</label><TextInput type="number" id="travelTime" name="travelTime" placeholder="Minutes" value={constraints.advancedConstraints?.travelTimeMinutes || 0} onChange={e => handleNumberChange('advanced', 'travelTimeMinutes', e.target.value)} className="max-w-xs" /></div>
                </div>
            </SectionCard>
        </div>
    );
};


const ConstraintsTab = ({ constraints, onConstraintsChange, classes, subjects, faculty }: { constraints: Constraints; onConstraintsChange: (newConstraints: Constraints) => void; classes: Class[]; subjects: Subject[]; faculty: Faculty[]; }) => {
    const [activeSubTab, setActiveSubTab] = useState('global');
    const handleGlobalChange = (e: React.ChangeEvent<HTMLInputElement>) => { onConstraintsChange({ ...constraints, [e.target.name]: parseInt(e.target.value, 10) }); };
    const subTabs = [ { key: 'global', label: 'Global' }, { key: 'time_day', label: 'Time & Day' }, { key: 'faculty', label: 'Faculty Preferences' }, { key: 'additional', label: 'Additional Constraints' }, { key: 'fixed_classes', label: 'Fixed Classes' }];
    const SubTabButton = ({ subTab, label }: { subTab: string; label: string; }) => <button onClick={() => setActiveSubTab(subTab)} className={`px-4 py-2 text-sm font-semibold rounded-md transition-colors ${ activeSubTab === subTab ? 'bg-indigo-600 text-white' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-700' }`}>{label}</button>;
    
    const handleTimePreferencesChange = (newTimePreferences: TimePreferences) => {
        onConstraintsChange({ ...constraints, timePreferences: newTimePreferences });
    };

    const renderSubContent = () => {
        switch (activeSubTab) {
            case 'global': return (
                <SectionCard title="Global Constraints">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField label="Max Consecutive Classes (for Faculty)" htmlFor="maxConsecutiveClasses">
                            <TextInput type="number" id="maxConsecutiveClasses" name="maxConsecutiveClasses" value={constraints.maxConsecutiveClasses} onChange={handleGlobalChange} min={1} />
                        </FormField>
                    </div>
                </SectionCard>
            );
            case 'fixed_classes': return (
                <SectionCard title="Fixed Classes">
                    <form className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                        <FormField label="Class/Section" htmlFor="fixed-class">
                            <SelectInput id="fixed-class" name="fixed-class" defaultValue="">
                                <option value="" disabled>Select Class</option>
                                {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </SelectInput>
                        </FormField>
                        <FormField label="Day" htmlFor="fixed-day">
                            <SelectInput id="fixed-day" name="fixed-day" defaultValue="monday">
                                {DAYS.map(d => <option key={d} value={d} className="capitalize">{d}</option>)}
                            </SelectInput>
                        </FormField>
                        <FormField label="Time Slot" htmlFor="fixed-time">
                            <SelectInput id="fixed-time" name="fixed-time" defaultValue="09:30-10:20">
                                {TIME_SLOTS.map(t => <option key={t} value={t}>{t}</option>)}
                            </SelectInput>
                        </FormField>
                        <FormField label="Subject" htmlFor="fixed-subject">
                            <SelectInput id="fixed-subject" name="fixed-subject" defaultValue="">
                                <option value="" disabled>Select Subject</option>
                                {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </SelectInput>
                        </FormField>
                    </form>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-4">This feature for setting pre-defined classes is under development.</p>
                </SectionCard>
            );
            case 'time_day':
                return <TimePreferencesVisual prefs={constraints.timePreferences} onChange={handleTimePreferencesChange} />;
            case 'faculty':
                return <FacultyPreferencesContent constraints={constraints} onConstraintsChange={onConstraintsChange} faculty={faculty} subjects={subjects} />;
            case 'additional':
                return <AdditionalConstraintsContent constraints={constraints} onConstraintsChange={onConstraintsChange} classes={classes} faculty={faculty} subjects={subjects} />;
            default: return (
                <SectionCard title={subTabs.find(t => t.key === activeSubTab)?.label || 'Constraints'}>
                    <PlaceholderContent title="Coming Soon" message="This constraint type is under development." icon={<ConstraintsIcon />} />
                </SectionCard>
            );
        }
    };
    return (
        <>
            <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 p-2 rounded-xl flex flex-wrap gap-2 mb-6">
                {subTabs.map(tab => <SubTabButton key={tab.key} subTab={tab.key} label={tab.label} />)}
            </div>
            {renderSubContent()}
        </>
    );
};

const GenerateTab = ({ onGenerate, isLoading, error, loadingMessage }: { onGenerate: () => void; isLoading: boolean; error: string | null; loadingMessage: string; }) => (
    <div className="text-center bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-lg max-w-2xl mx-auto">
        <h3 className="text-2xl font-bold">Generate Timetable</h3>
        <p className="text-gray-500 my-4">Click below to use the AI to generate a timetable based on your setup and constraints.</p>
        {error && (
            <div className="bg-red-500/10 border-red-500/50 text-red-700 px-4 py-3 rounded-lg text-left my-4">
                <p className="font-bold mb-1">Generation Failed</p>
                <p className="text-sm">The AI scheduler encountered a problem. Please review your data and constraints, and try again.</p>
                <p className="text-xs mt-2 font-mono bg-red-200/50 dark:bg-red-900/50 p-2 rounded">{error}</p>
            </div>
        )}
        <button onClick={onGenerate} disabled={isLoading} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 px-8 rounded-lg flex items-center justify-center gap-3 disabled:bg-indigo-400">
            {isLoading ? <><LoadingIcon /> {loadingMessage}</> : <><GenerateIcon /> Start AI Generation</>}
        </button>
    </div>
);

const ViewTab = ({ timetable, classes }: { timetable: TimetableEntry[]; classes: Class[] }) => {
    const [selectedClass, setSelectedClass] = useState(classes[0]?.name || 'All');
    const filteredTimetable = useMemo(() => selectedClass === 'All' ? timetable : timetable.filter(e => e.className === selectedClass), [timetable, selectedClass]);

    const downloadExcel = () => {
        const headers = "Day,Time,Class,Subject,Faculty,Room,Type";
        const rows = filteredTimetable.map(e => [e.day, e.time, e.className, e.subject, e.faculty, e.room, e.type].join(','));
        const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].join("\n");
        const link = document.createElement("a");
        link.setAttribute("href", encodeURI(csvContent));
        // Using .xls extension can sometimes trick systems into opening the CSV directly in Excel.
        link.setAttribute("download", `timetable_${selectedClass.replace(/\s+/g, '_')}.xls`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const downloadPDF = () => {
        alert('PDF download functionality is under development.');
    };

    if (timetable.length === 0) return <SectionCard title="View Timetable"><p>No timetable has been generated yet.</p></SectionCard>;

    return (
        <SectionCard title="Generated Timetable">
            <div className="flex flex-wrap justify-between items-center mb-4 gap-4">
                <div>
                    <label htmlFor="view-class-select" className="mr-2">Select Class:</label>
                    <SelectInput id="view-class-select" name="view-class-select" value={selectedClass} onChange={e => setSelectedClass(e.target.value)}>
                        <option value="All">All Classes</option>
                        {classes.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                    </SelectInput>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold mr-2">View Options:</span>
                    <button onClick={downloadExcel} className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg"><DownloadIcon />Download as Excel</button>
                    <button onClick={downloadPDF} className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg"><DownloadIcon />Download as PDF</button>
                </div>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                    <thead>
                        <tr>
                            <th className="p-3 font-semibold text-left text-gray-600 dark:text-gray-300 border-b-2 dark:border-slate-700">Time</th>
                            {DAYS.map(day => <th key={day} className="p-3 font-semibold text-center capitalize text-gray-600 dark:text-gray-300 border-b-2 dark:border-slate-700">{day}</th>)}
                        </tr>
                    </thead>
                    <tbody>
                        {TIME_SLOTS.map(time => (
                            <tr key={time} className="dark:text-gray-200">
                                <td className="p-3 font-medium border-b dark:border-slate-700 whitespace-nowrap">{time}</td>
                                {DAYS.map(day => {
                                    const entries = filteredTimetable.filter(e => e.day.toLowerCase() === day.toLowerCase() && e.time === time);
                                    return (
                                        <td key={day} className="p-1 border-b dark:border-slate-700 align-top">
                                            {entries.length > 0 ? entries.map((entry, i) => (
                                                <div key={i} className="p-2 rounded-lg text-white text-xs bg-indigo-500 mb-1">
                                                    <div className="font-bold">{entry.subject}</div>
                                                    <div className="opacity-80">{selectedClass === 'All' ? entry.className : entry.faculty}</div>
                                                    <div className="opacity-80">Room: {entry.room}</div>
                                                </div>
                                            )) : (time === '12:50-01:35' ? <div className="text-center text-gray-400 text-xs py-2">Lunch</div> : null)}
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </SectionCard>
    );
};

export const TimetableScheduler = ({ classes, faculty, subjects, rooms, students, constraints, setConstraints, onSaveEntity, onDeleteEntity, onResetData, token, onSaveTimetable }: TimetableSchedulerProps) => {
  const [activeTab, setActiveTab] = useState('setup');
  const [timetable, setTimetable] = useState<TimetableEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);
  const [loadingMessage, setLoadingMessage] = useState("Initializing AI generation...");
  const [modalState, setModalState] = useState<{ isOpen: boolean, mode: 'add' | 'edit', type: EntityType | '', data: Entity | null, error: string | null }>({ isOpen: false, mode: 'add', type: '', data: null, error: null });
  const [isImportModalOpen, setIsImportModalOpen] = useState<{isOpen: boolean, type: EntityType | ''}>({isOpen: false, type: ''});
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{ type: 'generate' | 'bulkDelete' | 'reset', payload?: any, message: string, onConfirm: () => void } | null>(null);
  const [selectedItems, setSelectedItems] = useState<{ [key in EntityType]: string[] }>({ class: [], faculty: [], subject: [], room: [] });

  const loadingMessages = useMemo(() => ["Analyzing constraints...", "Allocating classrooms...", "Scheduling subjects...", "Optimizing schedules...", "Finalizing timetable..."], []);
  useEffect(() => { let i: number; if (isLoading) { setLoadingMessage("Initializing..."); let idx = 0; i = window.setInterval(() => { idx = (idx + 1) % loadingMessages.length; setLoadingMessage(loadingMessages[idx]); }, 2500); } return () => { if (i) window.clearInterval(i); }; }, [isLoading, loadingMessages]);
  
  const handleGenerate = useCallback(async () => {
    if (!constraints) { setError("Constraints are not loaded yet."); return; }
    setConfirmAction(null); setIsLoading(true); setError(null);
    try {
      const result = await generateTimetable(classes, faculty, subjects, rooms, constraints, token);
      await onSaveTimetable(result);
      setTimetable(result); // Update local state for ViewTab
      setActiveTab('view');
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unknown error occurred during timetable generation.");
    } finally {
      setIsLoading(false);
    }
  }, [classes, faculty, subjects, rooms, constraints, token, onSaveTimetable]);

  const handleInitiateGenerate = useCallback(() => {
    setError(null);
    if (classes.length === 0 || subjects.length === 0 || faculty.length === 0 || rooms.length === 0) {
        setError("Please add classes, subjects, faculty, and rooms before generating a timetable.");
        return;
    }
    setConfirmAction({ type: 'generate', message: 'This will generate a new timetable. Any existing timetable data will be overwritten upon saving. Are you sure?', onConfirm: handleGenerate });
  }, [classes, faculty, subjects, rooms, handleGenerate]);
  
  const handleSave = async (type: EntityType, data: Entity) => { try { await onSaveEntity(type, data); closeModal(); } catch(err) { setModalState(p => ({ ...p, error: err instanceof Error ? err.message : "An error occurred." })); } };
  const handleDelete = async (type: EntityType, id: string) => { try { await onDeleteEntity(type, id); } catch(err) { setPageError(err instanceof Error ? err.message : `Failed to delete.`); } };
  const openModal = (mode: 'add' | 'edit', type: EntityType, data: Entity | null = null) => setModalState({ isOpen: true, mode, type, data, error: null });
  const closeModal = () => setModalState({ isOpen: false, mode: 'add', type: '', data: null, error: null });
  const openImportModal = (type: EntityType) => setIsImportModalOpen({isOpen: true, type: type});

    const handleToggleSelect = (type: EntityType, id: string) => {
        setSelectedItems(prev => ({
            ...prev,
            [type]: prev[type].includes(id) ? prev[type].filter(itemId => itemId !== id) : [...prev[type], id]
        }));
    };
    const handleToggleSelectAll = (type: EntityType, displayedItems: any[]) => {
        const displayedIds = displayedItems.map(item => item.id);
        const allSelected = displayedIds.every(id => selectedItems[type].includes(id));
        setSelectedItems(prev => ({
            ...prev,
            [type]: allSelected ? prev[type].filter(id => !displayedIds.includes(id)) : [...new Set([...prev[type], ...displayedIds])]
        }));
    };
    const handleInitiateBulkDelete = (type: EntityType) => {
        if (selectedItems[type].length === 0) {
            setPageError(`No ${type} items selected for deletion.`);
            return;
        }
        setConfirmAction({
            type: 'bulkDelete',
            payload: type,
            message: `Are you sure you want to delete ${selectedItems[type].length} selected ${type}(s)? This action cannot be undone.`,
            onConfirm: () => handleConfirmBulkDelete(type)
        });
    };
    const handleConfirmBulkDelete = async (type: EntityType) => {
        setPageError(null);
        try {
            await Promise.all(selectedItems[type].map(id => onDeleteEntity(type, id)));
            setSelectedItems(prev => ({ ...prev, [type]: [] })); // Clear selection
        } catch (err) {
            setPageError(err instanceof Error ? err.message : `Failed to delete some items.`);
        } finally {
            setConfirmAction(null);
        }
    };

  const renderModalContent = () => {
    const { isOpen, mode, type, data, error: modalError } = modalState;
    if (!isOpen || !type) return null;
    const title = `${mode === 'add' ? 'Add' : 'Edit'} ${type.charAt(0).toUpperCase() + type.slice(1)}`;
    switch (type) {
      case 'class': return <Modal isOpen={isOpen} onClose={closeModal} title={title} error={modalError}><ClassForm initialData={data as Class | null} onSave={(d) => handleSave(type, d)} /></Modal>;
      case 'faculty': return <Modal isOpen={isOpen} onClose={closeModal} title={title} error={modalError}><FacultyForm initialData={data as Faculty | null} onSave={(d) => handleSave(type, d)} /></Modal>;
      case 'subject': return <Modal isOpen={isOpen} onClose={closeModal} title={title} error={modalError}><SubjectForm initialData={data as Subject | null} onSave={(d) => handleSave(type, d)} faculty={faculty} /></Modal>;
      case 'room': return <Modal isOpen={isOpen} onClose={closeModal} title={title} error={modalError}><RoomForm initialData={data as Room | null} onSave={(d) => handleSave(type, d)} /></Modal>;
      default: return null;
    }
  };
  
  const renderContent = () => {
    switch (activeTab) {
      case 'setup': return <SetupTab classes={classes} faculty={faculty} subjects={subjects} rooms={rooms} constraints={constraints} onUpdateConstraints={setConstraints} openModal={openModal} handleDelete={handleDelete} handleResetData={onResetData} selectedItems={selectedItems} onToggleSelect={handleToggleSelect} onToggleSelectAll={handleToggleSelectAll} onInitiateBulkDelete={handleInitiateBulkDelete} pageError={pageError} openImportModal={openImportModal} />;
      case 'constraints': return constraints ? <ConstraintsTab constraints={constraints} onConstraintsChange={setConstraints} classes={classes} subjects={subjects} faculty={faculty} /> : <LoadingIcon />;
      case 'availability': return <PlaceholderContent title="Faculty Availability" message="This section will allow managing faculty availability and preferences." icon={<AvailabilityIcon />} />;
      case 'generate': return <GenerateTab onGenerate={handleInitiateGenerate} isLoading={isLoading} error={error} loadingMessage={loadingMessage} />;
      case 'view': return <ViewTab timetable={timetable} classes={classes} />;
      case 'analytics': return <PlaceholderContent title="Analytics Dashboard" message="This section will provide insights and reports on the generated timetables." icon={<AnalyticsIcon />} />;
      default: return null;
    }
  };

  const TabButton = ({ tab, label, icon }: { tab: string, label: string, icon: React.ReactNode }) => <button onClick={() => setActiveTab(tab)} className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-md transition-colors ${activeTab === tab ? 'bg-indigo-600 text-white' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-700'}`}>{icon}{label}</button>;

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8">
      {renderModalContent()}
      <ImportModal isOpen={isImportModalOpen.isOpen} onClose={() => setIsImportModalOpen({isOpen: false, type: ''})} entityType={isImportModalOpen.type} />
       <Modal
            isOpen={!!confirmAction}
            onClose={() => setConfirmAction(null)}
            title="Please Confirm"
        >
        {confirmAction && (
            <div>
                <p className="mb-4">{confirmAction.message}</p>
                <div className="flex justify-end gap-2">
                    <button onClick={() => setConfirmAction(null)} className="bg-gray-200 dark:bg-slate-700 py-2 px-4 rounded-lg">Cancel</button>
                    <button onClick={confirmAction.onConfirm} className="bg-indigo-600 text-white py-2 px-4 rounded-lg">Confirm</button>
                </div>
            </div>
        )}
      </Modal>
      <header className="flex justify-between items-center mb-6">
         <div>
          <h1 className="text-3xl font-bold">Smart College Timetable Scheduler</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">AI-Powered Academic Scheduling for Inter-Course Management</p>
        </div>
      </header>
      <nav className="bg-white dark:bg-slate-800 border dark:border-slate-700 p-2 rounded-xl flex justify-between items-center gap-2 mb-8">
        <div className="flex flex-wrap gap-2">
            <TabButton tab="setup" label="Setup" icon={<SetupIcon />} />
            <TabButton tab="constraints" label="Constraints" icon={<ConstraintsIcon />} />
            <TabButton tab="availability" label="Availability" icon={<AvailabilityIcon className="h-5 w-5" />} />
            <TabButton tab="generate" label="Generate" icon={<GenerateIcon />} />
            <TabButton tab="view" label="View Timetable" icon={<ViewIcon />} />
            <TabButton tab="analytics" label="Analytics" icon={<AnalyticsIcon className="h-5 w-5" />} />
        </div>
      </nav>
      <main>{renderContent()}</main>
    </div>
  );
};
