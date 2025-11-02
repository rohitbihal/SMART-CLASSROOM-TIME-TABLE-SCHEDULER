import React from 'react';
import { SectionCard } from '../../components/common';
import { useAppContext } from '../../context/AppContext';
import { ProfileIcon } from '../../components/Icons';

const MyProfilePage = () => {
    const { user, students, classes } = useAppContext();

    const studentProfile = students.find(s => s.id === user?.profileId);
    const classProfile = classes.find(c => c.id === studentProfile?.classId);

    const ProfileField = ({ label, value }: { label: string, value: React.ReactNode }) => (
        <div>
            <p className="text-sm text-text-secondary">{label}</p>
            <p className="font-medium text-lg">{value || 'N/A'}</p>
        </div>
    );

    if (!studentProfile) {
        return <SectionCard title="My Profile"><p>Could not load your profile information.</p></SectionCard>;
    }

    return (
        <SectionCard title="My Profile">
            <div className="flex flex-col md:flex-row items-center gap-6">
                <div className="h-24 w-24 rounded-full bg-bg-tertiary flex items-center justify-center flex-shrink-0">
                    <ProfileIcon className="h-12 w-12 text-text-secondary" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6 flex-grow">
                    <ProfileField label="Full Name" value={studentProfile.name} />
                    <ProfileField label="Email Address" value={studentProfile.email} />
                    <ProfileField label="Class" value={classProfile?.name} />
                    <ProfileField label="Roll Number" value={studentProfile.roll} />
                    <ProfileField label="Contact Number" value={studentProfile.contactNumber} />
                </div>
            </div>
            <div className="mt-6 pt-6 border-t border-border-primary text-center">
                <p className="text-sm text-text-secondary">If any information is incorrect, please submit a query through the "Help & Queries" section.</p>
            </div>
        </SectionCard>
    );
};

export default MyProfilePage;
