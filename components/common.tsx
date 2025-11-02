import React from 'react';

// --- SHARED UI COMPONENTS ---
// FIX: Made children prop optional to fix widespread 'property is missing' errors.
export const SectionCard = ({ title, actions, children, className }: { title: string; actions?: React.ReactNode; children?: React.ReactNode; className?: string }) => (
    <div className={`bg-bg-secondary border border-border-primary rounded-xl shadow-sm ${className}`}>
        <div className="flex items-center justify-between p-4 border-b border-border-primary">
            <h2 className="text-lg font-bold">{title}</h2>
            {actions && <div>{actions}</div>}
        </div>
        <div className="p-4">{children}</div>
    </div>
);

// FIX: Made children prop optional to fix widespread 'property is missing' errors.
export const Modal = ({ isOpen, onClose, title, children, size = '2xl', error }: { isOpen: boolean; onClose: () => void; title: string; children?: React.ReactNode; size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | '6xl' | '7xl'; error?: string | null }) => {
    if (!isOpen) return null;
    const sizeClasses: {[key: string]: string} = { sm: 'sm:max-w-sm', md: 'sm:max-w-md', lg: 'sm:max-w-lg', xl: 'sm:max-w-xl', '2xl': 'sm:max-w-2xl', '3xl': 'sm:max-w-3xl', '4xl': 'sm:max-w-4xl', '5xl': 'sm:max-w-5xl', '6xl': 'sm:max-w-6xl', '7xl': 'sm:max-w-7xl' };
    return (
        <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
            <div className="flex items-end justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
                <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true" onClick={onClose}></div>
                <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
                <div className={`inline-block align-bottom bg-bg-secondary rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle w-full ${sizeClasses[size]}`}>
                    <div className="bg-bg-secondary px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                        <div className="sm:flex sm:items-start">
                            <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                                <h3 className="text-lg leading-6 font-medium text-text-primary" id="modal-title">{title}</h3>
                                {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mt-3" role="alert">{error}</div>}
                                <div className="mt-4">
                                    {children}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// FIX: Made children prop optional to fix widespread 'property is missing' errors.
export const FormField = ({ label, htmlFor, children }: { label: string; htmlFor: string; children?: React.ReactNode }) => (
    <div>
        <label htmlFor={htmlFor} className="block text-sm font-medium text-text-secondary mb-1">{label}</label>
        {children}
    </div>
);

export const TextInput = (props: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input {...props} className={`input-base ${props.className || ''}`} />
);

export const SelectInput = (props: React.SelectHTMLAttributes<HTMLSelectElement>) => (
    <select {...props} className={`input-base ${props.className || ''}`}>
        {props.children}
    </select>
);

export const SearchInput = ({ value, onChange, placeholder, label, id }: { value: string; onChange: (value: string) => void; placeholder?: string; label: string; id: string }) => (
    <div className="relative">
        <label htmlFor={id} className="sr-only">{label}</label>
        <input
            id={id}
            type="search"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder || "Search..."}
            className="w-full pl-10 pr-4 py-2 border border-border-primary rounded-md bg-bg-primary focus:ring-accent-primary focus:border-accent-primary"
        />
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
            </svg>
        </div>
    </div>
);

export const ErrorDisplay = ({ message }: { message: string | null }) => {
    if (!message) return null;
    return (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative my-4" role="alert">
            <strong className="font-bold">Error: </strong>
            <span className="block sm:inline">{message}</span>
        </div>
    );
};

export const FeedbackBanner = ({ feedback, onDismiss }: { feedback: { type: 'success' | 'error', message: string } | null, onDismiss: () => void }) => {
    if (!feedback) return null;
    const isSuccess = feedback.type === 'success';
    const baseClasses = 'fixed top-5 right-5 z-50 p-4 rounded-lg shadow-lg flex items-center gap-3';
    const colorClasses = isSuccess
        ? 'bg-green-100 dark:bg-green-900/50 border border-green-400 dark:border-green-600 text-green-800 dark:text-green-200'
        : 'bg-red-100 dark:bg-red-900/50 border border-red-400 dark:border-red-600 text-red-800 dark:text-red-200';

    const CloseIcon = () => (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
    );

    return (
        <div className={`${baseClasses} ${colorClasses}`}>
            <span>{feedback.message}</span>
            <button onClick={onDismiss} className="p-1 -mr-1 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors">
                <CloseIcon />
            </button>
        </div>
    );
};