import React from 'react';
import { PlaceholderContent } from '../dashboard/PlaceholderContent';
import { RequestsIcon } from '../../components/Icons';

export const RequestsPage = () => {
    return (
        <PlaceholderContent 
            title="My Requests"
            message="Submit and track requests for leave, schedule changes, or resources here."
            icon={<RequestsIcon />}
        />
    );
};
