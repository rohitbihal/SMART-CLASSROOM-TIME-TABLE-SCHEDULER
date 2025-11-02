import React, { useState, useEffect } from 'react';
import { SectionCard } from '../../components/common';
import { DownloadIcon, CalculatorIcon, CalendarIcon, GradebookIcon, PlagiarismCheckerIcon, UploadIcon, SubmitAssignmentIcon, SmartToolsIcon } from '../../components/Icons';
import { SmartTool } from '../../types';
import * as api from '../../services/api';

const iconMap: { [key: string]: React.ReactNode } = {
    Syllabus: <DownloadIcon className="h-8 w-8 text-blue-500" />,
    Calculator: <CalculatorIcon className="h-8 w-8 text-green-500" />,
    Timetable: <CalendarIcon className="h-8 w-8 text-purple-500" />,
    Gradebook: <GradebookIcon className="h-8 w-8 text-teal-500" />,
    Plagiarism: <PlagiarismCheckerIcon className="h-8 w-8 text-red-500" />,
    Upload: <UploadIcon className="h-8 w-8 text-orange-500" />,
    Submit: <SubmitAssignmentIcon className="h-8 w-8 text-indigo-500" />,
};

const ToolCard: React.FC<{ title: string, description: string, icon: React.ReactNode, onClick: () => void }> = ({ title, description, icon, onClick }) => (
    <button onClick={onClick} className="text-left p-6 bg-bg-tertiary rounded-xl shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all">
        <div className="mb-4">{icon || <SmartToolsIcon className="h-8 w-8 text-gray-400" />}</div>
        <h3 className="font-bold text-lg mb-1">{title}</h3>
        <p className="text-sm text-text-secondary">{description}</p>
    </button>
);

export const SmartToolsPage = () => {
    const [tools, setTools] = useState<SmartTool[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const loadTools = async () => {
            try {
                setIsLoading(true);
                setError(null);
                const fetchedTools = await api.fetchTools();
                setTools(fetchedTools);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to load tools.');
            } finally {
                setIsLoading(false);
            }
        };
        loadTools();
    }, []);

    const handleToolClick = (toolName: string) => {
        alert(`The "${toolName}" tool will be available soon!`);
    };

    if (isLoading) return <SectionCard title="IMS & Smart Tools"><div>Loading tools...</div></SectionCard>;
    if (error) return <SectionCard title="IMS & Smart Tools"><div className="text-red-500">{error}</div></SectionCard>;

    return (
        <SectionCard title="IMS & Smart Tools">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {tools.map(tool => (
                    // FIX: Changed ToolCard to a React.FC component which correctly handles the 'key' prop.
                    <ToolCard 
                        key={tool.id}
                        title={tool.title} 
                        description={tool.description} 
                        icon={iconMap[tool.icon]} 
                        onClick={() => handleToolClick(tool.title)}
                    />
                ))}
            </div>
        </SectionCard>
    );
};