
import React, { useState, useEffect } from 'react';
import { Node } from '../types';
import { PALETTE } from '../constants';

interface SidePanelProps {
  node: Node | null;
  parent: Node | null;
  onUpdate: (updatedNode: Node) => void;
  onAddChild: (parentId: string) => void;
  onAddSibling: (siblingId: string) => void;
  onDelete: (nodeId: string) => void;
}

export default function SidePanel({ node, parent, onUpdate, onAddChild, onAddSibling, onDelete }: SidePanelProps) {
  const [formData, setFormData] = useState<Partial<Node>>({});

  useEffect(() => {
    if (node) {
      setFormData(node);
    } else {
      setFormData({});
    }
  }, [node]);

  const totalSiblingImportance = parent ? parent.children.reduce((sum, child) => sum + child.importance, 0) : node?.importance || 1;
  const importancePercentage = node && totalSiblingImportance > 0 ? (node.importance / totalSiblingImportance) * 100 : 100;

  if (!node) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-400">Select a goal to see details</p>
      </div>
    );
  }

  const handleChange = (field: keyof Node, value: any) => {
    const newFormData = { ...formData, [field]: value };
    setFormData(newFormData);
  };
  
  const handleBlur = (field: keyof Node) => {
    if(formData.id && formData[field] !== node[field]) {
        onUpdate(formData as Node);
    }
  }

  return (
    <div className="space-y-6 text-gray-200">
      <div>
        <label htmlFor="title" className="block text-sm font-medium text-gray-400">Title</label>
        <input
          type="text"
          id="title"
          value={formData.title || ''}
          onChange={(e) => handleChange('title', e.target.value)}
          onBlur={() => handleBlur('title')}
          className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-violet-500 focus:border-violet-500 sm:text-sm text-white"
        />
      </div>
      
      <div>
        <label htmlFor="importance" className="block text-sm font-medium text-gray-400">
          Importance ({importancePercentage.toFixed(1)}% of parent)
        </label>
        <input
          type="range"
          id="importance"
          min="0.1"
          max={totalSiblingImportance || 10}
          step="0.1"
          value={formData.importance || 1}
          onChange={(e) => handleChange('importance', parseFloat(e.target.value))}
          onMouseUp={() => handleBlur('importance')}
          onTouchEnd={() => handleBlur('importance')}
          className="mt-1 block w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-violet-500"
        />
      </div>

      <div>
        <label htmlFor="progress" className="block text-sm font-medium text-gray-400">
          Progress ({Math.round((formData.progress || 0) * 100)}%)
        </label>
        <input
          type="range"
          id="progress"
          min="0"
          max="1"
          step="0.01"
          value={formData.progress || 0}
          onChange={(e) => handleChange('progress', parseFloat(e.target.value))}
          onMouseUp={() => handleBlur('progress')}
          onTouchEnd={() => handleBlur('progress')}
          className="mt-1 block w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-emerald-500"
        />
      </div>

      <div>
        <label htmlFor="color" className="block text-sm font-medium text-gray-400">Color</label>
        <div className="mt-2 grid grid-cols-5 gap-2">
            {PALETTE.map(color => (
                <button
                    key={color}
                    type="button"
                    className={`w-12 h-12 rounded-full border-4 ${formData.color === color ? 'border-white' : 'border-transparent'}`}
                    style={{ backgroundColor: color }}
                    onClick={() => {
                        handleChange('color', color);
                        onUpdate({ ...formData, color } as Node);
                    }}
                />
            ))}
        </div>
      </div>

      <div className="pt-6 border-t border-gray-700 space-y-3">
        <h3 className="text-lg font-medium text-white">Actions</h3>
        <button
          onClick={() => onAddChild(node.id)}
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-violet-600 hover:bg-violet-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-violet-500 focus:ring-offset-gray-800"
        >
          Add Subgoal
        </button>
        <button
          onClick={() => onAddSibling(node.id)}
          disabled={!parent}
          className="w-full flex justify-center py-2 px-4 border border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-300 bg-gray-700 hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Add Sibling
        </button>
        <button
          onClick={() => onDelete(node.id)}
          disabled={!node || node.id === 'root'}
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Delete Goal
        </button>
      </div>
    </div>
  );
}
