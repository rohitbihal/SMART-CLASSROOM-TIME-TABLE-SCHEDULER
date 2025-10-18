import React from 'react';
import { Link } from 'react-router-dom';
import { User } from '../../types';
import { SchedulerIcon, StudentIcon } from '../../components/Icons';

interface ModuleSelectionPageProps {
    user: User;
}

const ModuleCard = ({ to, icon, title, description }: { to: string; icon: React.ReactNode; title: string; description: string; }) => (
    <Link to={to} className="group card-base hover:border-accent-primary transition-all duration-300 flex flex-col items-start hover:-translate-y-1">
        <div className="bg-blue-100 dark:bg-slate-700 text-accent-primary p-4 rounded-xl mb-5">
            {icon}
        </div>
        <h3 className="text-2xl font-bold mb-2">{title}</h3>
        <p className="text-text-secondary flex-grow">{description}</p>
        <div className="mt-6 text-accent-primary font-semibold group-hover:underline">
            Go to Module &rarr;
        </div>
    </Link>
);

export const ModuleSelectionPage = ({ user }: ModuleSelectionPageProps) => {
    return (
        <div className="min-h-full flex flex-col">
            <div className="flex-grow flex flex-col items-center justify-center text-center">
                <h1 className="text-5xl font-extrabold mb-3">Welcome, Admin</h1>
                <p className="text-xl text-text-secondary mb-12">Choose a module to get started</p>
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