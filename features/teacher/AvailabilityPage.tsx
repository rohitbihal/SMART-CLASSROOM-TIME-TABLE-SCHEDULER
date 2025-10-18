import React from 'react';
import { PlaceholderContent } from '../dashboard/PlaceholderContent';
import { AvailabilityIcon } from '../../components/Icons';

export const AvailabilityPage = () => {
    return (
        <PlaceholderContent 
            title="My Availability"
            message="This section will allow you to set your teaching availability and preferences for the scheduler."
            icon={<AvailabilityIcon />}
        />
    );
};
