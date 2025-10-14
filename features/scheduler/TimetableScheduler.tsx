import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { AddIcon, BackIcon, ConstraintsIcon, DeleteIcon, DownloadIcon, EditIcon, GenerateIcon, LoadingIcon, LogoutIcon, MoonIcon, SaveIcon, SetupIcon, SunIcon, ViewIcon } from '../../components/Icons';
import { DAYS, TIME_SLOTS } from '../../constants';
import { generateTimetable } from '../../services/geminiService';
import { Class, Constraints, Faculty, Room, Subject, TimetableEntry, Student, ClassSpecificConstraint } from '../../types';

type EntityType = 'class' | 'faculty' | 'subject' | 'room';
type Entity = Class | Faculty | Subject | Room;

// --- Prop Interfaces ---
interface TimetableSchedulerProps {
    onLogout: () => void;
    theme: string;
    toggleTheme: () => void;
    classes: Class[];
    faculty: Faculty[];
    subjects: Subject[];
    rooms: Room[];
    students: Student[];
    constraints: Constraints;
    setConstraints: (c: Constraints) => void;
    onSaveEntity: (type: EntityType | 'student', data: any) => Promise<void>;
    onDeleteEntity: (type: EntityType | 'student', id: string) => Promise<void>;
    onResetData: () => Promise<void>;
    token: string;
}

interface SectionCardProps {
    title: string;
    children?: React.ReactNode;
    actions?: React.ReactNode;
}

interface DataTableProps<T> {
    headers: string[];
    data: T[];
    renderRow: (item: T) => React.ReactNode;
    emptyMessage?: string;
    headerPrefix?: React.ReactNode;
}

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children?: React.ReactNode;
}

interface FormFieldProps {
    label: string;
    children?: React.ReactNode;
}

interface FormProps<T> {
    initialData: T | null;
    onSave: (data: any) => void;
}

interface SubjectFormProps extends FormProps<Subject> {
    faculty: Faculty[];
}

interface HeaderCheckboxProps<T> {
    type: EntityType;
    items: T[];
    selectedItems: { [key in EntityType]: string[] };
    onToggleSelectAll: (type: EntityType, items: T[]) => void;
}

interface SetupTabProps {
    classes: Class[];
    faculty: Faculty[];
    subjects: Subject[];
    rooms: Room[];
    openModal: (mode: 'add' | 'edit', type: EntityType, data?: Entity | null) => void;
    handleDelete: (type: EntityType, id: string) => void;
    handleResetData: () => void;
    selectedItems: { [key in EntityType]: string[] };
    onToggleSelect: (type: EntityType, id: string) => void;
    onToggleSelectAll: (type: EntityType, displayedItems: any[]) => void;
    onInitiateBulkDelete: (type: EntityType) => void;
}

interface ConstraintsTabProps {
    constraints: Constraints;
    onConstraintsChange: (newConstraints: Constraints) => void;
    classes: Class[];
    subjects: Subject[];
    faculty: Faculty[];
}

interface GenerateTabProps {
    onGenerate: () => void;
    isLoading: boolean;
    error: string | null;
}

interface ViewTabProps {
    timetable: TimetableEntry[];
}

interface TabButtonProps {
    tab: string;
    label: string;
    icon: React.ReactNode;
}


const SectionCard = ({ title, children, actions }: SectionCardProps) => (
    React.createElement("div", { className: "bg-white/80 dark:bg-slate-800/50 backdrop-blur-lg border border-gray-200 dark:border-slate-700 p-6 rounded-2xl shadow-md mb-6" },
        React.createElement("div", { className: "flex justify-between items-center border-b border-gray-200 dark:border-slate-700 pb-3 mb-4" },
            React.createElement("h3", { className: "text-xl font-bold text-gray-800 dark:text-gray-100" }, title),
            actions && React.createElement("div", null, actions)
        ),
        ...React.Children.toArray(children)
    )
);

const DataTable = <T extends { id: string }>({ headers, data, renderRow, emptyMessage = "No data available.", headerPrefix = null }: DataTableProps<T>) => (
    React.createElement("div", { className: "overflow-x-auto" },
        React.createElement("table", { className: "w-full text-sm text-left" },
            React.createElement("thead", { className: "bg-gray-100 dark:bg-slate-900/50 text-gray-500 dark:text-gray-400 uppercase text-xs" },
                React.createElement("tr", null,
                    headerPrefix,
                    headers.map(h => React.createElement("th", { key: h, className: "px-6 py-3" }, h))
                )
            ),
            React.createElement("tbody", { className: "text-gray-700 dark:text-gray-200" }, data.length > 0 ? data.map(renderRow) : React.createElement("tr", null, React.createElement("td", { colSpan: headers.length + (headerPrefix ? 1 : 0), className: "text-center p-8 text-gray-500 dark:text-gray-400" }, emptyMessage)))
        )
    )
);

const Modal = ({ isOpen, onClose, title, children = null }: ModalProps) => {
    if (!isOpen) return null;

    return (
        React.createElement("div", { className: "fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4", "aria-modal": true, role: "dialog" },
            React.createElement("div", { className: "bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] flex flex-col" },
                React.createElement("div", { className: "flex justify-between items-center p-4 border-b border-gray-200 dark:border-slate-700" },
                    React.createElement("h2", { className: "text-lg font-bold text-gray-800 dark:text-gray-100" }, title),
                    React.createElement("button", { onClick: onClose, className: "text-gray-400 hover:text-gray-600 dark:hover:text-gray-200" },
                        React.createElement("svg", { xmlns: "http://www.w3.org/2000/svg", className: "h-6 w-6", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor" },
                            React.createElement("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M6 18L18 6M6 6l12 12" })
                        )
                    )
                ),
                React.createElement("div", { className: "p-6 overflow-y-auto" }, children)
            )
        )
    );
};

const FormField = ({ label, children = null }: FormFieldProps) => React.createElement("div", { className: "mb-4" }, React.createElement("label", { className: "block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1" }, label), children);
const TextInput = (props: React.InputHTMLAttributes<HTMLInputElement>) => React.createElement("input", { ...props, className: "w-full p-2 border border-gray-300 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 rounded-md text-gray-800 dark:text-gray-200" });
const SelectInput = (props: React.SelectHTMLAttributes<HTMLSelectElement>) => React.createElement("select", { ...props, className: "w-full p-2 border border-gray-300 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 rounded-md text-gray-800 dark:text-gray-200" });

