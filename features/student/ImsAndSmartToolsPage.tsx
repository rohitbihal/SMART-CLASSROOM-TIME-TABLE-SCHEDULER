import React from 'react';
import { SectionCard } from '../../App';
import { DownloadIcon, BookOpenIcon, CalculatorIcon, CalendarIcon } from '../../components/Icons';

const ToolCard = ({ title, description, icon, onClick }: { title: string, description: string, icon: React.ReactNode, onClick: () => void }) => (
    <button onClick={onClick} className="text-left p-6 bg-bg-tertiary rounded-xl shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all">
        <div className="mb-4">{icon}</div>
        <h3 className="font-bold text-lg mb-1">{title}</h3>
        <p className="text-sm text-text-secondary">{description}</p>
    </button>
);

export const ImsAndSmartToolsPage = () => {
    const handleToolClick = (toolName: string) => {
        // Placeholder for API calls
        alert(`The "${toolName}" tool will be available soon!`);
    };

    return (
        <SectionCard title="IMS & Smart Tools">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <ToolCard 
                    title="Download Syllabus" 
                    description="Get the latest syllabus for all your subjects." 
                    icon={<DownloadIcon className="h-8 w-8 text-blue-500" />}
                    onClick={() => handleToolClick('Syllabus Downloader')}
                />
                <ToolCard 
                    title="GPA Calculator" 
                    description="Calculate your current and projected GPA." 
                    // FIX: Use CalculatorIcon instead of the placeholder BookOpenIcon.
                    icon={<CalculatorIcon className="h-8 w-8 text-green-500" />}
                    onClick={() => handleToolClick('GPA Calculator')}
                />
                <ToolCard 
                    title="View Timetable" 
                    description="Access your full weekly class schedule." 
                    icon={<CalendarIcon className="h-8 w-8 text-purple-500" />}
                    onClick={() => handleToolClick('Timetable Viewer')}
                />
            </div>
        </SectionCard>
    );
};