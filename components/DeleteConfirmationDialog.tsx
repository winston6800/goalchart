
import React from 'react';
import { Node } from '../types';

interface DeleteConfirmationDialogProps {
  node: Node;
  onConfirm: (mode: 'delete-subtree' | 'promote-children') => void;
  onCancel: () => void;
}

export default function DeleteConfirmationDialog({ node, onConfirm, onCancel }: DeleteConfirmationDialogProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md mx-4">
        <h2 className="text-xl font-bold text-white mb-4">Delete Goal</h2>
        <p className="text-gray-300 mb-6">
          The goal <span className="font-semibold text-violet-400">"{node.title}"</span> has {node.children.length} subgoals. What would you like to do?
        </p>
        <div className="space-y-4">
          <button
            onClick={() => onConfirm('delete-subtree')}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 focus:ring-offset-gray-800"
          >
            Delete this goal and all its subgoals
          </button>
          <button
            onClick={() => onConfirm('promote-children')}
            className="w-full flex justify-center py-2 px-4 border border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-300 bg-gray-700 hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
          >
            Delete this goal but promote its subgoals
          </button>
          <button
            onClick={onCancel}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-gray-400 hover:bg-gray-700 focus:outline-none mt-2"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
