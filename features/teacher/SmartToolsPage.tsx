import React from 'react';
import { SectionCard } from '../../App';
import { AIIcon, QuizzesIcon, UploadIcon } from '../../components/Icons';

const ToolButton: React.FC<{ label: string, icon: React.ReactNode, onClick: () => void, className?: string }> = ({ label, icon, onClick, className = '' }) => (
    <button
        onClick={onClick}
        className={`flex items-center justify-center p-6 rounded-xl shadow-lg transition-all duration-300 transform hover:-translate-y-1 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 ${className}`}
    >
        {icon}
        <span className="text-lg font-semibold">{label}</span>
    </button>
);

const ICON_CLASS = "h-8 w-8 mr-4";

export const SmartToolsPage = () => {
    const tools = [
        { label: "Digital Whiteboard", icon: <AIIcon className={ICON_CLASS} /> },
        { label: "Join Live Class", icon: <AIIcon className={ICON_CLASS} /> },
        { label: "Smart Notes", icon: <AIIcon className={ICON_CLASS} /> },
        { label: "Recordings", icon: <AIIcon className={ICON_CLASS} /> },
        { label: "Upload Lesson Plan", icon: <UploadIcon className={ICON_CLASS} /> },
        { label: "Create Quiz", icon: <QuizzesIcon className={ICON_CLASS} /> }
    ];

    return (
        <SectionCard title="Smart Classroom Tools">
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                 {tools.map((tool, index) => (
                    <ToolButton 
                        key={index}
                        label={tool.label}
                        icon={tool.icon}
                        onClick={() => alert(`${tool.label} feature is coming soon!`)}
                        className="bg-gradient-to-r from-teal-500 to-cyan-600 text-white"
                    />
                 ))}
             </div>
        </SectionCard>
    );
};