import React from 'react';
import { PlaceholderContent } from '../dashboard/PlaceholderContent';
import { IMSIcon } from '../../components/Icons';

export const IMSPage = () => {
    return (
        <PlaceholderContent 
            title="IMS"
            message="The Information Management System (IMS) for teachers is under development."
            icon={<IMSIcon />}
        />
    );
};
