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
const ClassForm = ({ initialData, onSave, constraints }: { initialData: Class | null; onSave: (data: any) => Promise<void>; constraints: Constraints | null; }) => {
    const [data, setData] = useState(initialData || { id: '', name: '', branch: '', year: 1, section: '', studentCount: 0, block: '' });
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setData({ ...data, [e.target.name]: e.target.type === 'number' ? parseInt(e.target.value, 10) : e.target.value });
    const formId = initialData?.id || 'new-class';
    return (
        <form onSubmit={(e) => { e.preventDefault(); onSave(data); }}>
            <FormField label="Name" htmlFor={`${formId}-name`}><TextInput id={`${formId}-name`} name="name" value={data.name} onChange={handleChange} required /></FormField>
            <FormField label="Branch" htmlFor={`${formId}-branch`}><TextInput id={`${formId}-branch`} name="branch" value={data.branch} onChange={handleChange} required /></FormField>
            <FormField label="Year" htmlFor={`${formId}-year`}><TextInput type="number" id={`${formId}-year`} name="year" value={data.year} onChange={handleChange} required min={1} /></FormField>
            <FormField label="Section" htmlFor={`${formId}-section`}><TextInput id={`${formId}-section`} name="section" value={data.section} onChange={handleChange} required /></FormField>
            <FormField label="Student Count" htmlFor={`${formId}-studentCount`}><TextInput type="number" id={`${formId}-studentCount`} name="studentCount" value={data.studentCount} onChange={handleChange} required min={1} /></FormField>
            <FormField label="Block/Campus" htmlFor={`${formId}-block`}>
                <SelectInput id={`${formId}-block`} name="block" value={data.block || ''} onChange={handleChange}>
                    <option value="">No Block</option>
                    {(constraints?.institutionDetails?.blocks || []).map(b => <option key={b} value={b}>{b}</option>)}
                </SelectInput>
            </FormField>
            <button type="submit" className="w-full mt-4 bg-indigo-600 text-white font-bold py-2 px-4 rounded-lg flex items-center justify-center gap-2"><SaveIcon />Save</button>
        </form>
    );
};
const FacultyForm = ({ initialData, onSave }: { initialData: Faculty | null; onSave: (data: any) => Promise<void>; }) => {
    const [data, setData] = useState(initialData ? { ...initialData, specialization: initialData.specialization.join(', '), email: initialData.email || '', contactNumber: initialData.contactNumber || '' } : { id: '', name: '', department: '', specialization: '', email: '', contactNumber: '' });
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => setData({ ...data, [e.target.name]: e.target.value });
    const handleSave = (e: React.FormEvent) => { e.preventDefault(); onSave({ ...data, specialization: data.specialization.split(',').map(s => s.trim()).filter(Boolean) }); };
    const formId = initialData?.id || 'new-faculty';
    return (
        <form onSubmit={handleSave}>
            <FormField label="Name" htmlFor={`${formId}-name`}><TextInput id={`${formId}-name`} name="name" value={data.name} onChange={handleChange} required /></FormField>
            <FormField label="Email" htmlFor={`${formId}-email`}><TextInput type="email" id={`${formId}-email`} name="email" value={data.email} onChange={handleChange} required /></FormField>
            <FormField label="Contact Number (Optional)" htmlFor={`${formId}-contactNumber`}><TextInput type="tel" id={`${formId}-contactNumber`} name="contactNumber" value={data.contactNumber} onChange={handleChange} /></FormField>
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
const RoomForm = ({ initialData, onSave, constraints }: { initialData: Room | null; onSave: (data: any) => Promise<void>; constraints: Constraints | null; }) => {
    const [data, setData] = useState(initialData || { id: '', number: '', type: 'classroom', capacity: 0, block: '' });
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
            <FormField label="Block/Campus" htmlFor={`${formId}-block`}>
                <SelectInput id={`${formId}-block`} name="block" value={data.block || ''} onChange={handleChange}>
                    <option value="">No Block</option>
                    {(constraints?.institutionDetails?.blocks || []).map(b => <option key={b} value={b}>{b}</option>)}
                </SelectInput>
            </FormField>
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

const DataManagementModal = ({ isOpen, onClose, initialEntityType }: { isOpen: boolean; onClose: () => void; initialEntityType?: EntityType; }) => {
    const [entityType, setEntityType] = useState<EntityType>(initialEntityType || 'class');

    useEffect(() => {
        if (initialEntityType) {
            setEntityType(initialEntityType);
        }
    }, [initialEntityType]);
    
    const formats: { [key in EntityType]: string } = {
        class: "Required: name, branch, year, section, studentCount. Optional: block",
        faculty: "Required: name, department, email. Optional: specialization (comma-separated), contactNumber",
        subject: "Required: name, code, department, hoursPerWeek, assignedFacultyId. Optional: type (theory/lab)",
        room: "Required: number, capacity. Optional: type (classroom/lab), block"
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={`Import Data`}
        >
            <div className="space-y-4">
                <FormField label="Select Data Type to Import" htmlFor="import-entity-type">
                     <SelectInput id="import-entity-type" value={entityType} onChange={(e) => setEntityType(e.target.value as EntityType)}>
                        <option value="class">Classes</option>
                        <option value="faculty">Faculty</option>
                        <option value="subject">Subjects</option>
                        <option value="room">Rooms</option>
                     </SelectInput>
                </FormField>
                <p className="text-sm text-gray-500 dark:text-gray-400">Upload a CSV or Excel file to bulk-add data. Make sure your file follows the specified format.</p>
                <div className="p-3 bg-gray-100 dark:bg-slate-700/50 rounded-md">
                    <p className="text-sm font-semibold">File Format:</p>
                    <p className="text-xs font-mono mt-1 text-gray-600 dark:text-gray-300">{formats[entityType]}</p>
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
                 <p className="text-xs text-center text-gray-400 font-semibold">Note: A universal import from a single file is planned for a future update.</p>
                <div className="flex justify-end pt-4">
                     <button type="button" onClick={() => { alert('File processing is a placeholder and not yet implemented.'); onClose(); }} className="bg-indigo-600 text-white font-bold py-2 px-4 rounded-lg flex items-center justify-center gap-2">Process File</button>
                </div>
            </div>
        </Modal>
    );
};

const SetupTab = ({ classes, faculty, subjects, rooms, constraints, onUpdateConstraints, openModal, handleDelete, handleResetData, selectedItems, onToggleSelect, onToggleSelectAll, onInitiateBulkDelete, pageError, openImportModal }: { classes: Class[]; faculty: Faculty[]; subjects: Subject[]; rooms: Room[]; constraints: Constraints | null; onUpdateConstraints: (c: Constraints) => void; openModal: (mode: 'add' | 'edit', type: EntityType, data?: Entity | null) => void; handleDelete: (type: EntityType, id: string) => Promise<void>; handleResetData: () => Promise<void>; selectedItems: { [key in EntityType]: string[] }; onToggleSelect: (type: EntityType, id: string) => void; onToggleSelectAll: (type: EntityType, displayedItems: any[]) => void; onInitiateBulkDelete: (type: EntityType) => void; pageError: string | null; openImportModal: (type?: EntityType) => void; }) => {
    const [search, setSearch] = useState({ class: '', faculty: '', subject: '', room: '' });
    const [blockFilter, setBlockFilter] = useState<string>('all');

    const handleInstituteFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        if (!constraints) return;
        const { name, value } = e.target;
        let newDetails;
        if (name === 'blocks') {
            newDetails = { ...(constraints.institutionDetails || {}), blocks: value.split(',').map(b => b.trim()).filter(Boolean) };
        } else {
            newDetails = { ...(constraints.institutionDetails || {}), [name]: value };
        }
        onUpdateConstraints({ ...constraints, institutionDetails: newDetails as InstitutionDetails });
    };

    const handleSearch = (type: EntityType, value: string) => setSearch(prev => ({ ...prev, [type]: value }));
    const filter = <T extends object>(data: T[], query: string) => data.filter(item => Object.values(item).some(val => String(val).toLowerCase().includes(query.toLowerCase())));
    const filtered = { 
      class: filter(classes, search.class).filter(c => blockFilter === 'all' || !c.block || c.block === blockFilter), 
      faculty: filter(faculty, search.faculty), 
      subject: filter(subjects, search.subject), 
      room: filter(rooms, search.room).filter(r => blockFilter === 'all' || !r.block || r.block === blockFilter)
    };
    const facultyMap = useMemo(() => Object.fromEntries(faculty.map(f => [f.id, f.name])), [faculty]);
    
    const details: Partial<InstitutionDetails> = constraints?.institutionDetails || {};

    const allBlocks = useMemo(() => ['all', ...(constraints?.institutionDetails?.blocks || [])], [constraints]);

    return (
        <>
            <ErrorDisplay message={pageError} />
            <SectionCard title="Institution Details" actions={
                <div className="flex items-center gap-2">
                    <button onClick={() => openImportModal()} className="flex items-center gap-1 text-sm bg-gray-100 dark:bg-slate-700/50 text-gray-700 dark:text-gray-300 font-semibold px-3 py-1.5 rounded-md"><UploadIcon />Import Data</button>
                </div>
            }>
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
                    <div className="md:col-span-2">
                        <FormField label="Campus Blocks (comma-separated)" htmlFor="inst-blocks">
                            <TextInput id="inst-blocks" name="blocks" placeholder="e.g., A-Block, B-Block, Science Wing" value={(details.blocks || []).join(', ')} onChange={handleInstituteFormChange} />
                        </FormField>
                    </div>
                </div>
                 <p className="text-xs text-right text-gray-400 mt-2">Changes are saved automatically.</p>
            </SectionCard>
            <div className="my-4">
                <FormField label="Filter by Block/Campus" htmlFor="block-filter">
                    <SelectInput id="block-filter" value={blockFilter} onChange={e => setBlockFilter(e.target.value)}>
                        {allBlocks.map(b => <option key={b} value={b}>{b === 'all' ? 'All Blocks' : b}</option>)}
                    </SelectInput>
                </FormField>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <SectionCard title="Classes & Sections" actions={<div className="flex items-center gap-2"><button onClick={() => openImportModal('class')} className="action-btn-secondary"><UploadIcon/></button><button onClick={() => openModal('add', 'class')} className="action-btn-primary"><AddIcon />Add Class</button></div>}>
                    <SearchInput value={search.class} onChange={v => handleSearch('class', v)} placeholder="Search classes..." label="Search Classes" id="search-class" />
                    <div className="max-h-80 overflow-y-auto">
                        <DataTable headers={["Name", "Branch", "Block", "Students", "Actions"]} data={filtered.class} renderRow={(c: Class) => (
                            <tr key={c.id} className="border-b dark:border-slate-700">
                                <td className="px-4 py-3"><input type="checkbox" className="h-4 w-4" checked={selectedItems.class.includes(c.id)} onChange={() => onToggleSelect('class', c.id)} /></td>
                                <td className="px-6 py-3 font-medium">{c.name}</td>
                                <td className="px-6 py-3">{c.branch}</td>
                                <td className="px-6 py-3">{c.block || 'N/A'}</td>
                                <td className="px-6 py-3">{c.studentCount}</td>
                                <td className="px-6 py-3 flex gap-2"><button onClick={() => openModal('edit', 'class', c)}><EditIcon /></button><button onClick={() => handleDelete('class', c.id)}><DeleteIcon /></button></td>
                            </tr>
                        )} headerPrefix={<HeaderCheckbox type="class" items={filtered.class} selectedItems={selectedItems} onToggleSelectAll={onToggleSelectAll} />} />
                    </div>
                </SectionCard>
                <SectionCard title="Faculty" actions={<div className="flex items-center gap-2"><button onClick={() => openImportModal('faculty')} className="action-btn-secondary"><UploadIcon/></button><button onClick={() => openModal('add', 'faculty')} className="action-btn-primary"><AddIcon />Add Faculty</button></div>}>
                    <SearchInput value={search.faculty} onChange={v => handleSearch('faculty', v)} placeholder="Search faculty..." label="Search Faculty" id="search-faculty" />
                    <div className="max-h-80 overflow-y-auto">
                        <DataTable headers={["Name", "Department", "Specialization", "Actions"]} data={filtered.faculty} renderRow={(f: Faculty) => (
                            <tr key={f.id} className="border-b dark:border-slate-700">
                                <td className="px-4 py-3"><input type="checkbox" className="h-4 w-4" checked={selectedItems.faculty.includes(f.id)} onChange={() => onToggleSelect('faculty', f.id)} /></td>
                                <td className="px-6 py-3 font-medium">{f.name}</td>
                                <td className="px-6 py-3">{f.department}</td>
                                <td className="px-6 py-3">{f.specialization.join(', ')}</td>
                                <td className="px-6 py-3 flex gap-2"><button onClick={() => openModal('edit', 'faculty', f)}><EditIcon /></button><button onClick={() => handleDelete('faculty', f.id)}><DeleteIcon /></button></td>
                            </tr>
                        )} headerPrefix={<HeaderCheckbox type="faculty" items={filtered.faculty} selectedItems={selectedItems} onToggleSelectAll={onToggleSelectAll} />} />
                    </div>
                </SectionCard>
                <SectionCard title="Subjects" actions={<div className="flex items-center gap-2"><button onClick={() => openImportModal('subject')} className="action-btn-secondary"><UploadIcon/></button><button onClick={() => openModal('add', 'subject')} className="action-btn-primary"><AddIcon />Add Subject</button></div>}>
                    <SearchInput value={search.subject} onChange={v => handleSearch('subject', v)} placeholder="Search subjects..." label="Search Subjects" id="search-subject" />
                    <div className="max-h-80 overflow-y-auto">
                        <DataTable headers={["Name", "Code", "Department", "Type", "Hrs/Wk", "Faculty", "Actions"]} data={filtered.subject} renderRow={(s: Subject) => (
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
                    </div>
                </SectionCard>
                <SectionCard title="Rooms" actions={<div className="flex items-center gap-2"><button onClick={() => openImportModal('room')} className="action-btn-secondary"><UploadIcon/></button><button onClick={() => openModal('add', 'room')} className="action-btn-primary"><AddIcon />Add Room</button></div>}>
                    <SearchInput value={search.room} onChange={v => handleSearch('room', v)} placeholder="Search rooms..." label="Search Rooms" id="search-room" />
                    <div className="max-h-80 overflow-y-auto">
                        <DataTable headers={["Number", "Type", "Capacity", "Block", "Actions"]} data={filtered.room} renderRow={(r: Room) => (
                            <tr key={r.id} className="border-b dark:border-slate-700">
                                <td className="px-4 py-3"><input type="checkbox" className="h-4 w-4" checked={selectedItems.room.includes(r.id)} onChange={() => onToggleSelect('room', r.id)} /></td>
                                <td className="px-6 py-3 font-medium">{r.number}</td>
                                <td className="px-6 py-3">{r.type}</td>
                                <td className="px-6 py-3">{r.capacity}</td>
                                <td className="px-6 py-3">{r.block || 'N/A'}</td>
                                <td className="px-6 py-3 flex gap-2"><button onClick={() => openModal('edit', 'room', r)}><EditIcon /></button><button onClick={() => handleDelete('room', r.id)}><DeleteIcon /></button></td>
                            </tr>
                        )} headerPrefix={<HeaderCheckbox type="room" items={filtered.room} selectedItems={selectedItems} onToggleSelectAll={onToggleSelectAll} />} />
                    </div>
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
        const newCategoryState = { ...(constraints[categoryKey] || {}), [field]: value };
        onConstraintsChange({ ...constraints, [categoryKey]: newCategoryState });
    };

    const handleNumberChange = (category: 'student' | 'advanced', field: string, value: string) => {
        const keyMap = { student: 'studentSectionConstraints', advanced: 'advancedConstraints'};
        const categoryKey = keyMap[category];
        const newCategoryState = { ...(constraints[categoryKey] || {}), [field]: parseInt(value) || 0 };
        onConstraintsChange({ ...constraints, [categoryKey]: newCategoryState });
    };

    return (
        <div className="space-y-6">
            <SectionCard title="Room & Resource Constraints">
                <label className="flex items-center gap-3">
                    <input type="checkbox" checked={constraints.roomResourceConstraints?.prioritizeSameRoomForConsecutive || false} onChange={e => handleToggle('room', 'prioritizeSameRoomForConsecutive', e.target.checked)} />
                    <span>Prioritize keeping consecutive classes for the same section in the same room.</span>
                </label>
            </SectionCard>
            <SectionCard title="Student Section Constraints">
                <div className="space-y-4">
                    <label className="flex items-center gap-3">
                        <input type="checkbox" checked={constraints.studentSectionConstraints?.avoidConsecutiveCore || false} onChange={e => handleToggle('student', 'avoidConsecutiveCore', e.target.checked)} />
                        <span>Avoid scheduling two core subjects back-to-back for the same section.</span>
                    </label>
                    <div className="flex items-center gap-3">
                        <label htmlFor="max-consecutive-student" className="whitespace-nowrap">Max consecutive classes for any student section:</label>
                        <TextInput type="number" id="max-consecutive-student" value={constraints.studentSectionConstraints?.maxConsecutiveClasses || 4} onChange={e => handleNumberChange('student', 'maxConsecutiveClasses', e.target.value)} className="w-20" />
                    </div>
                </div>
            </SectionCard>
            <SectionCard title="Advanced & Logistical Constraints">
                 <div className="space-y-4">
                    <label className="flex items-center gap-3">
                        <input type="checkbox" checked={constraints.advancedConstraints?.enableFacultyLoadBalancing || false} onChange={e => handleToggle('advanced', 'enableFacultyLoadBalancing', e.target.checked)} />
                        <span>Enable automatic faculty load balancing across the week.</span>
                    </label>
                    <div className="flex items-center gap-3">
                        <label htmlFor="travel-time" className="whitespace-nowrap">Travel time between different campus buildings (in minutes):</label>
                        <TextInput type="number" id="travel-time" value={constraints.advancedConstraints?.travelTimeMinutes || 0} onChange={e => handleNumberChange('advanced', 'travelTimeMinutes', e.target.value)} className="w-20" />
                    </div>
                </div>
            </SectionCard>
        </div>
    );
};

const ConstraintsTab = ({ constraints, setConstraints, faculty, subjects, classes }: { constraints: Constraints | null; setConstraints: (c: Constraints) => void; faculty: Faculty[], subjects: Subject[], classes: Class[] }) => {
    const [activeSubTab, setActiveSubTab] = useState('time');
    
    if (!constraints) return <LoadingIcon />;

    const subTabs = [
        { key: 'time', label: 'Time & Day', icon: <ConstraintsIcon /> },
        { key: 'faculty', label: 'Faculty Preferences', icon: <AvailabilityIcon /> },
        { key: 'additional', label: 'Additional Rules', icon: <AnalyticsIcon /> }
    ];
    
    return (
        <div className="space-y-6">
             <div className="bg-white dark:bg-slate-800 border dark:border-slate-700 p-2 rounded-xl flex flex-wrap gap-2">
                {subTabs.map(tab => (
                     <button key={tab.key} onClick={() => setActiveSubTab(tab.key)} className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${activeSubTab === tab.key ? 'bg-indigo-600 text-white' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-700'}`}>{tab.icon} {tab.label}</button>
                ))}
            </div>

            {activeSubTab === 'time' && <TimePreferencesVisual prefs={constraints.timePreferences} onChange={(newPrefs) => setConstraints({ ...constraints, timePreferences: newPrefs })} />}
            {activeSubTab === 'faculty' && <FacultyPreferencesContent constraints={constraints} onConstraintsChange={setConstraints} faculty={faculty} subjects={subjects} />}
            {activeSubTab === 'additional' && <AdditionalConstraintsContent constraints={constraints} onConstraintsChange={setConstraints} classes={classes} faculty={faculty} subjects={subjects} />}

        </div>
    );
};
const GenerateTab = ({ onGenerate, onSave, generationResult, isLoading, error, onClear, constraints }: { onGenerate: () => void; onSave: () => void; generationResult: TimetableEntry[] | null; isLoading: boolean; error: string | null; onClear: () => void; constraints: Constraints | null; }) => {

    const downloadAsExcel = () => {
        if (!generationResult) return;
        const headers = ["Day", "Time", "Class", "Subject", "Faculty", "Room", "Type"];
        const csvContent = "data:text/csv;charset=utf-8," 
            + headers.join(",") + "\n" 
            + generationResult.map(e => [e.day, e.time, e.className, e.subject, e.faculty, e.room, e.type].join(",")).join("\n");
        const link = document.createElement("a");
        link.setAttribute("href", encodeURI(csvContent));
        link.setAttribute("download", "timetable.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const lunchSlot = useMemo(() => {
        if (constraints?.timePreferences) {
            const { lunchStartTime, lunchDurationMinutes } = constraints.timePreferences;
            const [hours, minutes] = lunchStartTime.split(':').map(Number);
            const startTotalMinutes = hours * 60 + minutes;
            const endTotalMinutes = startTotalMinutes + lunchDurationMinutes;
            const endHours = Math.floor(endTotalMinutes / 60).toString().padStart(2, '0');
            const endMinutes = (endTotalMinutes % 60).toString().padStart(2, '0');
            return `${lunchStartTime}-${endHours}:${endMinutes}`;
        }
        return '12:50-01:35'; // Fallback
    }, [constraints]);

    return (
        <div className="space-y-6">
            <SectionCard title="Generate Timetable" actions={
                <button onClick={onGenerate} disabled={isLoading} className="flex items-center gap-2 bg-indigo-600 text-white font-bold py-2 px-4 rounded-lg disabled:opacity-50">
                    {isLoading ? <><LoadingIcon className="h-5 w-5" /> Generating...</> : <><GenerateIcon /> Generate Timetable</>}
                </button>
            }>
                <p className="text-gray-500 dark:text-gray-400">Click the "Generate" button to use the AI to create an optimized timetable based on all your setup data and constraints. This process may take a few moments.</p>
            </SectionCard>
            <ErrorDisplay message={error} />
            {generationResult && (
                <SectionCard title="Generated Timetable Preview" actions={
                    <div className="flex gap-2">
                         <button onClick={downloadAsExcel} className="flex items-center gap-1 text-sm bg-gray-100 dark:bg-slate-700 font-semibold px-3 py-1.5 rounded-md"><DownloadIcon />Download as Excel</button>
                         <button onClick={onSave} className="flex items-center gap-1 text-sm bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300 font-semibold px-3 py-1.5 rounded-md"><SaveIcon />Save & Publish</button>
                         <button onClick={onClear} className="flex items-center gap-1 text-sm bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300 font-semibold px-3 py-1.5 rounded-md"><DeleteIcon />Clear</button>
                    </div>
                }>
                    <div className="overflow-x-auto max-h-[80vh]">
                        <table className="w-full text-sm">
                             <thead>
                                <tr>
                                    <th className="p-2 border dark:border-slate-600 bg-gray-50 dark:bg-slate-700">Time</th>
                                    {DAYS.map(day => <th key={day} className="p-2 border dark:border-slate-600 bg-gray-50 dark:bg-slate-700 capitalize">{day}</th>)}
                                </tr>
                            </thead>
                            <tbody>
                                {TIME_SLOTS.map(time => (
                                    <tr key={time}>
                                        <td className="p-2 border dark:border-slate-600 font-medium">{time}</td>
                                        {DAYS.map(day => (
                                            <td key={day} className={`p-1 border dark:border-slate-600 align-top ${time === lunchSlot ? 'bg-gray-100 dark:bg-slate-900/50' : ''}`}>
                                                {time === lunchSlot ? <div className="text-center font-semibold p-2">Lunch</div> :
                                                    generationResult.filter(e => e.day === day && e.time === time).map((entry, idx) => (
                                                        <div key={idx} className="p-2 rounded-lg bg-indigo-500 text-white text-xs mb-1">
                                                            <p className="font-bold">{entry.className}</p>
                                                            <p>{entry.subject}</p>
                                                            <p className="opacity-80">{entry.faculty}</p>
                                                            <p className="opacity-80">Room: {entry.room}</p>
                                                        </div>
                                                    ))
                                                }
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </SectionCard>
            )}
        </div>
    );
};
const ViewTab = ({ students, classes, faculty }: { students: Student[], classes: Class[], faculty: Faculty[] }) => (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PlaceholderContent title="Detailed View" message="This section will provide detailed views and analytics for the generated timetable. Feature is under development." icon={<ViewIcon />} />
        <PlaceholderContent title="Analytics" message="This section will provide analytics on faculty load, room utilization, and student schedules. Feature is under development." icon={<AnalyticsIcon />} />
    </div>
);

export const TimetableScheduler = (props: TimetableSchedulerProps) => {
    const { classes, faculty, subjects, rooms, constraints, setConstraints, onSaveEntity, onDeleteEntity, onResetData, token, onSaveTimetable } = props;
    const [activeTab, setActiveTab] = useState('setup');
    const [modal, setModal] = useState<{ mode: 'add' | 'edit'; type: EntityType; data: Entity | null } | null>(null);
    const [pageError, setPageError] = useState<string | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [generationError, setGenerationError] = useState<string | null>(null);
    const [generatedTimetable, setGeneratedTimetable] = useState<TimetableEntry[] | null>(null);
    const [selectedItems, setSelectedItems] = useState<{ [key in EntityType]: string[] }>({ class: [], faculty: [], subject: [], room: [] });
    const [importModalState, setImportModalState] = useState<{ isOpen: boolean; type?: EntityType }>({ isOpen: false });

    const openImportModal = (type?: EntityType) => setImportModalState({ isOpen: true, type });

    const handleSave = async (type: EntityType, data: Entity) => {
        setPageError(null);
        try {
            await onSaveEntity(type, data);
            setModal(null);
        } catch (error) {
            setPageError(error instanceof Error ? error.message : "An unknown error occurred.");
        }
    };
    const handleDelete = async (type: EntityType, id: string) => { if (window.confirm('Are you sure?')) await onDeleteEntity(type, id); };
    const handleResetData = async () => { if (window.confirm('Are you sure you want to reset ALL data to the initial defaults? This cannot be undone.')) await onResetData(); };
    
    const handleToggleSelect = (type: EntityType, id: string) => {
        setSelectedItems(prev => ({ ...prev, [type]: prev[type].includes(id) ? prev[type].filter(i => i !== id) : [...prev[type], id] }));
    };
    const handleToggleSelectAll = (type: EntityType, displayedItems: any[]) => {
        const ids = displayedItems.map(item => item.id);
        const allSelected = ids.every(id => selectedItems[type].includes(id));
        if (allSelected) {
            setSelectedItems(prev => ({ ...prev, [type]: prev[type].filter(i => !ids.includes(i)) }));
        } else {
            setSelectedItems(prev => ({ ...prev, [type]: [...new Set([...prev[type], ...ids])] }));
        }
    };

    const handleGenerate = useCallback(async () => {
        setIsGenerating(true);
        setGenerationError(null);
        try {
            if (!constraints) throw new Error("Constraints are not loaded.");
            const result = await generateTimetable(classes, faculty, subjects, rooms, constraints, token);
            setGeneratedTimetable(result);
        } catch (error) {
            setGenerationError(error instanceof Error ? error.message : "An unknown error occurred.");
        } finally {
            setIsGenerating(false);
        }
    }, [classes, faculty, subjects, rooms, constraints, token]);

    const handleSaveTimetable = async () => {
        if (!generatedTimetable) return;
        try {
            await onSaveTimetable(generatedTimetable);
            alert("Timetable saved and published successfully!");
        } catch (error) {
            setGenerationError(error instanceof Error ? error.message : "Failed to save the timetable.");
        }
    };
    
    const tabs = [
        { key: 'setup', label: 'Setup', icon: <SetupIcon /> },
        { key: 'constraints', label: 'Constraints', icon: <ConstraintsIcon /> },
        { key: 'generate', label: 'Generate', icon: <GenerateIcon /> },
        { key: 'view', label: 'View & Analytics', icon: <ViewIcon /> },
    ];
    
    const renderContent = () => {
        switch (activeTab) {
            case 'setup': return <SetupTab {...props} onUpdateConstraints={setConstraints} openModal={(m, t, d) => setModal({ mode: m, type: t, data: d || null })} handleDelete={handleDelete} handleResetData={handleResetData} selectedItems={selectedItems} onToggleSelect={handleToggleSelect} onToggleSelectAll={handleToggleSelectAll} onInitiateBulkDelete={() => {}} pageError={pageError} openImportModal={openImportModal} />;
            case 'constraints': return <ConstraintsTab {...props} />;
            case 'generate': return <GenerateTab onGenerate={handleGenerate} onSave={handleSaveTimetable} generationResult={generatedTimetable} isLoading={isGenerating} error={generationError} onClear={() => setGeneratedTimetable(null)} constraints={constraints} />;
            case 'view': return <ViewTab {...props} />;
            default: return null;
        }
    };
    
    const forms: { [key in EntityType]: React.FC<any> } = { class: ClassForm, faculty: FacultyForm, subject: SubjectForm, room: RoomForm };
    const FormComponent = modal ? forms[modal.type] : null;

    return (
        <div className="min-h-screen p-4 sm:p-6 lg:p-8">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <div>
                    <h1 className="text-3xl font-bold">Timetable Scheduler</h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">AI-Powered Scheduling and Management</p>
                </div>
                <button onClick={handleResetData} className="bg-red-500/10 text-red-700 dark:text-red-300 font-semibold text-sm py-2 px-4 rounded-lg">Reset All Data</button>
            </header>
            <nav className="bg-white dark:bg-slate-800 border dark:border-slate-700 p-2 rounded-xl flex flex-wrap gap-2 mb-8">
                {tabs.map(tab => (
                    <button key={tab.key} onClick={() => setActiveTab(tab.key)} className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-md transition-colors ${activeTab === tab.key ? 'bg-indigo-600 text-white' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-700'}`}>
                        {tab.icon}{tab.label}
                    </button>
                ))}
            </nav>
            <main className="space-y-6">
                {renderContent()}
            </main>
            {modal && FormComponent && (
                <Modal isOpen={!!modal} onClose={() => setModal(null)} title={`${modal.mode === 'add' ? 'Add' : 'Edit'} ${modal.type}`} error={pageError}>
                    <FormComponent initialData={modal.data} onSave={(data: Entity) => handleSave(modal.type, data)} faculty={faculty} constraints={constraints} />
                </Modal>
            )}
             <DataManagementModal isOpen={importModalState.isOpen} onClose={() => setImportModalState({isOpen: false})} initialEntityType={importModalState.type} />
        </div>
    );
};