const SearchInput = ({ value, onChange, placeholder }: { value: string, onChange: (v: string) => void, placeholder?: string }) => (
    React.createElement("div", { className: "relative mb-4" },
        React.createElement("div", { className: "absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none" },
            React.createElement("svg", { className: "h-5 w-5 text-gray-400 dark:text-gray-500", xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 20 20", fill: "currentColor" },
                React.createElement("path", { fillRule: "evenodd", d: "M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z", clipRule: "evenodd" })
            )
        ),
        React.createElement("input", {
            type: "text",
            value: value,
            onChange: (e) => onChange(e.target.value),
            placeholder: placeholder || "Search...",
            className: "w-full p-2 pl-10 border border-gray-300 dark:border-slate-600 bg-gray-50 dark:bg-slate-900/50 rounded-md text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none transition"
        })
    )
);

const ClassForm = ({ initialData, onSave }: FormProps<Class>) => {
    const [data, setData] = useState(initialData || { id: '', name: '', branch: '', year: 1, section: '', studentCount: 0 });
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => setData({ ...data, [e.target.name]: e.target.type === 'number' ? parseInt(e.target.value, 10) : e.target.value });
    return React.createElement("form", { onSubmit: (e) => { e.preventDefault(); onSave(data); } },
        React.createElement(FormField, { label: "Name (e.g., CSE-3-A)" }, React.createElement(TextInput, { type: "text", name: "name", value: data.name, onChange: handleChange, required: true })),
        React.createElement(FormField, { label: "Branch (e.g., CSE)" }, React.createElement(TextInput, { type: "text", name: "branch", value: data.branch, onChange: handleChange, required: true })),
        React.createElement(FormField, { label: "Year" }, React.createElement(TextInput, { type: "number", name: "year", value: data.year, onChange: handleChange, required: true, min: 1 })),
        React.createElement(FormField, { label: "Section" }, React.createElement(TextInput, { type: "text", name: "section", value: data.section, onChange: handleChange, required: true })),
        React.createElement(FormField, { label: "Student Count" }, React.createElement(TextInput, { type: "number", name: "studentCount", value: data.studentCount, onChange: handleChange, required: true, min: 1 })),
        React.createElement("button", { type: "submit", className: "w-full mt-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg flex items-center justify-center gap-2" }, React.createElement(SaveIcon, null), "Save")
    );
};

const FacultyForm = ({ initialData, onSave }: FormProps<Faculty>) => {
    const [data, setData] = useState(initialData ? { ...initialData, specialization: initialData.specialization.join(', '), email: initialData.email || '' } : { id: '', name: '', department: '', specialization: '', email: '' });
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => setData({ ...data, [e.target.name]: e.target.value });
    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({ ...data, specialization: data.specialization.split(',').map(s => s.trim()).filter(Boolean) });
    };
    return React.createElement("form", { onSubmit: handleSave },
        React.createElement(FormField, { label: "Name" }, React.createElement(TextInput, { type: "text", name: "name", value: data.name, onChange: handleChange, required: true })),
        React.createElement(FormField, { label: "Email" }, React.createElement(TextInput, { type: "email", name: "email", value: data.email, onChange: handleChange, required: true, placeholder: "user@example.com" })),
        React.createElement(FormField, { label: "Department" }, React.createElement(TextInput, { type: "text", name: "department", value: data.department, onChange: handleChange, required: true })),
        React.createElement(FormField, { label: "Specializations (comma-separated)" }, React.createElement(TextInput, { type: "text", name: "specialization", value: data.specialization, onChange: handleChange })),
        React.createElement("button", { type: "submit", className: "w-full mt-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg flex items-center justify-center gap-2" }, React.createElement(SaveIcon, null), "Save")
    );
};

const SubjectForm = ({ initialData, onSave, faculty }: SubjectFormProps) => {
    const [data, setData] = useState(initialData || { id: '', name: '', code: '', type: 'theory', hoursPerWeek: 3, assignedFacultyId: '' });
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setData({ ...data, [e.target.name]: e.target.type === 'number' ? parseInt(e.target.value, 10) : e.target.value });
    return React.createElement("form", { onSubmit: (e) => { e.preventDefault(); onSave(data); } },
        React.createElement(FormField, { label: "Name" }, React.createElement(TextInput, { type: "text", name: "name", value: data.name, onChange: handleChange, required: true })),
        React.createElement(FormField, { label: "Code" }, React.createElement(TextInput, { type: "text", name: "code", value: data.code, onChange: handleChange, required: true })),
        React.createElement(FormField, { label: "Type" }, React.createElement(SelectInput, { name: "type", value: data.type, onChange: handleChange }, React.createElement("option", { value: "theory" }, "Theory"), React.createElement("option", { value: "lab" }, "Lab"))),
        React.createElement(FormField, { label: "Hours Per Week" }, React.createElement(TextInput, { type: "number", name: "hoursPerWeek", value: data.hoursPerWeek, onChange: handleChange, required: true, min: 1 })),
        React.createElement(FormField, { label: "Assigned Faculty" }, React.createElement(SelectInput, { name: "assignedFacultyId", value: data.assignedFacultyId, onChange: handleChange, required: true },
            React.createElement("option", { value: "", disabled: true }, "Select Faculty"),
            ...faculty.map(f => React.createElement("option", { key: f.id, value: f.id }, f.name))
        )),
        React.createElement("button", { type: "submit", className: "w-full mt-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg flex items-center justify-center gap-2" }, React.createElement(SaveIcon, null), "Save")
    );
};

const RoomForm = ({ initialData, onSave }: FormProps<Room>) => {
    const [data, setData] = useState(initialData || { id: '', number: '', type: 'classroom', capacity: 0 });
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setData({ ...data, [e.target.name]: e.target.type === 'number' ? parseInt(e.target.value, 10) : e.target.value });
    return React.createElement("form", { onSubmit: (e) => { e.preventDefault(); onSave(data); } },
        React.createElement(FormField, { label: "Number (e.g., CS-101)" }, React.createElement(TextInput, { type: "text", name: "number", value: data.number, onChange: handleChange, required: true })),
        React.createElement(FormField, { label: "Type" }, React.createElement(SelectInput, { name: "type", value: data.type, onChange: handleChange }, React.createElement("option", { value: "classroom" }, "Classroom"), React.createElement("option", { value: "lab" }, "Lab"))),
        React.createElement(FormField, { label: "Capacity" }, React.createElement(TextInput, { type: "number", name: "capacity", value: data.capacity, onChange: handleChange, required: true, min: 1 })),
        React.createElement("button", { type: "submit", className: "w-full mt-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg flex items-center justify-center gap-2" }, React.createElement(SaveIcon, null), "Save")
    );
};

const HeaderCheckbox = <T extends { id: string }>({ type, items, selectedItems, onToggleSelectAll }: HeaderCheckboxProps<T>) => {
    const checkboxRef = useRef<HTMLInputElement>(null);
    const visibleIds = useMemo(() => items.map(item => item.id), [items]);
    const selectedVisibleIds = useMemo(() => visibleIds.filter(id => (selectedItems[type] || []).includes(id)), [visibleIds, selectedItems, type]);

    const isAllSelected = visibleIds.length > 0 && selectedVisibleIds.length === visibleIds.length;
    const isSomeSelected = selectedVisibleIds.length > 0 && selectedVisibleIds.length < visibleIds.length;

    useEffect(() => {
        if (checkboxRef.current) {
            checkboxRef.current.indeterminate = isSomeSelected;
        }
    }, [isSomeSelected]);

    return (
        React.createElement("th", { scope: "col", className: "px-4 py-3" },
            React.createElement("input", {
                type: "checkbox",
                ref: checkboxRef,
                className: "h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500",
                checked: isAllSelected,
                onChange: () => onToggleSelectAll(type, items)
            })
        )
    );
};

