import React from 'react';
import { Outlet } from 'react-router-dom';

// This component acts as the main layout for all teacher-specific pages.
// It renders nested routes defined in App.tsx within its structure.
const TeacherDashboardLayout = () => {
    return (
        <div>
            {/* The <Outlet /> component from react-router-dom is a placeholder
                where the child routes (like attendance, IMS, etc.) will be rendered. */}
            <Outlet />
        </div>
    );
};

export default TeacherDashboardLayout;
