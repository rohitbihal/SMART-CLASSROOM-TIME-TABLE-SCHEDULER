import React from 'react';
import { Link } from 'react-router-dom';
import { User } from '../../types';
import { SchedulerIcon, StudentIcon } from '../../components/Icons';

interface ModuleSelectionPageProps {
    user: User;
}

const ModuleCard = ({ to, icon, title, description }: { to: string; icon: React.ReactNode; title: string; description: string; }) => (
    <Link to={to} className="group bg-white dark:bg-slate-800 p-8 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-lg hover:shadow-xl hover:border-indigo-500 dark:hover:border-indigo-500 transition-all duration-300 flex flex-col items-start hover:-translate-y-1">
        <div className="bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-300 p-4 rounded-xl mb-5">
            {icon}
        </div>
        <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-2">{title}</h3>
        <p className="text-slate-500 dark:text-slate-400 flex-grow">{description}</p>
        <div className="mt-6 text-indigo-600 dark:text-indigo-400 font-semibold group-hover:underline">
            Go to Module &rarr;
        </div>
    </Link>
);

export const ModuleSelectionPage = ({ user }: ModuleSelectionPageProps) => {
    return (
        <div className="min-h-screen p-4 sm:p-6 lg:p-8 flex flex-col">
            <div className="flex-grow flex flex-col items-center justify-center text-center">
                <h1 className="text-5xl font-extrabold text-slate-800 dark:text-slate-100 mb-3">Welcome, Admin</h1>
                <p className="text-xl text-slate-500 dark:text-slate-400 mb-12">Choose a module to get started</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl">
                    <ModuleCard
                        to="/scheduler"
                        icon={<SchedulerIcon className="h-8 w-8" />}
                        title="Timetable Scheduler"
                        description="AI-powered engine to generate, manage, and optimize class schedules, rooms, and faculty workload."
                    />
                    <ModuleCard
                        to="/smart-classroom"
                        icon={<StudentIcon className="h-8 w-8" />}
                        title="Smart Classroom"
                        description="Manage student and faculty data, track classroom attendance, and oversee user accounts."
                    />
                </div>
            </div>
        </div>
    );
};