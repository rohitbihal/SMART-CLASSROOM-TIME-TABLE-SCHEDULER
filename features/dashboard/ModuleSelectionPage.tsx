import React from 'react';
import { Link } from 'react-router-dom';
import { User } from '../../types.ts';
import { SchedulerIcon, StudentIcon } from '../../components/Icons.tsx';

interface ModuleSelectionPageProps {
    user: User;
}

const ModuleCard = ({ to, icon, title, description }: { to: string; icon: React.ReactNode; title: string; description: string; }) => (
    <Link to={to} className="group bg-white dark:bg-slate-800 p-6 rounded-lg border border-gray-200 dark:border-slate-700 shadow-sm hover:shadow-lg hover:border-indigo-500 dark:hover:border-indigo-500 transition-all duration-300 flex flex-col items-start">
        <div className="bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-300 p-3 rounded-lg mb-4">
            {icon}
        </div>
        <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-2">{title}</h3>
        <p className="text-gray-500 dark:text-gray-400">{description}</p>
    </Link>
);

export const ModuleSelectionPage = ({ user }: ModuleSelectionPageProps) => {
    return (
        <div className="min-h-screen p-4 sm:p-6 lg:p-8 flex flex-col">
            <div className="flex-grow flex flex-col items-center justify-center text-center">
                <h1 className="text-4xl font-extrabold text-gray-800 dark:text-gray-100 mb-2">Smart Campus</h1>
                <p className="text-lg text-gray-500 dark:text-gray-400 mb-12">Choose a module to continue</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl">
                    <ModuleCard
                        to="/scheduler"
                        icon={<SchedulerIcon className="h-8 w-8" />}
                        title="Timetable Scheduler"
                        description="Create and manage class schedules, rooms, and faculty workload."
                    />
                    <ModuleCard
                        to="/smart-classroom"
                        icon={<StudentIcon className="h-8 w-8" />}
                        title="Smart Classroom"
                        description="Manage classroom sessions, attendance, and in-class resources."
                    />
                </div>
            </div>
        </div>
    );
};