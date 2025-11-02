import React from 'react';
import { SectionCard } from '../../components/common';
import { useAppContext } from '../../context/AppContext';
import { ProfileIcon } from '../../components/Icons';

const TeacherProfilePage = () => {
    const { user, faculty } = useAppContext();

    const teacherProfile = faculty.find(f => f.id === user?.profileId);

    const ProfileField = ({ label, value }: { label: string, value: React.ReactNode }) => (
        <div>
            <p className="text-sm text-text-secondary">{label}</p>
            <p className="font-medium text-lg">{value || 'N/A'}</p>
        </div>
    );

    if (!teacherProfile) {
        return <SectionCard title="My Profile"><p>Could not load your profile information.</p></SectionCard>;
    }

    return (
        <SectionCard title="My Profile">
            <div className="flex flex-col md:flex-row items-center gap-6">
                <div className="h-24 w-24 rounded-full bg-bg-tertiary flex items-center justify-center flex-shrink-0">
                    <ProfileIcon className="h-12 w-12 text-text-secondary" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6 flex-grow">
                    <ProfileField label="Full Name" value={teacherProfile.name} />
                    <ProfileField label="Email Address" value={teacherProfile.email} />
                    <ProfileField label="Employee ID" value={teacherProfile.employeeId} />
                    <ProfileField label="Designation" value={teacherProfile.designation} />
                    <ProfileField label="Department" value={teacherProfile.department} />
                    <ProfileField label="Contact Number" value={teacherProfile.contactNumber} />
                    <ProfileField label="Specializations" value={teacherProfile.specialization.join(', ')} />
                    <ProfileField label="Max Workload" value={`${teacherProfile.maxWorkload} hrs/week`} />
                </div>
            </div>
            <div className="mt-6 pt-6 border-t border-border-primary text-center">
                <p className="text-sm text-text-secondary">If any information is incorrect, please submit a request through the "Requests" section.</p>
            </div>
        </SectionCard>
    );
};

export default TeacherProfilePage;