const SetupTab = ({ classes, faculty, subjects, rooms, openModal, handleDelete, handleResetData, selectedItems, onToggleSelect, onToggleSelectAll, onInitiateBulkDelete }: SetupTabProps) => {
    const [classFilter, setClassFilter] = useState('');
    const [facultyFilter, setFacultyFilter] = useState('');
    const [subjectFilter, setSubjectFilter] = useState('');
    const [roomFilter, setRoomFilter] = useState('');

    const filteredClasses = useMemo(() => {
        const trimmedFilter = classFilter.trim();
        if (!trimmedFilter) return classes;
        const lowercasedFilter = trimmedFilter.toLowerCase();
        return classes.filter((c: Class) =>
            c.name.toLowerCase().includes(lowercasedFilter) ||
            c.branch.toLowerCase().includes(lowercasedFilter)
        );
    }, [classes, classFilter]);

    const filteredFaculty = useMemo(() => {
        const trimmedFilter = facultyFilter.trim();
        if (!trimmedFilter) return faculty;
        const lowercasedFilter = trimmedFilter.toLowerCase();
        return faculty.filter((f: Faculty) =>
            f.name.toLowerCase().includes(lowercasedFilter) ||
            f.department.toLowerCase().includes(lowercasedFilter)
        );
    }, [faculty, facultyFilter]);

    const filteredSubjects = useMemo(() => {
        const trimmedFilter = subjectFilter.trim();
        if (!trimmedFilter) return subjects;
        const lowercasedFilter = trimmedFilter.toLowerCase();
        return subjects.filter((s: Subject) =>
            s.name.toLowerCase().includes(lowercasedFilter) ||
            s.code.toLowerCase().includes(lowercasedFilter)
        );
    }, [subjects, subjectFilter]);

    const filteredRooms = useMemo(() => {
        const trimmedFilter = roomFilter.trim();
        if (!trimmedFilter) return rooms;
        const lowercasedFilter = trimmedFilter.toLowerCase();
        return rooms.filter((r: Room) =>
            r.number.toLowerCase().includes(lowercasedFilter)
        );
    }, [rooms, roomFilter]);
    
    const ActionButtons = ({ onEdit, onDelete }: { onEdit: () => void, onDelete: () => void }) => (
        React.createElement("div", { className: "flex gap-2" },
            React.createElement("button", { onClick: onEdit, className: "text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 p-1", "aria-label": "Edit" }, React.createElement(EditIcon, null)),
            React.createElement("button", { onClick: onDelete, className: "text-red-500 hover:text-red-700 dark:hover:text-red-400 p-1", "aria-label": "Delete" }, React.createElement(DeleteIcon, null))
        )
    );
    
    const BulkDeleteButton = ({ type, count }: { type: EntityType, count: number }) => {
        if (count === 0) return null;
        return React.createElement("button", {
            onClick: () => onInitiateBulkDelete(type),
            className: "flex items-center gap-2 text-sm text-red-600 dark:text-red-400 font-semibold bg-red-100 dark:bg-red-900/50 hover:bg-red-200 dark:hover:bg-red-900 p-2 rounded-md transition mb-4"
        }, React.createElement(DeleteIcon, null), `Delete Selected (${count})`);
    };

    return (
        React.createElement(React.Fragment, null,
             React.createElement("div", { className: "bg-indigo-100 dark:bg-indigo-900/50 border border-indigo-200 dark:border-indigo-800 p-4 rounded-2xl mb-6 flex flex-wrap items-center justify-between gap-4" },
                React.createElement("div", null,
                    React.createElement("h3", { className: "text-md font-bold text-indigo-800 dark:text-indigo-200" }, "Manage Data"),
                    React.createElement("p", { className: "text-sm text-indigo-600 dark:text-indigo-300 mt-1" }, "Add, edit, or delete items. You can reset to the original sample data if needed.")
                ),
                React.createElement("button", { onClick: handleResetData, className: "bg-indigo-200 hover:bg-indigo-300 dark:bg-indigo-800/50 dark:hover:bg-indigo-800 text-indigo-800 dark:text-indigo-200 font-semibold py-2 px-4 rounded-lg flex items-center gap-2 transition shadow-sm text-sm" }, "Reset to Sample Data")
            ),
            React.createElement("div", { className: "grid grid-cols-1 lg:grid-cols-2 gap-6" },
                React.createElement("div", null,
                    React.createElement(SectionCard, {
                        title: "Classes & Sections",
                        actions: React.createElement("button", { onClick: () => openModal('add', 'class'), className: "flex items-center gap-2 text-sm text-indigo-600 dark:text-indigo-400 font-semibold hover:bg-indigo-50 dark:hover:bg-slate-700/50 p-2 rounded-md transition" }, React.createElement(AddIcon, null), "Add Class")
                    },
                        React.createElement(BulkDeleteButton, { type: "class", count: selectedItems.class.length }),
                        React.createElement(SearchInput, { value: classFilter, onChange: setClassFilter, placeholder: "Search by name or branch..." }),
                        React.createElement(DataTable, {
                            headerPrefix: React.createElement(HeaderCheckbox, { type: "class", items: filteredClasses, selectedItems: selectedItems, onToggleSelectAll: onToggleSelectAll }),
                            headers: ['Name', 'Students', 'Actions'], data: filteredClasses, renderRow: (c: Class) => (
                                React.createElement("tr", { key: c.id, className: "border-b border-gray-200 dark:border-slate-700 hover:bg-gray-50/50 dark:hover:bg-slate-800/50" },
                                    React.createElement("td", { className: "px-4 py-4" }, React.createElement("input", { type: "checkbox", checked: selectedItems.class.includes(c.id), onChange: () => onToggleSelect('class', c.id), className: "h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" })),
                                    React.createElement("td", { className: "px-6 py-4" }, c.name),
                                    React.createElement("td", { className: "px-6 py-4" }, c.studentCount),
                                    React.createElement("td", { className: "px-6 py-4" }, React.createElement(ActionButtons, { onEdit: () => openModal('edit', 'class', c), onDelete: () => handleDelete('class', c.id) }))
                                )
                            ),
                            emptyMessage: classFilter ? "No classes match your search." : "No classes available."
                        })
                    ),
                    React.createElement(SectionCard, {
                        title: "Subjects",
                        actions: React.createElement("button", { onClick: () => openModal('add', 'subject'), className: "flex items-center gap-2 text-sm text-indigo-600 dark:text-indigo-400 font-semibold hover:bg-indigo-50 dark:hover:bg-slate-700/50 p-2 rounded-md transition" }, React.createElement(AddIcon, null), "Add Subject")
                    },
                        React.createElement(BulkDeleteButton, { type: "subject", count: selectedItems.subject.length }),
                        React.createElement(SearchInput, { value: subjectFilter, onChange: setSubjectFilter, placeholder: "Search by name or code..." }),
                        React.createElement(DataTable, {
                            headerPrefix: React.createElement(HeaderCheckbox, { type: "subject", items: filteredSubjects, selectedItems: selectedItems, onToggleSelectAll: onToggleSelectAll }),
                            headers: ['Name', 'Type', 'Hours/Week', 'Actions'], data: filteredSubjects, renderRow: (s: Subject) => (
                                React.createElement("tr", { key: s.id, className: "border-b border-gray-200 dark:border-slate-700 hover:bg-gray-50/50 dark:hover:bg-slate-800/50" },
                                    React.createElement("td", { className: "px-4 py-4" }, React.createElement("input", { type: "checkbox", checked: selectedItems.subject.includes(s.id), onChange: () => onToggleSelect('subject', s.id), className: "h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" })),
                                    React.createElement("td", { className: "px-6 py-4" }, s.name),
                                    React.createElement("td", { className: "px-6 py-4 capitalize" }, s.type),
                                    React.createElement("td", { className: "px-6 py-4" }, s.hoursPerWeek),
                                    React.createElement("td", { className: "px-6 py-4" }, React.createElement(ActionButtons, { onEdit: () => openModal('edit', 'subject', s), onDelete: () => handleDelete('subject', s.id) }))
                                )
                            ),
                            emptyMessage: subjectFilter ? "No subjects match your search." : "No subjects available."
                        })
                    )
                ),
                React.createElement("div", null,
                    React.createElement(SectionCard, {
                        title: "Faculty Members",
                        actions: React.createElement("button", { onClick: () => openModal('add', 'faculty'), className: "flex items-center gap-2 text-sm text-indigo-600 dark:text-indigo-400 font-semibold hover:bg-indigo-50 dark:hover:bg-slate-700/50 p-2 rounded-md transition" }, React.createElement(AddIcon, null), "Add Faculty")
                    },
                        React.createElement(BulkDeleteButton, { type: "faculty", count: selectedItems.faculty.length }),
                        React.createElement(SearchInput, { value: facultyFilter, onChange: setFacultyFilter, placeholder: "Search by name or department..." }),
                        React.createElement(DataTable, {
                            headerPrefix: React.createElement(HeaderCheckbox, { type: "faculty", items: filteredFaculty, selectedItems: selectedItems, onToggleSelectAll: onToggleSelectAll }),
                            headers: ['Name', 'Department', 'Actions'], data: filteredFaculty, renderRow: (f: Faculty) => (
                                React.createElement("tr", { key: f.id, className: "border-b border-gray-200 dark:border-slate-700 hover:bg-gray-50/50 dark:hover:bg-slate-800/50" },
                                    React.createElement("td", { className: "px-4 py-4" }, React.createElement("input", { type: "checkbox", checked: selectedItems.faculty.includes(f.id), onChange: () => onToggleSelect('faculty', f.id), className: "h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" })),
                                    React.createElement("td", { className: "px-6 py-4" }, f.name),
                                    React.createElement("td", { className: "px-6 py-4" }, f.department),
                                    React.createElement("td", { className: "px-6 py-4" }, React.createElement(ActionButtons, { onEdit: () => openModal('edit', 'faculty', f), onDelete: () => handleDelete('faculty', f.id) }))
                                )
                            ),
                            emptyMessage: facultyFilter ? "No faculty match your search." : "No faculty available."
                        })
                    ),
                    React.createElement(SectionCard, {
                        title: "Rooms & Labs",
                        actions: React.createElement("button", { onClick: () => openModal('add', 'room'), className: "flex items-center gap-2 text-sm text-indigo-600 dark:text-indigo-400 font-semibold hover:bg-indigo-50 dark:hover:bg-slate-700/50 p-2 rounded-md transition" }, React.createElement(AddIcon, null), "Add Room")
                    },
                        React.createElement(BulkDeleteButton, { type: "room", count: selectedItems.room.length }),
                        React.createElement(SearchInput, { value: roomFilter, onChange: setRoomFilter, placeholder: "Search by room number..." }),
                        React.createElement(DataTable, {
                            headerPrefix: React.createElement(HeaderCheckbox, { type: "room", items: filteredRooms, selectedItems: selectedItems, onToggleSelectAll: onToggleSelectAll }),
                            headers: ['Number', 'Type', 'Capacity', 'Actions'], data: filteredRooms, renderRow: (r: Room) => (
                                React.createElement("tr", { key: r.id, className: "border-b border-gray-200 dark:border-slate-700 hover:bg-gray-50/50 dark:hover:bg-slate-800/50" },
                                    React.createElement("td", { className: "px-4 py-4" }, React.createElement("input", { type: "checkbox", checked: selectedItems.room.includes(r.id), onChange: () => onToggleSelect('room', r.id), className: "h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" })),
                                    React.createElement("td", { className: "px-6 py-4" }, r.number),
                                    React.createElement("td", { className: "px-6 py-4 capitalize" }, r.type),
                                    React.createElement("td", { className: "px-6 py-4" }, r.capacity),
                                    React.createElement("td", { className: "px-6 py-4" }, React.createElement(ActionButtons, { onEdit: () => openModal('edit', 'room', r), onDelete: () => handleDelete('room', r.id) }))
                                )
                            ),
                            emptyMessage: roomFilter ? "No rooms match your search." : "No rooms available."
                        })
                    )
                )
            )
        )
    );
};

