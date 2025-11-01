import React from 'react';
import { SectionCard } from '../../App';
import { ExtrasIcon } from '../../components/Icons';

const links = [
    { name: 'Library Portal', url: '#' },
    { name: 'Student Clubs & Societies', url: '#' },
    { name: 'Upcoming Campus Events', url: '#' },
    { name: 'Sports & Recreation', url: '#' },
    { name: 'Career Services', url: '#' },
];

export const ExtrasPage = () => {
    return (
        <SectionCard title="Extra Curricular & Resources">
            <div className="space-y-4">
                {links.map(link => (
                    <a 
                        key={link.name} 
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block p-4 bg-bg-tertiary hover:bg-border-primary rounded-lg transition-colors font-semibold"
                    >
                        {link.name} &rarr;
                    </a>
                ))}
            </div>
        </SectionCard>
    );
};