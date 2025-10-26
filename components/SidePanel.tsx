
import React, { useState, useEffect, useMemo } from 'react';
import { Node } from '../types';
import { PALETTE } from '../constants';
import * as d3 from 'd3';

interface SidePanelProps {
  node: Node | null;
  parent: Node | null;
  displayProgress?: number;
  onUpdate: (updatedNode: Node) => void;
  onAddChild: (parentId: string) => void;
  onAddSibling: (siblingId: string) => void;
  onDelete: (nodeId: string) => void;
}

// FIX: Changed component definition to use React.FC to correctly type it as a React component. This allows the use of special React props like 'key' without causing a TypeScript error.
const SidePanel: React.FC<SidePanelProps> = ({ node, parent, displayProgress, onUpdate, onAddChild, onAddSibling, onDelete }) => {
  const [formData, setFormData] = useState<Partial<Node>>({});

  useEffect(() => {
    if (node) {
      setFormData(node);
    } else {
      setFormData({});
    }
  }, [node]);

  const isRootNode = !parent;
  const totalSiblingImportance = parent ? parent.children.reduce((sum, child) => sum + child.importance, 0) : 0;
  
  const importanceRangeMax = isRootNode 
    ? Math.max(10, (node?.importance || 1) * 2) 
    : totalSiblingImportance;

  const importancePercentage = node && totalSiblingImportance > 0 ? (node.importance / totalSiblingImportance) * 100 : 100;

  const importanceLabel = isRootNode ? 'Absolute' : `${importancePercentage.toFixed(1)}% of parent`;

  const hasChildren = node && node.children.length > 0;
  
  const currentColor = formData.color || PALETTE[0];
  const currentHsl = useMemo(() => {
    try {
      return d3.hsl(currentColor);
    } catch {
      return d3.hsl(PALETTE[0]);
    }
  }, [currentColor]);

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

  const handlePaletteSelect = (color: string) => {
    handleChange('color', color);
    onUpdate({ ...formData, color } as Node);
  };

  const handleLightnessChange = (l: number) => {
    const newColor = d3.hsl(currentColor);
    newColor.l = l;
    if (newColor.s === 0 && PALETTE.every(p => p !== newColor.toString())) {
        const originalHsl = d3.hsl(node?.color || PALETTE[0]);
        newColor.s = originalHsl.s > 0.1 ? originalHsl.s : 0.5;
    }
    handleChange('color', newColor.toString());
  };
  
  const sliderBackground = useMemo(() => {
    const c = d3.hsl(currentColor);
    c.s = Math.max(c.s, 0.5);
    const start = d3.hsl(c.h, c.s, 0.2).toString();
    const mid = d3.hsl(c.h, c.s, 0.5).toString();
    const end = d3.hsl(c.h, c.s, 0.8).toString();
    return `linear-gradient(to right, ${start}, ${mid}, ${end})`;
  }, [currentColor]);


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
        <label htmlFor="context" className="block text-sm font-medium text-gray-400">Context / Notes</label>
        <textarea
          id="context"
          rows={4}
          value={formData.context || ''}
          onChange={(e) => handleChange('context', e.target.value)}
          onBlur={() => handleBlur('context')}
          className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-violet-500 focus:border-violet-500 sm:text-sm text-white resize-y"
          placeholder="Add extra details, links, or notes here..."
        />
      </div>
      
      <div>
        <label htmlFor="importance" className="block text-sm font-medium text-gray-400">
          Importance ({importanceLabel})
        </label>
        <input
          type="range"
          id="importance"
          min="0.1"
          max={importanceRangeMax}
          step="0.1"
          value={formData.importance || 1}
          onChange={(e) => handleChange('importance', parseFloat(e.target.value))}
          onMouseUp={() => handleBlur('importance')}
          onTouchEnd={() => handleBlur('importance')}
          className="mt-1 block w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-violet-500"
        />
      </div>

      {hasChildren && displayProgress !== undefined && (
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-400">
            Total Progress (from subgoals)
          </label>
          <div className="w-full bg-gray-600 rounded-full h-4 relative">
            <div 
              className="bg-sky-500 h-4 rounded-full" 
              style={{ width: `${Math.round(displayProgress * 100)}%` }}
            />
             <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white">
               {Math.round(displayProgress * 100)}%
            </span>
          </div>
        </div>
      )}

      <div>
        <label htmlFor="progressSelf" className="block text-sm font-medium text-gray-400">
          {hasChildren ? 'Self Progress (work not in subgoals)' : 'Progress'} ({Math.round((formData.progressSelf || 0) * 100)}%)
        </label>
        <input
          type="range"
          id="progressSelf"
          min="0"
          max="1"
          step="0.01"
          value={formData.progressSelf || 0}
          onChange={(e) => handleChange('progressSelf', parseFloat(e.target.value))}
          onMouseUp={() => handleBlur('progressSelf')}
          onTouchEnd={() => handleBlur('progressSelf')}
          className="mt-1 block w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-emerald-500"
        />
      </div>

      <div className="space-y-4">
        <label htmlFor="color" className="block text-sm font-medium text-gray-400">Color</label>
        <div className="grid grid-cols-5 gap-2">
            {PALETTE.map(color => (
                <button
                    key={color}
                    type="button"
                    className={`w-12 h-12 rounded-full border-4 transition-transform transform hover:scale-110 ${
                        d3.hsl(currentColor).h === d3.hsl(color).h && d3.hsl(currentColor).s === d3.hsl(color).s
                        ? 'border-white' 
                        : 'border-transparent'
                    }`}
                    style={{ backgroundColor: color }}
                    onClick={() => handlePaletteSelect(color)}
                />
            ))}
        </div>
        <div>
            <label htmlFor="tint" className="block text-sm font-medium text-gray-400">Tint</label>
            <input
                type="range"
                id="tint"
                min="0.1"
                max="0.9"
                step="0.01"
                value={currentHsl.l}
                onChange={(e) => handleLightnessChange(parseFloat(e.target.value))}
                onMouseUp={() => handleBlur('color')}
                onTouchEnd={() => handleBlur('color')}
                style={{ background: sliderBackground }}
                className="mt-1 block w-full h-3 appearance-none cursor-pointer rounded-lg overflow-hidden [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-md"
            />
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

export default SidePanel;