const ConstraintsTab = ({ constraints, onConstraintsChange, classes, subjects, faculty }: ConstraintsTabProps) => {
    const uniqueDepartments = useMemo(() => [...new Set(faculty.map(f => f.department))], [faculty]);

    const handleConstraintUpdate = (updater: ((c: Constraints) => Constraints) | Constraints) => {
        const newConstraints = typeof updater === 'function' ? updater(constraints) : updater;
        onConstraintsChange(newConstraints);
    };

    const handleAddConstraint = (type: 'nonConsecutive' | 'preferredTime' | 'facultyAvailability') => {
        let newConstraint: ClassSpecificConstraint;
        if (type === 'nonConsecutive') {
            newConstraint = {
                id: Date.now(),
                type,
                classId: classes[0]?.id || '',
                subjectId1: '',
                subjectId2: ''
            };
        } else if (type === 'preferredTime') {
            newConstraint = {
                id: Date.now(),
                type,
                classId: classes[0]?.id || '',
                day: DAYS[0],
                timePreference: 'morning'
            };
        } else { // type === 'facultyAvailability'
            newConstraint = {
                id: Date.now(),
                type,
                facultyId: faculty[0]?.id || '',
                day: DAYS[0],
                timeSlot: TIME_SLOTS[0],
            };
        }

        handleConstraintUpdate(prev => ({
            ...prev,
            classSpecific: [...(prev.classSpecific || []), newConstraint]
        }));
    };

    const handleConstraintChange = (id: number, field: string, value: string) => {
        handleConstraintUpdate(prev => ({
            ...prev,
            classSpecific: (prev.classSpecific || []).map(c =>
                c.id === id ? { ...c, [field]: value } : c
            )
        }));
    };

    const handleRemoveConstraint = (id: number) => {
        handleConstraintUpdate(prev => ({
            ...prev,
            classSpecific: (prev.classSpecific || []).filter(c => c.id !== id)
        }));
    };

    const classOptions = useMemo(() => classes.map(c => React.createElement("option", { key: c.id, value: c.id }, c.name)), [classes]);
    const subjectOptions = useMemo(() => subjects.map(s => React.createElement("option", { key: s.id, value: s.id }, s.name)), [subjects]);
    const facultyOptions = useMemo(() => faculty.map(f => React.createElement("option", { key: f.id, value: f.id }, f.name)), [faculty]);
    const dayOptions = useMemo(() => DAYS.map(d => React.createElement("option", { key: d, value: d }, d.charAt(0).toUpperCase() + d.slice(1))), []);
    const timeSlotOptions = useMemo(() => TIME_SLOTS.filter(t => t !== '12:50-01:35').map(t => React.createElement("option", { key: t, value: t }, t)), []);


    return React.createElement(React.Fragment, null,
        React.createElement(SectionCard, { title: "General Scheduling Rules" },
            React.createElement("div", { className: "space-y-6 max-w-lg" },
                React.createElement("div", null,
                    React.createElement("label", { className: "font-semibold text-gray-600 dark:text-gray-300" }, "Max Consecutive Classes for Faculty"),
                    React.createElement("input", {
                        type: "number",
                        value: constraints.maxConsecutiveClasses,
                        onChange: (e: React.ChangeEvent<HTMLInputElement>) => handleConstraintUpdate(c => ({...c, maxConsecutiveClasses: parseInt(e.target.value, 10)})),
                        className: "mt-1 w-full p-2 border border-gray-300 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 rounded-md text-gray-800 dark:text-gray-200"
                    })
                ),
                React.createElement("div", null,
                    React.createElement("label", { className: "font-semibold text-gray-600 dark:text-gray-300" }, "Max Concurrent Classes per Department"),
                    React.createElement("div", { className: "mt-2 space-y-2" },
                        uniqueDepartments.map(dept => (
                            React.createElement("div", { key: dept, className: "flex items-center justify-between" },
                                React.createElement("span", { className: "text-gray-600 dark:text-gray-300" }, dept),
                                React.createElement("input", {
                                    type: "number",
                                    value: constraints.maxConcurrentClassesPerDept[dept] || '',
                                    onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
                                        const value = parseInt(e.target.value, 10);
                                        handleConstraintUpdate(c => ({
                                            ...c,
                                            maxConcurrentClassesPerDept: {
                                                ...c.maxConcurrentClassesPerDept,
                                                [dept]: isNaN(value) ? 0 : value
                                            }
                                        }));
                                    },
                                    className: "w-20 p-2 border border-gray-300 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 rounded-md text-gray-800 dark:text-gray-200"
                                })
                            )
                        ))
                    )
                ),
                 React.createElement("div", null,
                    React.createElement("label", { className: "font-semibold text-gray-600 dark:text-gray-300" }, "Working Days"),
                    React.createElement("div", { className: "mt-2 grid grid-cols-2 sm:grid-cols-3 gap-3" },
                        DAYS.map(day => (
                            React.createElement("label", { key: day, className: "flex items-center gap-2 p-2 rounded-md hover:bg-gray-100 dark:hover:bg-slate-700/50 cursor-pointer" },
                                React.createElement("input", {
                                    type: "checkbox",
                                    checked: constraints.workingDays.includes(day),
                                    onChange: e => {
                                        const newDays = e.target.checked ? [...constraints.workingDays, day] : constraints.workingDays.filter(d => d !== day);
                                        handleConstraintUpdate(c => ({ ...c, workingDays: newDays }));
                                    },
                                    className: "h-4 w-4 text-indigo-500 bg-gray-200 dark:bg-slate-600 border-gray-300 dark:border-slate-500 rounded focus:ring-indigo-500"
                                }),
                                React.createElement("span", { className: "capitalize text-gray-600 dark:text-gray-300" }, day)
                            )
                        ))
                    )
                )
            )
        ),
        React.createElement(SectionCard, { title: "Specific Constraints" },
            React.createElement("div", { className: "space-y-4" },
                 React.createElement("p", { className: "text-sm text-gray-500 dark:text-gray-400 -mt-2 mb-4" }, "Define specific rules for classes, faculty availability, or scheduling preferences."),
                (constraints.classSpecific || []).map(constraint => {
                     const deleteButton = React.createElement("button", {
                        onClick: () => handleRemoveConstraint(constraint.id),
                        className: "ml-auto text-red-500 hover:text-red-700 p-1 rounded-full",
                        "aria-label": "Delete constraint"
                    }, React.createElement(DeleteIcon, null));

                    if (constraint.type === 'nonConsecutive') {
                        return React.createElement("div", { key: constraint.id, className: "flex flex-wrap items-center gap-2 p-3 bg-gray-100 dark:bg-slate-900/50 rounded-lg" },
                             React.createElement("select", {
                                value: constraint.classId,
                                onChange: (e: React.ChangeEvent<HTMLSelectElement>) => handleConstraintChange(constraint.id, 'classId', e.target.value),
                                className: "p-2 border border-gray-300 dark:border-slate-600 bg-gray-50 dark:bg-slate-800 rounded-md text-gray-800 dark:text-gray-200"
                            }, React.createElement("option", { value: "" }, "Select Class"), ...classOptions),
                            React.createElement("span", { className: "text-gray-600 dark:text-gray-300" }, "subjects"),
                            React.createElement("select", {
                                value: constraint.subjectId1,
                                onChange: (e: React.ChangeEvent<HTMLSelectElement>) => handleConstraintChange(constraint.id, 'subjectId1', e.target.value),
                                className: "p-2 border border-gray-300 dark:border-slate-600 bg-gray-50 dark:bg-slate-800 rounded-md text-gray-800 dark:text-gray-200"
                            }, React.createElement("option", { value: "" }, "Select Subject"), ...subjectOptions),
                            React.createElement("span", { className: "text-gray-600 dark:text-gray-300" }, "&"),
                            React.createElement("select", {
                                value: constraint.subjectId2,
                                onChange: (e: React.ChangeEvent<HTMLSelectElement>) => handleConstraintChange(constraint.id, 'subjectId2', e.target.value),
                                className: "p-2 border border-gray-300 dark:border-slate-600 bg-gray-50 dark:bg-slate-800 rounded-md text-gray-800 dark:text-gray-200"
                            }, React.createElement("option", { value: "" }, "Select Subject"), ...subjectOptions),
                            React.createElement("span", { className: "text-gray-600 dark:text-gray-300" }, "should not be consecutive."),
                            deleteButton
                        );
                    } else if (constraint.type === 'preferredTime') {
                         return React.createElement("div", { key: constraint.id, className: "flex flex-wrap items-center gap-2 p-3 bg-gray-100 dark:bg-slate-900/50 rounded-lg" },
                             React.createElement("select", {
                                value: constraint.classId,
                                onChange: (e: React.ChangeEvent<HTMLSelectElement>) => handleConstraintChange(constraint.id, 'classId', e.target.value),
                                className: "p-2 border border-gray-300 dark:border-slate-600 bg-gray-50 dark:bg-slate-800 rounded-md text-gray-800 dark:text-gray-200"
                            }, React.createElement("option", { value: "" }, "Select Class"), ...classOptions),
                            React.createElement("span", { className: "text-gray-600 dark:text-gray-300" }, "prefers"),
                            React.createElement("select", {
                                value: constraint.timePreference,
                                onChange: (e: React.ChangeEvent<HTMLSelectElement>) => handleConstraintChange(constraint.id, 'timePreference', e.target.value),
                                className: "p-2 border border-gray-300 dark:border-slate-600 bg-gray-50 dark:bg-slate-800 rounded-md text-gray-800 dark:text-gray-200"
                            }, React.createElement("option", {value: "morning"}, "Morning"), React.createElement("option", {value: "afternoon"}, "Afternoon")),
                            React.createElement("span", { className: "text-gray-600 dark:text-gray-300" }, "slots on"),
                            React.createElement("select", {
                                value: constraint.day,
                                onChange: (e: React.ChangeEvent<HTMLSelectElement>) => handleConstraintChange(constraint.id, 'day', e.target.value),
                                className: "p-2 border border-gray-300 dark:border-slate-600 bg-gray-50 dark:bg-slate-800 rounded-md text-gray-800 dark:text-gray-200"
                            }, ...dayOptions),
                            deleteButton
                        );
                    } else if (constraint.type === 'facultyAvailability') {
                         return React.createElement("div", { key: constraint.id, className: "flex flex-wrap items-center gap-2 p-3 bg-gray-100 dark:bg-slate-900/50 rounded-lg" },
                             React.createElement("select", {
                                value: constraint.facultyId,
                                onChange: (e: React.ChangeEvent<HTMLSelectElement>) => handleConstraintChange(constraint.id, 'facultyId', e.target.value),
                                className: "p-2 border border-gray-300 dark:border-slate-600 bg-gray-50 dark:bg-slate-800 rounded-md text-gray-800 dark:text-gray-200"
                            }, React.createElement("option", { value: "" }, "Select Faculty"), ...facultyOptions),
                            React.createElement("span", { className: "text-gray-600 dark:text-gray-300" }, "is unavailable on"),
                             React.createElement("select", {
                                value: constraint.day,
                                onChange: (e: React.ChangeEvent<HTMLSelectElement>) => handleConstraintChange(constraint.id, 'day', e.target.value),
                                className: "p-2 border border-gray-300 dark:border-slate-600 bg-gray-50 dark:bg-slate-800 rounded-md text-gray-800 dark:text-gray-200"
                            }, ...dayOptions),
                            React.createElement("span", { className: "text-gray-600 dark:text-gray-300" }, "at"),
                            React.createElement("select", {
                                value: constraint.timeSlot,
                                onChange: (e: React.ChangeEvent<HTMLSelectElement>) => handleConstraintChange(constraint.id, 'timeSlot', e.target.value),
                                className: "p-2 border border-gray-300 dark:border-slate-600 bg-gray-50 dark:bg-slate-800 rounded-md text-gray-800 dark:text-gray-200"
                            }, ...timeSlotOptions),
                            deleteButton
                        );
                    }
                    return null;
                }),
                React.createElement("div", { className: "flex flex-wrap gap-4 pt-4 border-t border-gray-200 dark:border-slate-700 mt-4" },
                    React.createElement("button", {
                        onClick: () => handleAddConstraint('nonConsecutive'),
                        className: "flex items-center gap-2 text-sm text-indigo-600 dark:text-indigo-400 font-semibold hover:bg-indigo-50 dark:hover:bg-slate-700/50 p-2 rounded-md transition"
                    }, React.createElement(AddIcon, null), "Add Non-Consecutive Rule"),
                    React.createElement("button", {
                        onClick: () => handleAddConstraint('preferredTime'),
                        className: "flex items-center gap-2 text-sm text-indigo-600 dark:text-indigo-400 font-semibold hover:bg-indigo-50 dark:hover:bg-slate-700/50 p-2 rounded-md transition"
                    }, React.createElement(AddIcon, null), "Add Time Preference Rule"),
                    React.createElement("button", {
                        onClick: () => handleAddConstraint('facultyAvailability'),
                        className: "flex items-center gap-2 text-sm text-indigo-600 dark:text-indigo-400 font-semibold hover:bg-indigo-50 dark:hover:bg-slate-700/50 p-2 rounded-md transition"
                    }, React.createElement(AddIcon, null), "Add Faculty Availability Rule")
                )
            )
        )
    );
};

