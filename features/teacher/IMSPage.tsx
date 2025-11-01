import React from 'react';
import { SectionCard } from '../../components/common';
import { UploadIcon, AnalyticsIcon, GradebookIcon } from '../../components/Icons';

// FIX: Defined missing style constants to prevent runtime ReferenceError.
const IMS_BUTTON_STYLE = "flex flex-col items-center justify-center p-8 rounded-xl shadow-lg transition-all duration-300 ease-in-out transform hover:-translate-y-1 hover:shadow-2xl";
const ICON_STYLE = "h-10 w-10 mb-4";
const TEXT_STYLE = "text-xl font-bold";

export const IMSPage = () => {
    return (
        <div className="space-y-6">
            <SectionCard title="IMS">
                 <p className="text-text-secondary mb-8">Upload grades, manage assignments/resources, and review analytics.</p>
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                     <button
                        className={`${IMS_BUTTON_STYLE} bg-gradient-to-br from-teal-400 to-cyan-500 text-white`}
                        onClick={() => alert('Upload Grades functionality coming soon!')}
                    >
                        <UploadIcon className={ICON_STYLE} />
                        <span className={TEXT_STYLE}>Upload Grades</span>
                    </button>
                    <button
                        className={`${IMS_BUTTON_STYLE} bg-gradient-to-br from-cyan-500 to-blue-600 text-white`}
                        onClick={() => alert('Manage Assignments functionality coming soon!')}
                    >
                         <GradebookIcon className={ICON_STYLE} />
                        <span className={TEXT_STYLE}>Manage Assignments</span>
                    </button>
                    <button
                        className={`${IMS_BUTTON_STYLE} bg-gradient-to-br from-blue-600 to-indigo-700 text-white`}
                        onClick={() => alert('Performance Analytics functionality coming soon!')}
                    >
                         <AnalyticsIcon className={ICON_STYLE} />
                        <span className={TEXT_STYLE}>Performance Analytics</span>
                    </button>
                 </div>
            </SectionCard>
        </div>
    );
};