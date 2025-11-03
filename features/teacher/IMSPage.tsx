import React, { useState, useMemo } from 'react';
import { SectionCard, FormField, SelectInput, Modal, TextInput } from '../../components/common';
import { useAppContext } from '../../context/AppContext';
import { SyllabusProgress } from '../../types';
import { EditIcon } from '../../components/Icons';

const ProgressBar = ({ value, color = 'bg-blue-600' }: { value: number; color?: string }) => (
    <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2.5">
        <div className={`${color} h-2.5 rounded-full`} style={{ width: `${value}%` }}></div>
    </div>
);

const SyllabusUpdateModal = ({ progress, isOpen, onClose, onSave }: {
    progress: SyllabusProgress | null;
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: SyllabusProgress) => void;
}) => {
    const [formData, setFormData] = useState(progress);

    if (!isOpen || !progress || !formData) return null;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => prev ? { ...prev, [name]: value } : null);
    };
    
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (formData) {
            onSave(formData);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Update Lecture #${formData.lectureNumber}`}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <p><span className="font-semibold">Assigned Topic:</span> {formData.assignedTopic}</p>
                <FormField label="Taught Topic" htmlFor="taughtTopic">
                    <TextInput id="taughtTopic" name="taughtTopic" value={formData.taughtTopic} onChange={handleChange} required />
                </FormField>
                <FormField label="Status" htmlFor="status">
                    <SelectInput id="status" name="status" value={formData.status} onChange={handleChange}>
                        <option value="Pending">Pending</option>
                        <option value="Completed">Completed</option>
                        <option value="Deferred">Deferred</option>
                    </SelectInput>
                </FormField>
                <div className="flex justify-end gap-2 pt-4">
                    <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
                    <button type="submit" className="btn-primary">Save Changes</button>
                </div>
            </form>
        </Modal>
    );
};

const IMSPage = () => {
    const { user, faculty, subjects, syllabusProgress, handleSaveEntity } = useAppContext();
    const [editingProgress, setEditingProgress] = useState<SyllabusProgress | null>(null);

    const teacherProfile = faculty.find(f => f.id === user?.profileId);
    const teacherSubjects = subjects.filter(s => s.assignedFacultyId === teacherProfile?.id);

    const getStatusColor = (status: string) => {
        if (status === 'Completed') return 'text-green-500';
        if (status === 'Deferred') return 'text-yellow-500';
        return 'text-text-secondary';
    };

    const handleSaveProgress = async (data: SyllabusProgress) => {
        try {
            // The variance logic should be on the backend, but we'll replicate it here for the UI update
            const updatedData = { ...data, variance: data.assignedTopic !== data.taughtTopic };
            await handleSaveEntity('syllabus-progress', updatedData);
            setEditingProgress(null);
        } catch (error) {
            console.error("Failed to save syllabus progress", error);
            // Optionally set an error state to show in the UI
        }
    };

    return (
        <div className="space-y-6">
            <SyllabusUpdateModal
                isOpen={!!editingProgress}
                onClose={() => setEditingProgress(null)}
                progress={editingProgress}
                onSave={handleSaveProgress}
            />
            <h1 className="text-3xl font-bold">IMS & Syllabus Tracking</h1>
            <SectionCard title="My Subjects' Progress">
                <div className="space-y-6">
                    {teacherSubjects.map(subject => {
                        const progress = syllabusProgress.filter(p => p.subjectId === subject.id);
                        const completed = progress.filter(p => p.status === 'Completed').length;
                        const total = progress.length || 1;
                        const completionPercentage = (completed / total) * 100;

                        return (
                            <div key={subject.id} className="p-4 border border-border-primary rounded-lg">
                                <div className="flex justify-between items-center mb-2">
                                    <h4 className="font-bold">{subject.name} ({subject.code})</h4>
                                    <span className="font-semibold">{completionPercentage.toFixed(0)}% Complete</span>
                                </div>
                                <ProgressBar value={completionPercentage} />
                                <div className="mt-4 overflow-auto max-h-60">
                                    <table className="w-full text-sm">
                                        <thead><tr className="text-left bg-bg-tertiary">
                                            <th className="p-2">Lec#</th><th className="p-2">Assigned Topic</th><th className="p-2">Taught Topic</th><th className="p-2">Status</th><th className="p-2">Actions</th>
                                        </tr></thead>
                                        <tbody>
                                            {progress.map(p => (
                                                <tr key={p.id} className="border-b border-border-primary">
                                                    <td className="p-2">{p.lectureNumber}</td>
                                                    <td className="p-2">{p.assignedTopic}</td>
                                                    <td className="p-2">{p.taughtTopic}</td>
                                                    <td className={`p-2 font-semibold ${getStatusColor(p.status)}`}>{p.status}</td>
                                                    <td className="p-2">
                                                        <button onClick={() => setEditingProgress(p)} className="text-accent-primary"><EditIcon /></button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </SectionCard>
        </div>
    );
};

export default IMSPage;