const GenerateTab = ({ onGenerate, isLoading, error }: GenerateTabProps) => (
    React.createElement("div", { className: "text-center bg-white/80 dark:bg-slate-800/50 backdrop-blur-lg border border-gray-200 dark:border-slate-700 p-8 rounded-2xl shadow-lg max-w-2xl mx-auto" },
        React.createElement("h3", { className: "text-2xl font-bold text-gray-800 dark:text-gray-100" }, "Generate Timetable"),
        React.createElement("p", { className: "text-gray-500 dark:text-gray-400 my-4" }, "Click the button below to use the AI to generate an optimal, conflict-free timetable based on your setup and constraints."),

        error && React.createElement("div", { className: "bg-red-500/10 dark:bg-red-900/50 border-red-500/50 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg text-left my-4" }, error),

        React.createElement("button", {
            onClick: onGenerate,
            disabled: isLoading,
            className: "w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 px-8 rounded-lg flex items-center justify-center gap-3 transition-transform transform hover:scale-105 disabled:bg-indigo-400 disabled:cursor-not-allowed shadow-lg shadow-indigo-600/30"
        },
            isLoading ? (
                React.createElement(React.Fragment, null,
                    React.createElement(LoadingIcon, null),
                    "Generating..."
                )
            ) : (
                React.createElement(React.Fragment, null,
                    React.createElement(GenerateIcon, null),
                    "Start AI Generation"
                )
            )
        )
    )
);

