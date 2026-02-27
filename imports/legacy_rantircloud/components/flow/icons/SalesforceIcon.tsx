import React from 'react';

interface SalesforceIconProps {
  className?: string;
  size?: number;
}

export const SalesforceIcon: React.FC<SalesforceIconProps> = ({ 
  className = "", 
  size = 24 
}) => {
  return (
    <img 
      src="https://cdn.activepieces.com/pieces/salesforce.png" 
      alt="Salesforce" 
      width={size}
      height={size}
      className={className}
    />
  );
};