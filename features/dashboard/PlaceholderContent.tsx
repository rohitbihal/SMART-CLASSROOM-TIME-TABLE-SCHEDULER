import React from 'react';

export const PlaceholderContent = ({ title, message, icon }: { title: string; message: string; icon: React.ReactElement<{ className?: string }> }) => (
    <div className="flex flex-col items-center justify-center h-96 bg-gray-100 dark:bg-slate-800/50 rounded-2xl p-8">
        {React.cloneElement(icon, { className: "h-16 w-16 text-gray-400 dark:text-gray-500 mb-4" })}
        <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100">{title}</h3>
        <p className="text-gray-500 dark:text-gray-400 mt-2 text-center">{message}</p>
    </div>
);