const ViewTab = ({ timetable }: ViewTabProps) => {
    const [viewBy, setViewBy] = useState('class');
    const [selectedValues, setSelectedValues] = useState<string[]>([]);

    const options = useMemo(() => {
        if (!timetable.length) return [];
        switch (viewBy) {
            case 'class':
                return [...new Set(timetable.map(e => e.className))].sort().map(c => ({ value: c, label: c }));
            case 'faculty':
                return [...new Set(timetable.map(e => e.faculty))].sort().map(f => ({ value: f, label: f }));
            case 'room':
                 return [...new Set(timetable.map(e => e.room))].sort().map(r => ({ value: r, label: r }));
            default:
                return [];
        }
    }, [viewBy, timetable]);

    useEffect(() => {
        if(options.length > 0) {
            setSelectedValues([options[0].value]);
        } else {
            setSelectedValues([]);
        }
    }, [options]);

    const filteredTimetable = useMemo(() => timetable.filter(entry => {
        if (!selectedValues.length) return true;
        switch (viewBy) {
            case 'class': return entry.className === selectedValues[0];
            case 'faculty': return selectedValues.includes(entry.faculty);
            case 'room': return selectedValues.includes(entry.room);
            default: return true;
        }
    }), [timetable, selectedValues, viewBy]);

    const getEntries = useCallback((day: string, time: string) => {
        return filteredTimetable.filter(e => e.day.toLowerCase() === day.toLowerCase() && e.time === time);
    }, [filteredTimetable]);

    const handleExport = () => {
        if (!timetable || timetable.length === 0) {
            alert("No timetable data to export.");
            return;
        }

        const headers = ["Day", "Time", "Class Name", "Subject", "Faculty", "Room", "Type"];
        const csvRows = [headers.join(',')];

        const sortedTimetable = [...timetable].sort((a, b) => {
            const dayCompare = DAYS.indexOf(a.day.toLowerCase()) - DAYS.indexOf(b.day.toLowerCase());
            if (dayCompare !== 0) return dayCompare;
            const timeCompare = TIME_SLOTS.indexOf(a.time) - TIME_SLOTS.indexOf(b.time);
            if (timeCompare !== 0) return timeCompare;
            return a.className.localeCompare(b.className);
        });

        for (const entry of sortedTimetable) {
            const values = [
                entry.day,
                entry.time,
                entry.className,
                entry.subject,
                entry.faculty,
                entry.room,
                entry.type
            ].map(value => `"${String(value).replace(/"/g, '""')}"`); // Quote and escape quotes
            csvRows.push(values.join(','));
        }

        const csvString = csvRows.join('\n');
        const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", "timetable.csv");
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    if (!timetable.length) {
        return (
            React.createElement("div", { className: "text-center bg-white/80 dark:bg-slate-800/50 backdrop-blur-lg border border-gray-200 dark:border-slate-700 p-8 rounded-2xl shadow-lg max-w-2xl mx-auto" },
                React.createElement("h3", { className: "text-xl font-bold text-gray-800 dark:text-gray-100" }, "No Timetable Generated"),
                React.createElement("p", { className: "text-gray-500 dark:text-gray-400 my-4" }, "Go to the 'Generate' tab to create a timetable.")
            )
        );
    }
    
    const isMultiSelect = viewBy === 'faculty' || viewBy === 'room';

    const handleSelectionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        if (isMultiSelect) {
            const values = Array.from(e.target.selectedOptions, option => option.value);
            setSelectedValues(values);
        } else {
            setSelectedValues([e.target.value]);
        }
    };

    return (
        React.createElement(SectionCard, { title: "Generated Timetable" },
            React.createElement("div", { className: "flex flex-wrap gap-4 mb-6 items-center" },
                 React.createElement("select", { value: viewBy, onChange: (e: React.ChangeEvent<HTMLSelectElement>) => setViewBy(e.target.value), className: "p-2 border border-gray-300 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 rounded-md text-gray-800 dark:text-white" },
                     React.createElement("option", { value: "class" }, "Class"),
                     React.createElement("option", { value: "faculty" }, "Faculty"),
                     React.createElement("option", { value: "room" }, "Room")
                 ),
                 React.createElement("div", { className: "flex-grow" },
                    React.createElement("label", { className: "text-sm text-gray-500 dark:text-gray-400 mb-1 block" }, 
                        isMultiSelect ? 'Select one or more (Ctrl/Cmd + Click)' : 'Select one'
                    ),
                    React.createElement("select", { 
                        value: isMultiSelect ? selectedValues : (selectedValues[0] || ''), 
                        onChange: handleSelectionChange, 
                        multiple: isMultiSelect,
                        className: `w-full p-2 border border-gray-300 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 rounded-md text-gray-800 dark:text-white ${isMultiSelect ? 'h-32' : ''}`
                    },
                        ...options.map(o => React.createElement("option", { key: o.value, value: o.value }, o.label))
                    )
                ),
                React.createElement("button", { 
                    onClick: handleExport,
                    title: "Export timetable to CSV",
                    className: "ml-auto bg-white dark:bg-slate-800 hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-600 dark:text-gray-200 font-semibold py-2 px-4 border border-gray-200 dark:border-slate-700 rounded-lg flex items-center gap-2 transition shadow-sm"
                }, React.createElement(DownloadIcon, null), "Export CSV")
            ),
            (isMultiSelect && selectedValues.length === 0)
            ? React.createElement("div", { className: "text-center p-8 bg-gray-50 dark:bg-slate-900/50 rounded-lg border border-gray-200 dark:border-slate-700" },
                React.createElement("h4", { className: "font-semibold text-lg text-gray-700 dark:text-gray-200" }, `Select a ${viewBy} to view the schedule`),
                React.createElement("p", { className: "text-gray-500 dark:text-gray-400 mt-2" },
                    `Please select at least one ${viewBy} from the list above to display the corresponding timetable.`
                )
              )
            : React.createElement("div", { className: "overflow-x-auto" },
                React.createElement("table", { className: "w-full border-collapse text-sm" },
                    React.createElement("thead", null,
                        React.createElement("tr", { className: "bg-gray-100 dark:bg-slate-900/50" },
                            React.createElement("th", { className: "p-3 font-semibold text-left text-gray-600 dark:text-gray-300 border-b-2 border-gray-200 dark:border-slate-700" }, "Time"),
                            DAYS.map(day => React.createElement("th", { key: day, className: "p-3 font-semibold text-center capitalize text-gray-600 dark:text-gray-300 border-b-2 border-gray-200 dark:border-slate-700" }, day))
                        )
                    ),
                    React.createElement("tbody", null,
                        TIME_SLOTS.map(time => (
                            React.createElement("tr", { key: time, className: "hover:bg-gray-100/50 dark:hover:bg-slate-800/50 transition-colors" },
                                React.createElement("td", { className: "p-3 text-gray-800 dark:text-gray-200 font-medium border-b border-gray-200 dark:border-slate-700" }, time),
                                DAYS.map(day => {
                                    const entries = getEntries(day, time);
                                    const renderEntryDetails = (entry: TimetableEntry) => {
                                        let mainText = entry.subject;
                                        let subText = '';
                                        if (viewBy === 'class') {
                                            subText = entry.faculty;
                                        } else if (viewBy === 'faculty') {
                                            subText = `${entry.className} (${entry.room})`;
                                        } else if (viewBy === 'room') {
                                            subText = `${entry.className} (${entry.faculty})`;
                                        }
                                        return [
                                            React.createElement("div", { key: "main", className: "font-bold" }, mainText),
                                            React.createElement("div", { key: "sub", className: "opacity-80" }, subText)
                                        ];
                                    };
                                    return (
                                        React.createElement("td", { key: day, className: "p-2 border-b border-gray-200 dark:border-slate-700 text-center align-top" },
                                            entries.length > 0 ? (
                                                React.createElement("div", { className: "space-y-1" },
                                                    entries.map((entry, index) => 
                                                        React.createElement("div", { 
                                                            key: `${entry.className}-${entry.subject}-${index}`, 
                                                            className: `p-2 rounded-lg text-white text-xs ${entry.type === 'lab' ? 'bg-purple-600' : 'bg-indigo-600'}` 
                                                        },
                                                           ...renderEntryDetails(entry)
                                                        )
                                                    )
                                                )
                                            ) : (
                                                time === '12:50-01:35' ? React.createElement("div", { className: "text-gray-400 dark:text-gray-500 text-xs" }, "Lunch") : null
                                            )
                                        )
                                    );
                                })
                            )
                        ))
                    )
                )
            )
        )
    );
};

