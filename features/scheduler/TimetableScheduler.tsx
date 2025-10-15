import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { AddIcon, BackIcon, ConstraintsIcon, DeleteIcon, DownloadIcon, EditIcon, GenerateIcon, LoadingIcon, LogoutIcon, MoonIcon, SaveIcon, SetupIcon, SunIcon, ViewIcon, SearchIcon } from '../../components/Icons';
import { DAYS, TIME_SLOTS } from '../../constants';
import { generateTimetable } from '../../services/geminiService';
import { Class, Constraints, Faculty, Room, Subject, TimetableEntry, Student, ClassSpecificConstraint } from '../../types';

type EntityType = 'class' | 'faculty' | 'subject' | 'room';
type Entity = Class | Faculty | Subject | Room;

interface TimetableSchedulerProps {
    onLogout: () => void;
    theme: string;
    toggleTheme: () => void;
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

const ErrorDisplay = ({ message }: { message: string | null }) => !message ? null : React.createElement("div", { className: "bg-red-500/10 dark:bg-red-900/50 border border-red-500/50 text-red-700 dark:text-red-300 p-3 rounded-md text-sm my-2", role: "alert" }, message);
const SectionCard = ({ title, children, actions }: { title: string; children?: React.ReactNode; actions?: React.ReactNode; }) => (React.createElement("div", { className: "bg-white/80 dark:bg-slate-800/50 backdrop-blur-lg border border-gray-200 dark:border-slate-700 p-6 rounded-2xl shadow-md mb-6" }, React.createElement("div", { className: "flex justify-between items-center border-b border-gray-200 dark:border-slate-700 pb-3 mb-4" }, React.createElement("h3", { className: "text-xl font-bold" }, title), actions && React.createElement("div", null, actions)), ...React.Children.toArray(children)));
const DataTable = <T extends { id: string }>({ headers, data, renderRow, emptyMessage = "No data available.", headerPrefix = null }: { headers: string[]; data: T[]; renderRow: (item: T) => React.ReactNode; emptyMessage?: string; headerPrefix?: React.ReactNode; }) => (React.createElement("div", { className: "overflow-x-auto" }, React.createElement("table", { className: "w-full text-sm text-left" }, React.createElement("thead", { className: "bg-gray-100 dark:bg-slate-900/50 text-gray-500 uppercase text-xs" }, React.createElement("tr", null, headerPrefix, headers.map(h => React.createElement("th", { key: h, className: "px-6 py-3" }, h)))), React.createElement("tbody", { className: "text-gray-700 dark:text-gray-300" }, data.length > 0 ? data.map(renderRow) : React.createElement("tr", null, React.createElement("td", { colSpan: headers.length + (headerPrefix ? 1 : 0), className: "text-center p-8 text-gray-500" }, emptyMessage))))));
const Modal = ({ isOpen, onClose, title, children = null, error = null }: { isOpen: boolean; onClose: () => void; title: string; children?: React.ReactNode; error?: string | null; }) => !isOpen ? null : (React.createElement("div", { className: "fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" }, React.createElement("div", { className: "bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] flex flex-col" }, React.createElement("div", { className: "flex justify-between items-center p-4 border-b dark:border-slate-700" }, React.createElement("h2", { className: "text-lg font-bold" }, title), React.createElement("button", { onClick: onClose, className: "text-gray-400" }, React.createElement("svg", { xmlns: "http://www.w3.org/2000/svg", className: "h-6 w-6", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor" }, React.createElement("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M6 18L18 6M6 6l12 12" })))), React.createElement("div", { className: "p-6 overflow-y-auto" }, React.createElement(ErrorDisplay, { message: error }), children))));
const FormField = ({ label, children = null }: { label: string, children?: React.ReactNode }) => React.createElement("div", { className: "mb-4" }, React.createElement("label", { className: "block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300" }, label), children);
const TextInput = (props: React.InputHTMLAttributes<HTMLInputElement>) => React.createElement("input", { ...props, className: "w-full p-2 border dark:border-slate-600 bg-gray-50 dark:bg-slate-700 rounded-md text-gray-900 dark:text-gray-100" });
const SelectInput = (props: React.SelectHTMLAttributes<HTMLSelectElement>) => React.createElement("select", { ...props, className: "w-full p-2 border dark:border-slate-600 bg-gray-50 dark:bg-slate-700 rounded-md text-gray-900 dark:text-gray-100" });
const SearchInput = ({ value, onChange, placeholder }: { value: string, onChange: (v: string) => void, placeholder?: string }) => (React.createElement("div", { className: "relative mb-4" }, React.createElement(SearchIcon, { className: "absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" }), React.createElement("input", { type: "text", value: value, onChange: (e) => onChange(e.target.value), placeholder: placeholder || "Search...", className: "w-full p-2 pl-10 border dark:border-slate-600 bg-gray-50 dark:bg-slate-900/50 rounded-md focus:ring-2 focus:ring-indigo-500" })));
const ClassForm = ({ initialData, onSave }: { initialData: Class | null; onSave: (data: any) => Promise<void>; }) => { const [data, setData] = useState(initialData || { id: '', name: '', branch: '', year: 1, section: '', studentCount: 0 }); const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => setData({ ...data, [e.target.name]: e.target.type === 'number' ? parseInt(e.target.value, 10) : e.target.value }); return React.createElement("form", { onSubmit: (e) => { e.preventDefault(); onSave(data); } }, React.createElement(FormField, { label: "Name" }, React.createElement(TextInput, { name: "name", value: data.name, onChange: handleChange, required: true })), React.createElement(FormField, { label: "Branch" }, React.createElement(TextInput, { name: "branch", value: data.branch, onChange: handleChange, required: true })), React.createElement(FormField, { label: "Year" }, React.createElement(TextInput, { type: "number", name: "year", value: data.year, onChange: handleChange, required: true, min: 1 })), React.createElement(FormField, { label: "Section" }, React.createElement(TextInput, { name: "section", value: data.section, onChange: handleChange, required: true })), React.createElement(FormField, { label: "Student Count" }, React.createElement(TextInput, { type: "number", name: "studentCount", value: data.studentCount, onChange: handleChange, required: true, min: 1 })), React.createElement("button", { type: "submit", className: "w-full mt-4 bg-indigo-600 text-white font-bold py-2 px-4 rounded-lg flex items-center justify-center gap-2" }, React.createElement(SaveIcon, null), "Save")); };
const FacultyForm = ({ initialData, onSave }: { initialData: Faculty | null; onSave: (data: any) => Promise<void>; }) => { const [data, setData] = useState(initialData ? { ...initialData, specialization: initialData.specialization.join(', '), email: initialData.email || '' } : { id: '', name: '', department: '', specialization: '', email: '' }); const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => setData({ ...data, [e.target.name]: e.target.value }); const handleSave = (e: React.FormEvent) => { e.preventDefault(); onSave({ ...data, specialization: data.specialization.split(',').map(s => s.trim()).filter(Boolean) }); }; return React.createElement("form", { onSubmit: handleSave }, React.createElement(FormField, { label: "Name" }, React.createElement(TextInput, { name: "name", value: data.name, onChange: handleChange, required: true })), React.createElement(FormField, { label: "Email" }, React.createElement(TextInput, { type: "email", name: "email", value: data.email, onChange: handleChange, required: true })), React.createElement(FormField, { label: "Department" }, React.createElement(TextInput, { name: "department", value: data.department, onChange: handleChange, required: true })), React.createElement(FormField, { label: "Specializations (comma-separated)" }, React.createElement(TextInput, { name: "specialization", value: data.specialization, onChange: handleChange })), React.createElement("button", { type: "submit", className: "w-full mt-4 bg-indigo-600 text-white font-bold py-2 px-4 rounded-lg flex items-center justify-center gap-2" }, React.createElement(SaveIcon, null), "Save")); };
const SubjectForm = ({ initialData, onSave, faculty }: { initialData: Subject | null; onSave: (data: any) => Promise<void>; faculty: Faculty[]; }) => { const [data, setData] = useState(initialData || { id: '', name: '', code: '', type: 'theory', hoursPerWeek: 3, assignedFacultyId: '' }); const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setData({ ...data, [e.target.name]: e.target.type === 'number' ? parseInt(e.target.value, 10) : e.target.value }); return React.createElement("form", { onSubmit: (e) => { e.preventDefault(); onSave(data); } }, React.createElement(FormField, { label: "Name" }, React.createElement(TextInput, { name: "name", value: data.name, onChange: handleChange, required: true })), React.createElement(FormField, { label: "Code" }, React.createElement(TextInput, { name: "code", value: data.code, onChange: handleChange, required: true })), React.createElement(FormField, { label: "Type" }, React.createElement(SelectInput, { name: "type", value: data.type, onChange: handleChange }, React.createElement("option", { value: "theory" }, "Theory"), React.createElement("option", { value: "lab" }, "Lab"))), React.createElement(FormField, { label: "Hours/Week" }, React.createElement(TextInput, { type: "number", name: "hoursPerWeek", value: data.hoursPerWeek, onChange: handleChange, required: true, min: 1 })), React.createElement(FormField, { label: "Assigned Faculty" }, React.createElement(SelectInput, { name: "assignedFacultyId", value: data.assignedFacultyId, onChange: handleChange, required: true }, React.createElement("option", { value: "", disabled: true }, "Select..."), ...faculty.map(f => React.createElement("option", { key: f.id, value: f.id }, f.name)))), React.createElement("button", { type: "submit", className: "w-full mt-4 bg-indigo-600 text-white font-bold py-2 px-4 rounded-lg flex items-center justify-center gap-2" }, React.createElement(SaveIcon, null), "Save")); };
const RoomForm = ({ initialData, onSave }: { initialData: Room | null; onSave: (data: any) => Promise<void>; }) => { const [data, setData] = useState(initialData || { id: '', number: '', type: 'classroom', capacity: 0 }); const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setData({ ...data, [e.target.name]: e.target.type === 'number' ? parseInt(e.target.value, 10) : e.target.value }); return React.createElement("form", { onSubmit: (e) => { e.preventDefault(); onSave(data); } }, React.createElement(FormField, { label: "Number" }, React.createElement(TextInput, { name: "number", value: data.number, onChange: handleChange, required: true })), React.createElement(FormField, { label: "Type" }, React.createElement(SelectInput, { name: "type", value: data.type, onChange: handleChange }, React.createElement("option", { value: "classroom" }, "Classroom"), React.createElement("option", { value: "lab" }, "Lab"))), React.createElement(FormField, { label: "Capacity" }, React.createElement(TextInput, { type: "number", name: "capacity", value: data.capacity, onChange: handleChange, required: true, min: 1 })), React.createElement("button", { type: "submit", className: "w-full mt-4 bg-indigo-600 text-white font-bold py-2 px-4 rounded-lg flex items-center justify-center gap-2" }, React.createElement(SaveIcon, null), "Save")); };
const HeaderCheckbox = <T extends { id: string }>({ type, items, selectedItems, onToggleSelectAll }: { type: EntityType; items: T[]; selectedItems: { [key in EntityType]: string[] }; onToggleSelectAll: (type: EntityType, items: T[]) => void; }) => { const checkboxRef = useRef<HTMLInputElement>(null); const visibleIds = useMemo(() => items.map(item => item.id), [items]); const selectedVisibleIds = useMemo(() => visibleIds.filter(id => (selectedItems[type] || []).includes(id)), [visibleIds, selectedItems, type]); const isAllSelected = visibleIds.length > 0 && selectedVisibleIds.length === visibleIds.length; const isSomeSelected = selectedVisibleIds.length > 0 && selectedVisibleIds.length < visibleIds.length; useEffect(() => { if (checkboxRef.current) { checkboxRef.current.indeterminate = isSomeSelected; } }, [isSomeSelected]); return (React.createElement("th", { className: "px-4 py-3" }, React.createElement("input", { type: "checkbox", ref: checkboxRef, className: "h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500", checked: isAllSelected, onChange: () => onToggleSelectAll(type, items) }))); };

const SetupTab = ({ classes, faculty, subjects, rooms, openModal, handleDelete, handleResetData, selectedItems, onToggleSelect, onToggleSelectAll, onInitiateBulkDelete, pageError }: { classes: Class[]; faculty: Faculty[]; subjects: Subject[]; rooms: Room[]; openModal: (mode: 'add' | 'edit', type: EntityType, data?: Entity | null) => void; handleDelete: (type: EntityType, id: string) => Promise<void>; handleResetData: () => Promise<void>; selectedItems: { [key in EntityType]: string[] }; onToggleSelect: (type: EntityType, id: string) => void; onToggleSelectAll: (type: EntityType, displayedItems: any[]) => void; onInitiateBulkDelete: (type: EntityType) => void; pageError: string | null; }) => {
    const [search, setSearch] = useState({ class: '', faculty: '', subject: '', room: '' });
    const handleSearch = (type: EntityType, value: string) => setSearch(prev => ({ ...prev, [type]: value }));
    // FIX: Made filter function generic to preserve type information
    const filter = <T extends object>(data: T[], query: string) => data.filter(item => Object.values(item).some(val => String(val).toLowerCase().includes(query.toLowerCase())));
    const filtered = { class: filter(classes, search.class), faculty: filter(faculty, search.faculty), subject: filter(subjects, search.subject), room: filter(rooms, search.room) };
    const facultyMap = useMemo(() => Object.fromEntries(faculty.map(f => [f.id, f.name])), [faculty]);

    return React.createElement(React.Fragment, null,
        React.createElement(ErrorDisplay, { message: pageError }),
        React.createElement("div", { className: "grid grid-cols-1 lg:grid-cols-2 gap-6" },
            React.createElement(SectionCard, { title: "Classes & Sections", actions: React.createElement("button", { onClick: () => openModal('add', 'class'), className: "flex items-center gap-1 text-sm bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-300 font-semibold px-3 py-1.5 rounded-md" }, React.createElement(AddIcon, null), "Add Class") }, React.createElement(SearchInput, { value: search.class, onChange: v => handleSearch('class', v), placeholder: "Search classes..." }), React.createElement(DataTable, { headers: ["Name", "Branch", "Year", "Section", "Students", "Actions"], data: filtered.class, renderRow: (c) => React.createElement("tr", { key: c.id, className: "border-b dark:border-slate-700" }, React.createElement("td", { className: "px-4 py-3" }, React.createElement("input", { type: "checkbox", className: "h-4 w-4", checked: selectedItems.class.includes(c.id), onChange: () => onToggleSelect('class', c.id) })), React.createElement("td", { className: "px-6 py-3 font-medium" }, c.name), React.createElement("td", { className: "px-6 py-3" }, c.branch), React.createElement("td", { className: "px-6 py-3" }, c.year), React.createElement("td", { className: "px-6 py-3" }, c.section), React.createElement("td", { className: "px-6 py-3" }, c.studentCount), React.createElement("td", { className: "px-6 py-3 flex gap-2" }, React.createElement("button", { onClick: () => openModal('edit', 'class', c) }, React.createElement(EditIcon, null)), React.createElement("button", { onClick: () => handleDelete('class', c.id) }, React.createElement(DeleteIcon, null)))), headerPrefix: React.createElement(HeaderCheckbox, { type: "class", items: filtered.class, selectedItems, onToggleSelectAll }) })),
            React.createElement(SectionCard, { title: "Faculty", actions: React.createElement("button", { onClick: () => openModal('add', 'faculty'), className: "flex items-center gap-1 text-sm bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-300 font-semibold px-3 py-1.5 rounded-md" }, React.createElement(AddIcon, null), "Add Faculty") }, React.createElement(SearchInput, { value: search.faculty, onChange: v => handleSearch('faculty', v), placeholder: "Search faculty..." }), React.createElement(DataTable, { headers: ["Name", "Department", "Specialization", "Actions"], data: filtered.faculty, renderRow: (f) => React.createElement("tr", { key: f.id, className: "border-b dark:border-slate-700" }, React.createElement("td", { className: "px-4 py-3" }, React.createElement("input", { type: "checkbox", className: "h-4 w-4", checked: selectedItems.faculty.includes(f.id), onChange: () => onToggleSelect('faculty', f.id) })), React.createElement("td", { className: "px-6 py-3 font-medium" }, f.name), React.createElement("td", { className: "px-6 py-3" }, f.department), React.createElement("td", { className: "px-6 py-3" }, f.specialization.join(', ')), React.createElement("td", { className: "px-6 py-3 flex gap-2" }, React.createElement("button", { onClick: () => openModal('edit', 'faculty', f) }, React.createElement(EditIcon, null)), React.createElement("button", { onClick: () => handleDelete('faculty', f.id) }, React.createElement(DeleteIcon, null)))), headerPrefix: React.createElement(HeaderCheckbox, { type: "faculty", items: filtered.faculty, selectedItems, onToggleSelectAll }) })),
            React.createElement(SectionCard, { title: "Subjects", actions: React.createElement("button", { onClick: () => openModal('add', 'subject'), className: "flex items-center gap-1 text-sm bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-300 font-semibold px-3 py-1.5 rounded-md" }, React.createElement(AddIcon, null), "Add Subject") }, React.createElement(SearchInput, { value: search.subject, onChange: v => handleSearch('subject', v), placeholder: "Search subjects..." }), React.createElement(DataTable, { headers: ["Name", "Code", "Type", "Hrs/Week", "Faculty", "Actions"], data: filtered.subject, renderRow: (s) => React.createElement("tr", { key: s.id, className: "border-b dark:border-slate-700" }, React.createElement("td", { className: "px-4 py-3" }, React.createElement("input", { type: "checkbox", className: "h-4 w-4", checked: selectedItems.subject.includes(s.id), onChange: () => onToggleSelect('subject', s.id) })), React.createElement("td", { className: "px-6 py-3 font-medium" }, s.name), React.createElement("td", { className: "px-6 py-3" }, s.code), React.createElement("td", { className: "px-6 py-3" }, s.type), React.createElement("td", { className: "px-6 py-3" }, s.hoursPerWeek), React.createElement("td", { className: "px-6 py-3" }, facultyMap[s.assignedFacultyId] || 'N/A'), React.createElement("td", { className: "px-6 py-3 flex gap-2" }, React.createElement("button", { onClick: () => openModal('edit', 'subject', s) }, React.createElement(EditIcon, null)), React.createElement("button", { onClick: () => handleDelete('subject', s.id) }, React.createElement(DeleteIcon, null)))), headerPrefix: React.createElement(HeaderCheckbox, { type: "subject", items: filtered.subject, selectedItems, onToggleSelectAll }) })),
            React.createElement(SectionCard, { title: "Rooms", actions: React.createElement("button", { onClick: () => openModal('add', 'room'), className: "flex items-center gap-1 text-sm bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-300 font-semibold px-3 py-1.5 rounded-md" }, React.createElement(AddIcon, null), "Add Room") }, React.createElement(SearchInput, { value: search.room, onChange: v => handleSearch('room', v), placeholder: "Search rooms..." }), React.createElement(DataTable, { headers: ["Number", "Type", "Capacity", "Actions"], data: filtered.room, renderRow: (r) => React.createElement("tr", { key: r.id, className: "border-b dark:border-slate-700" }, React.createElement("td", { className: "px-4 py-3" }, React.createElement("input", { type: "checkbox", className: "h-4 w-4", checked: selectedItems.room.includes(r.id), onChange: () => onToggleSelect('room', r.id) })), React.createElement("td", { className: "px-6 py-3 font-medium" }, r.number), React.createElement("td", { className: "px-6 py-3" }, r.type), React.createElement("td", { className: "px-6 py-3" }, r.capacity), React.createElement("td", { className: "px-6 py-3 flex gap-2" }, React.createElement("button", { onClick: () => openModal('edit', 'room', r) }, React.createElement(EditIcon, null)), React.createElement("button", { onClick: () => handleDelete('room', r.id) }, React.createElement(DeleteIcon, null)))), headerPrefix: React.createElement(HeaderCheckbox, { type: "room", items: filtered.room, selectedItems, onToggleSelectAll }) }))
        )
    );
};
const ConstraintsTab = ({ constraints, onConstraintsChange, classes, subjects, faculty }: { constraints: Constraints; onConstraintsChange: (newConstraints: Constraints) => void; classes: Class[]; subjects: Subject[]; faculty: Faculty[]; }) => {
    const handleGlobalChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        onConstraintsChange({ ...constraints, [e.target.name]: e.target.type === 'number' ? parseInt(e.target.value, 10) : e.target.value });
    };
    return React.createElement(React.Fragment, null,
        React.createElement(SectionCard, { title: "Global Constraints" },
            React.createElement("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-6" },
                React.createElement(FormField, { label: "Max Consecutive Classes" }, React.createElement(TextInput, { type: "number", name: "maxConsecutiveClasses", value: constraints.maxConsecutiveClasses, onChange: handleGlobalChange })),
                React.createElement(FormField, { label: "Lunch Break Slot" }, React.createElement(SelectInput, { name: "lunchBreak", value: constraints.lunchBreak, onChange: handleGlobalChange }, TIME_SLOTS.map(ts => React.createElement("option", { key: ts, value: ts }, ts))))
            )
        )
        // NOTE: UI for class-specific constraints can be added here
    );
};
const GenerateTab = ({ onGenerate, isLoading, error, loadingMessage }: { onGenerate: () => void; isLoading: boolean; error: string | null; loadingMessage: string; }) => (React.createElement("div", { className: "text-center bg-white/80 dark:bg-slate-800/50 p-8 rounded-2xl shadow-lg max-w-2xl mx-auto" }, React.createElement("h3", { className: "text-2xl font-bold" }, "Generate Timetable"), React.createElement("p", { className: "text-gray-500 my-4" }, "Click below to use the AI to generate a timetable based on your setup and constraints."), error && React.createElement("div", { className: "bg-red-500/10 border-red-500/50 text-red-700 px-4 py-3 rounded-lg text-left my-4" }, React.createElement("p", { className: "font-bold mb-1" }, "Generation Failed"), React.createElement("p", { className: "text-sm" }, "The AI scheduler encountered a problem. Please review your data and constraints, and try again."), React.createElement("p", { className: "text-xs mt-2 font-mono bg-red-200/50 dark:bg-red-900/50 p-2 rounded" }, error)), React.createElement("button", { onClick: onGenerate, disabled: isLoading, className: "w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 px-8 rounded-lg flex items-center justify-center gap-3 disabled:bg-indigo-400" }, isLoading ? React.createElement(React.Fragment, null, React.createElement(LoadingIcon, null), loadingMessage) : React.createElement(React.Fragment, null, React.createElement(GenerateIcon, null), "Start AI Generation"))));
const ViewTab = ({ timetable, classes }: { timetable: TimetableEntry[]; classes: Class[] }) => {
    const [selectedClass, setSelectedClass] = useState(classes[0]?.name || 'All');
    const filteredTimetable = useMemo(() => selectedClass === 'All' ? timetable : timetable.filter(e => e.className === selectedClass), [timetable, selectedClass]);

    const downloadCSV = () => {
        const headers = "Day,Time,Class,Subject,Faculty,Room,Type";
        const rows = filteredTimetable.map(e => [e.day, e.time, e.className, e.subject, e.faculty, e.room, e.type].join(','));
        const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].join("\n");
        const link = document.createElement("a");
        link.setAttribute("href", encodeURI(csvContent));
        link.setAttribute("download", `timetable_${selectedClass.replace(/\s+/g, '_')}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    if (timetable.length === 0) return React.createElement(SectionCard, { title: "View Timetable" }, React.createElement("p", null, "No timetable has been generated yet."));

    return React.createElement(SectionCard, { title: "Generated Timetable" },
        React.createElement("div", { className: "flex justify-between items-center mb-4" },
            React.createElement("div", null, React.createElement("label", { className: "mr-2" }, "Select Class:"), React.createElement(SelectInput, { value: selectedClass, onChange: e => setSelectedClass(e.target.value) }, React.createElement("option", { value: "All" }, "All Classes"), ...classes.map(c => React.createElement("option", { key: c.id, value: c.name }, c.name)))),
            React.createElement("button", { onClick: downloadCSV, className: "flex items-center gap-2 bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg" }, React.createElement(DownloadIcon, null), "Download CSV")
        ),
        React.createElement("div", { className: "overflow-x-auto" },
            React.createElement("table", { className: "w-full border-collapse text-sm" },
                React.createElement("thead", null, React.createElement("tr", null, React.createElement("th", { className: "p-3 font-semibold text-left text-gray-600 dark:text-gray-300 border-b-2 dark:border-slate-700" }, "Time"), DAYS.map(day => React.createElement("th", { key: day, className: "p-3 font-semibold text-center capitalize text-gray-600 dark:text-gray-300 border-b-2 dark:border-slate-700" }, day)))),
                React.createElement("tbody", null, TIME_SLOTS.map(time => (
                    React.createElement("tr", { key: time, className: "dark:text-gray-200" },
                        React.createElement("td", { className: "p-3 font-medium border-b dark:border-slate-700 whitespace-nowrap" }, time),
                        DAYS.map(day => {
                            const entries = filteredTimetable.filter(e => e.day.toLowerCase() === day.toLowerCase() && e.time === time);
                            return React.createElement("td", { key: day, className: "p-1 border-b dark:border-slate-700 align-top" },
                                entries.length > 0 ? entries.map((entry, i) => React.createElement("div", { key: i, className: "p-2 rounded-lg text-white text-xs bg-indigo-500 mb-1" },
                                    React.createElement("div", { className: "font-bold" }, entry.subject),
                                    React.createElement("div", { className: "opacity-80" }, selectedClass === 'All' ? entry.className : entry.faculty),
                                    React.createElement("div", { className: "opacity-80" }, "Room: ", entry.room)
                                )) : (time === '12:50-01:35' ? React.createElement("div", { className: "text-center text-gray-400 text-xs py-2" }, "Lunch") : null)
                            );
                        })
                    )
                )))
            )
        )
    );
};

export const TimetableScheduler = ({ onLogout, theme, toggleTheme, classes, faculty, subjects, rooms, students, constraints, setConstraints, onSaveEntity, onDeleteEntity, onResetData, token, onSaveTimetable }: TimetableSchedulerProps) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('setup');
  const [timetable, setTimetable] = useState<TimetableEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);
  const [loadingMessage, setLoadingMessage] = useState("Initializing AI generation...");
  const [modalState, setModalState] = useState<{ isOpen: boolean, mode: 'add' | 'edit', type: EntityType | '', data: Entity | null, error: string | null }>({ isOpen: false, mode: 'add', type: '', data: null, error: null });
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
      case 'class': return React.createElement(Modal, { isOpen, onClose: closeModal, title, error: modalError }, React.createElement(ClassForm, { initialData: data as Class | null, onSave: (d) => handleSave(type, d) }));
      case 'faculty': return React.createElement(Modal, { isOpen, onClose: closeModal, title, error: modalError }, React.createElement(FacultyForm, { initialData: data as Faculty | null, onSave: (d) => handleSave(type, d) }));
      case 'subject': return React.createElement(Modal, { isOpen, onClose: closeModal, title, error: modalError }, React.createElement(SubjectForm, { initialData: data as Subject | null, onSave: (d) => handleSave(type, d), faculty: faculty }));
      case 'room': return React.createElement(Modal, { isOpen, onClose: closeModal, title, error: modalError }, React.createElement(RoomForm, { initialData: data as Room | null, onSave: (d) => handleSave(type, d) }));
      default: return null;
    }
  };
  
  const renderContent = () => {
    switch (activeTab) {
      case 'setup': return React.createElement(SetupTab, { classes, faculty, subjects, rooms, openModal, handleDelete, handleResetData: onResetData, selectedItems, onToggleSelect: handleToggleSelect, onToggleSelectAll: handleToggleSelectAll, onInitiateBulkDelete: handleInitiateBulkDelete, pageError });
      case 'constraints': return constraints ? React.createElement(ConstraintsTab, { constraints, onConstraintsChange: setConstraints, classes, subjects, faculty }) : React.createElement(LoadingIcon, null);
      case 'generate': return React.createElement(GenerateTab, { onGenerate: handleInitiateGenerate, isLoading, error, loadingMessage });
      case 'view': return React.createElement(ViewTab, { timetable, classes });
      default: return null;
    }
  };

  const TabButton = ({ tab, label, icon }: { tab: string, label: string, icon: React.ReactNode }) => (React.createElement("button", { onClick: () => setActiveTab(tab), className: `flex items-center gap-2 px-4 py-3 text-sm font-semibold rounded-lg transition-all ${activeTab === tab ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200/50 dark:hover:bg-slate-700'}` }, icon, label));

  return (
    React.createElement("div", { className: "min-h-screen p-4 sm:p-6 lg:p-8" },
      renderModalContent(),
       React.createElement(Modal, {
            isOpen: !!confirmAction,
            onClose: () => setConfirmAction(null),
            title: "Please Confirm"
        },
        confirmAction && React.createElement("div", null,
            React.createElement("p", {className: "mb-4"}, confirmAction.message),
            React.createElement("div", {className: "flex justify-end gap-2"},
                React.createElement("button", {onClick: () => setConfirmAction(null), className: "bg-gray-200 dark:bg-slate-700 py-2 px-4 rounded-lg"}, "Cancel"),
                React.createElement("button", {onClick: confirmAction.onConfirm, className: "bg-indigo-600 text-white py-2 px-4 rounded-lg"}, "Confirm")
            )
        )
      ),
      React.createElement("header", { className: "flex justify-between items-center mb-6" },
         React.createElement("div", null, 
          React.createElement("h1", { className: "text-3xl font-bold" }, "Smart College Timetable Scheduler"),
          React.createElement("p", {className: "text-gray-500 dark:text-gray-400 mt-1"}, "AI-Powered Academic Scheduling for Inter-Course Management")
        ),
        React.createElement("div", { className: "flex gap-2" },
            React.createElement("button", { onClick: toggleTheme, className: "bg-white dark:bg-slate-800 p-2.5 border dark:border-slate-700 rounded-lg" }, theme === 'dark' ? React.createElement(SunIcon, null) : React.createElement(MoonIcon, null)),
            React.createElement("button", { onClick: () => navigate("/"), className: "bg-white dark:bg-slate-800 py-2 px-4 border dark:border-slate-700 rounded-lg flex items-center gap-2" }, React.createElement(BackIcon, null), " Dashboard"),
            React.createElement("button", { onClick: onLogout, className: "bg-white dark:bg-slate-800 py-2 px-4 border dark:border-slate-700 rounded-lg flex items-center gap-2" }, React.createElement(LogoutIcon, null), " Logout")
        )
      ),
      React.createElement("nav", { className: "bg-white/80 dark:bg-slate-800/50 border dark:border-slate-700 p-2 rounded-xl flex justify-between items-center gap-2 mb-8" },
        React.createElement("div", {className: "flex gap-2"}, 
            React.createElement(TabButton, { tab: "setup", label: "Setup", icon: React.createElement(SetupIcon, null) }),
            React.createElement(TabButton, { tab: "constraints", label: "Constraints", icon: React.createElement(ConstraintsIcon, null) }),
            React.createElement(TabButton, { tab: "generate", label: "Generate", icon: React.createElement(GenerateIcon, null) }),
            React.createElement(TabButton, { tab: "view", label: "View Timetable", icon: React.createElement(ViewIcon, null) })
        )
      ),
      React.createElement("main", null, renderContent())
    )
  );
};
