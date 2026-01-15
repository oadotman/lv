'use client';

import React from 'react';

interface LoadEditModalProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export default function LoadEditModal({ isOpen = false, onClose }: LoadEditModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full">
        <h2 className="text-xl font-bold mb-4">Load Edit Modal</h2>
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