export const TimetableScheduler = ({ onLogout, theme, toggleTheme, classes, faculty, subjects, rooms, students, constraints, setConstraints, onSaveEntity, onDeleteEntity, onResetData, token }: TimetableSchedulerProps) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('setup');
  
  const [timetable, setTimetable] = useState<TimetableEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [modalState, setModalState] = useState<{ isOpen: boolean, mode: 'add' | 'edit', type: EntityType | '', data: Entity | null }>({ isOpen: false, mode: 'add', type: '', data: null });
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [bulkDeleteState, setBulkDeleteState] = useState<{ isOpen: boolean, type: EntityType | '', onConfirm: () => void }>({ isOpen: false, type: '', onConfirm: () => {} });
  
  const [selectedItems, setSelectedItems] = useState<{ [key in EntityType]: string[] }>({
      class: [], faculty: [], subject: [], room: []
  });

  useEffect(() => {
    try {
        const sharedData = JSON.parse(localStorage.getItem('smartCampusShared') || '{}');
        if (sharedData.timetable) {
            setTimetable(sharedData.timetable);
        }
    } catch(e) { console.error("Could not load timetable from storage", e)}
  }, []);

  const openModal = (mode: 'add' | 'edit', type: EntityType, data: Entity | null = null) => setModalState({ isOpen: true, mode, type, data });
  const closeModal = () => setModalState({ isOpen: false, mode: 'add', type: '', data: null });

  const handleSave = (type: EntityType, data: Entity) => {
      onSaveEntity(type, data);
      closeModal();
  };

  const handleDelete = (type: EntityType, id: string) => {
      if (window.confirm('Are you sure you want to delete this item? This action cannot be undone.')) {
          onDeleteEntity(type, id);
      }
  };

  const handleResetData = () => {
    if (window.confirm('This will replace all current data with the original sample data. Are you sure?')) {
        onResetData();
        setTimetable([]);
        alert('Data has been reset to the original sample data.');
    }
  };
  
  const handleConstraintsChange = useCallback((newConstraints: Constraints) => {
      setConstraints(newConstraints);
  }, [setConstraints]);

  const handleToggleSelect = (type: EntityType, id: string) => {
      setSelectedItems(prev => {
          const currentSelection = prev[type] || [];
          const newSelection = currentSelection.includes(id)
              ? currentSelection.filter(itemId => itemId !== id)
              : [...currentSelection, id];
          return { ...prev, [type]: newSelection };
      });
  };

  const handleToggleSelectAll = (type: EntityType, displayedItems: { id: string }[]) => {
      setSelectedItems(prev => {
          const currentSelection = prev[type] || [];
          const displayedIds = displayedItems.map(item => item.id);
          const allSelectedOnPage = displayedIds.length > 0 && displayedIds.every(id => currentSelection.includes(id));
          
          if (allSelectedOnPage) {
              // Deselect all items on the current page
              return { ...prev, [type]: currentSelection.filter(id => !displayedIds.includes(id)) };
          } else {
              // Select all items on the current page
              const newSelection = [...new Set([...currentSelection, ...displayedIds])];
              return { ...prev, [type]: newSelection };
          }
      });
  };
  
  const handleInitiateBulkDelete = (type: EntityType) => {
    const idsToDelete = selectedItems[type];
    if (idsToDelete.length === 0) return;

    setBulkDeleteState({
        isOpen: true,
        type: type,
        onConfirm: async () => {
            setIsLoading(true);
            try {
                await Promise.all(idsToDelete.map(id => onDeleteEntity(type, id)));
            } catch (err: unknown) {
                const message = err instanceof Error ? err.message : String(err);
                console.error("Bulk delete failed:", err);
                setError(`Failed to delete some items. Please refresh and try again. Error: ${message}`);
            } finally {
                setSelectedItems(prev => ({ ...prev, [type]: [] }));
                setIsLoading(false);
                setBulkDeleteState({ isOpen: false, type: '', onConfirm: () => {} });
            }
        }
    });
  };

  const handleGenerate = useCallback(async () => {
    setIsConfirmModalOpen(false);
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await generateTimetable(classes, faculty, subjects, rooms, constraints, token);
      
      if (!Array.isArray(result)) {
        console.error("API returned non-array for timetable:", result);
        throw new Error("The AI service returned an invalid data format for the timetable. Please try generating again.");
      }

      setTimetable(result);
      
      const sharedData = { classes, faculty, subjects, rooms, students, constraints, timetable: result };
      localStorage.setItem('smartCampusShared', JSON.stringify(sharedData));

      setActiveTab('view');
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("An unknown error occurred while generating the timetable.");
      }
    } finally {
      setIsLoading(false);
    }
  }, [classes, faculty, subjects, rooms, students, constraints, token, setTimetable]);

  const handleInitiateGenerate = useCallback(() => {
    setError(null);
    if (classes.length === 0 || subjects.length === 0 || faculty.length === 0 || rooms.length === 0) {
        setError("Please add classes, subjects, faculty, and rooms before generating a timetable.");
        return;
    }
    setIsConfirmModalOpen(true);
  }, [classes, faculty, subjects, rooms]);

  const renderModalContent = () => {
      const { mode, type, data } = modalState;
      const title = `${mode === 'add' ? 'Add New' : 'Edit'} ${type.charAt(0).toUpperCase() + type.slice(1)}`;

      let formComponent;
      switch(type) {
          case 'class':
              formComponent = React.createElement(ClassForm, { initialData: data as Class, onSave: (d: Class) => handleSave('class', d) });
              break;
          case 'faculty':
              formComponent = React.createElement(FacultyForm, { initialData: data as Faculty, onSave: (d: Faculty) => handleSave('faculty', d) });
              break;
          case 'subject':
              formComponent = React.createElement(SubjectForm, { initialData: data as Subject, onSave: (d: Subject) => handleSave('subject', d), faculty: faculty });
              break;
          case 'room':
              formComponent = React.createElement(RoomForm, { initialData: data as Room, onSave: (d: Room) => handleSave('room', d) });
              break;
          default:
              formComponent = null;
      }
      return React.createElement(Modal, { isOpen: modalState.isOpen, onClose: closeModal, title: title }, formComponent);
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'setup':
        return React.createElement(SetupTab, { classes, faculty, subjects, rooms, openModal, handleDelete, handleResetData, selectedItems: selectedItems, onToggleSelect: handleToggleSelect, onToggleSelectAll: handleToggleSelectAll, onInitiateBulkDelete: handleInitiateBulkDelete });
      case 'constraints':
        return React.createElement(ConstraintsTab, { constraints: constraints, onConstraintsChange: handleConstraintsChange, classes: classes, subjects: subjects, faculty: faculty });
      case 'generate':
        return React.createElement(GenerateTab, { onGenerate: handleInitiateGenerate, isLoading: isLoading, error: error });
      case 'view':
        return React.createElement(ViewTab, { timetable: timetable });
      default:
        return null;
    }
  };

  const TabButton = ({ tab, label, icon }: TabButtonProps) => (
    React.createElement("button", {
      onClick: () => setActiveTab(tab),
      className: `flex items-center gap-2 px-4 py-3 text-sm font-semibold rounded-lg transition-all ${
        activeTab === tab ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-200/50 dark:hover:bg-slate-700/50'
      }`
    }, icon, label)
  );

  return (
    React.createElement("div", { className: "min-h-screen bg-transparent p-4 sm:p-6 lg:p-8" },
      renderModalContent(),
       React.createElement(Modal, {
          isOpen: bulkDeleteState.isOpen,
          onClose: () => setBulkDeleteState({ isOpen: false, type: '', onConfirm: () => {} }),
          title: "Confirm Bulk Deletion"
        },
        React.createElement("div", null,
          React.createElement("p", { className: "text-gray-600 dark:text-gray-300" },
            `Are you sure you want to delete the selected ${selectedItems[bulkDeleteState.type as EntityType]?.length} ${bulkDeleteState.type} items? This action cannot be undone.`
          ),
          React.createElement("div", { className: "flex justify-end gap-4 mt-6 pt-4 border-t border-gray-200 dark:border-slate-700" },
            React.createElement("button", {
              onClick: () => setBulkDeleteState({ isOpen: false, type: '', onConfirm: () => {} }),
              className: "bg-white dark:bg-slate-700 text-gray-800 dark:text-gray-200 font-semibold py-2 px-4 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-600 border border-gray-300 dark:border-slate-600 transition"
            }, "Cancel"),
            React.createElement("button", {
              onClick: bulkDeleteState.onConfirm,
              className: "bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition"
            }, React.createElement(DeleteIcon, null), "Delete")
          )
        )
      ),
      React.createElement(Modal, {
        isOpen: isConfirmModalOpen,
        onClose: () => setIsConfirmModalOpen(false),
        title: "Confirm Timetable Generation"
      },
        React.createElement(React.Fragment, null,
          React.createElement("div", { className: "text-gray-600 dark:text-gray-300 space-y-4" },
            React.createElement("p", null, "Please review your setup before starting the AI generation. This process may take a few moments."),
            React.createElement("ul", { className: "list-disc list-inside bg-gray-100 dark:bg-slate-900/50 p-4 rounded-lg space-y-2 text-sm" },
              React.createElement("li", null, React.createElement("strong", null, classes.length), " Classes"),
              React.createElement("li", null, React.createElement("strong", null, faculty.length), " Faculty Members"),
              React.createElement("li", null, React.createElement("strong", null, subjects.length), " Subjects"),
              React.createElement("li", null, React.createElement("strong", null, rooms.length), " Rooms"),
              React.createElement("li", null, React.createElement("strong", null, constraints.workingDays.length), " Working Days (", constraints.workingDays.map(d => d.charAt(0).toUpperCase() + d.slice(1)).join(', '), ")"),
              React.createElement("li", null, React.createElement("strong", null, constraints.maxConsecutiveClasses), " Max. Consecutive Classes for Faculty"),
              React.createElement("li", null, React.createElement("strong", null, constraints.classSpecific?.length || 0), " Specific Rules Defined")
            ),
            React.createElement("p", { className: "font-semibold pt-2" }, "Are you sure you want to proceed?")
          ),
          React.createElement("div", { className: "flex justify-end gap-4 mt-6 pt-4 border-t border-gray-200 dark:border-slate-700" },
            React.createElement("button", {
              onClick: () => setIsConfirmModalOpen(false),
              className: "bg-white dark:bg-slate-700 text-gray-800 dark:text-gray-200 font-semibold py-2 px-4 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-600 border border-gray-300 dark:border-slate-600 transition"
            }, "Cancel"),
            React.createElement("button", {
              onClick: handleGenerate,
              className: "bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition"
            }, React.createElement(GenerateIcon, null), " Confirm & Generate")
          )
        )
      ),
      React.createElement("header", { className: "flex flex-wrap justify-between items-center mb-6 gap-4" },
        React.createElement("div", null,
          React.createElement("h1", { className: "text-3xl font-bold text-gray-800 dark:text-white" }, "AI Timetable Scheduler"),
          React.createElement("p", { className: "text-gray-500 dark:text-gray-400" }, "Manage and generate academic schedules with ease.")
        ),
        React.createElement("div", { className: "flex gap-2" },
            React.createElement("button", { onClick: toggleTheme, className: "bg-white dark:bg-slate-800 hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-600 dark:text-gray-200 font-semibold p-2.5 border border-gray-200 dark:border-slate-700 rounded-lg flex items-center gap-2 transition shadow-sm" },
                theme === 'dark' ? React.createElement(SunIcon, null) : React.createElement(MoonIcon, null)
            ),
            React.createElement("button", { onClick: () => navigate(-1), className: "bg-white dark:bg-slate-800 hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-600 dark:text-gray-200 font-semibold py-2 px-4 border border-gray-200 dark:border-slate-700 rounded-lg flex items-center gap-2 transition shadow-sm" },
                React.createElement(BackIcon, null), " Dashboard"
            ),
            React.createElement("button", { onClick: onLogout, className: "bg-white dark:bg-slate-800 hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-600 dark:text-gray-200 font-semibold py-2 px-4 border border-gray-200 dark:border-slate-700 rounded-lg flex items-center gap-2 transition shadow-sm" },
                React.createElement(LogoutIcon, null), " Logout"
            )
        )
      ),
      React.createElement("nav", { className: "bg-white/80 dark:bg-slate-800/50 backdrop-blur-lg border border-gray-200 dark:border-slate-700 p-2 rounded-xl shadow-md flex flex-wrap gap-2 mb-8" },
        React.createElement(TabButton, { tab: "setup", label: "Setup", icon: React.createElement(SetupIcon, null) }),
        React.createElement(TabButton, { tab: "constraints", label: "Constraints", icon: React.createElement(ConstraintsIcon, null) }),
        React.createElement(TabButton, { tab: "generate", label: "Generate", icon: React.createElement(GenerateIcon, null) }),
        React.createElement(TabButton, { tab: "view", label: "View Timetable", icon: React.createElement(ViewIcon, null) })
      ),
      React.createElement("main", null, renderContent())
    )
  );
};