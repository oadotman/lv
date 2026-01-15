const fs = require('fs');
const path = require('path');

// List of components that don't exist based on file system check
const missingComponents = [
  // Dashboard components
  { file: 'components/dashboard/DashboardStats.tsx', export: 'default' },
  { file: 'components/dashboard/RecentExtractions.tsx', export: 'default' },
  { file: 'components/dashboard/LoadsOverview.tsx', export: 'default' },

  // Loads components
  { file: 'components/loads/LoadsTable.tsx', export: 'default' },
  { file: 'components/loads/LoadDetails.tsx', export: 'default' },
  { file: 'components/loads/LoadForm.tsx', export: 'default' },
  { file: 'components/loads/RateConfirmationViewer.tsx', export: 'default' },
  { file: 'components/modals/LoadEditModal.tsx', export: 'default' },

  // Carriers components
  { file: 'components/carriers/CarriersTable.tsx', export: 'default' },
  { file: 'components/carriers/CarrierDetails.tsx', export: 'default' },
  { file: 'components/modals/CarrierSearchModal.tsx', export: 'default' },

  // Extraction components
  { file: 'components/extraction/ExtractionFlow.tsx', export: 'ExtractionFlow' },
  { file: 'components/extraction/ExtractionInbox.tsx', export: 'default' },

  // Calls components
  { file: 'components/calls/AudioPlayer.tsx', export: 'default' },
  { file: 'components/calls/TranscriptViewer.tsx', export: 'default' },

  // Charts components
  { file: 'components/charts/PerformanceChart.tsx', export: 'default' },
  { file: 'components/charts/LaneAnalytics.tsx', export: 'default' },

  // Settings pages that might not exist
  { file: 'app/settings/integrations/page.tsx', export: 'default' }
];

// Create placeholder components
missingComponents.forEach(({ file, export: exportName }) => {
  const filePath = path.join(__dirname, file);
  const dir = path.dirname(filePath);

  // Check if file already exists
  if (fs.existsSync(filePath)) {
    console.log(`✓ File already exists: ${file}`);
    return;
  }

  // Ensure directory exists
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`Created directory: ${dir}`);
  }

  // Create placeholder content based on component type
  let content = '';
  const componentName = path.basename(file, '.tsx');

  if (file.includes('page.tsx')) {
    // Page component
    content = `'use client';

import React from 'react';

export default function ${componentName.replace(/[-_]/g, '')}Page() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">${componentName.replace(/[-_]/g, ' ')}</h1>
      <p className="text-gray-600">This page is under construction.</p>
    </div>
  );
}
`;
  } else if (file.includes('Modal')) {
    // Modal component
    content = `'use client';

import React from 'react';

interface ${componentName}Props {
  isOpen?: boolean;
  onClose?: () => void;
}

export default function ${componentName}({ isOpen = false, onClose }: ${componentName}Props) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full">
        <h2 className="text-xl font-bold mb-4">${componentName.replace(/([A-Z])/g, ' $1').trim()}</h2>
        <p className="text-gray-600 mb-4">This modal is under construction.</p>
        <button
          onClick={onClose}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Close
        </button>
      </div>
    </div>
  );
}
`;
  } else if (file.includes('Table')) {
    // Table component
    content = `'use client';

import React from 'react';

export default function ${componentName}() {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              ${componentName.replace(/([A-Z])/g, ' $1').trim()}
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          <tr>
            <td className="px-6 py-4 text-sm text-gray-500">
              No data available
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
`;
  } else if (file.includes('Chart') || file.includes('Analytics')) {
    // Chart component
    content = `'use client';

import React from 'react';

export default function ${componentName}() {
  return (
    <div className="bg-white p-4 rounded-lg shadow">
      <h3 className="text-lg font-semibold mb-2">${componentName.replace(/([A-Z])/g, ' $1').trim()}</h3>
      <div className="h-64 flex items-center justify-center bg-gray-100 rounded">
        <p className="text-gray-500">Chart placeholder</p>
      </div>
    </div>
  );
}
`;
  } else if (componentName === 'ExtractionFlow') {
    // Special case for ExtractionFlow with named export
    content = `'use client';

import React from 'react';

export function ExtractionFlow() {
  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Extraction Flow</h2>
      <div className="space-y-4">
        <div className="p-4 border rounded">
          <p className="text-gray-600">Extraction flow component is under construction.</p>
        </div>
      </div>
    </div>
  );
}

export default ExtractionFlow;
`;
  } else {
    // Generic component
    content = `'use client';

import React from 'react';

export default function ${componentName}() {
  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">${componentName.replace(/([A-Z])/g, ' $1').trim()}</h2>
      <div className="p-4 bg-gray-100 rounded">
        <p className="text-gray-600">This component is under construction.</p>
      </div>
    </div>
  );
}
`;
  }

  // Write the file
  fs.writeFileSync(filePath, content);
  console.log(`✓ Created placeholder: ${file}`);
});

console.log('\n✨ All missing components have been created as placeholders!');
console.log('Now running build to check for remaining errors...');