import React, { useMemo } from 'react';
import * as d3 from 'd3';
import { RenderNode } from '../types';
import { CHART_DIMENSIONS, CENTER_RADIUS, MIN_ARC_PIXELS_FOR_LABEL, SLIVER_THICKNESS_PX, SLIVER_GAP_PX } from '../constants';
import { progressRollup } from '../utils';

interface GoalMapProps {
  nodes: RenderNode[];
  selectedNodeId: string | null;
  onNodeClick: (nodeId: string) => void;
  onNodeDoubleClick: (nodeId: string) => void;
  onCenterSelect: (nodeId: string) => void;
  onCenterDoubleClick: () => void;
}

const ContinuationSlivers: React.FC<{
  node: RenderNode;
  onSliverClick: (nodeId: string) => void;
}> = ({ node, onSliverClick }) => {
  if (!node.hasCollapsedChildren || !node.data.children || node.data.children.length === 0) {
    return null;
  }

  const r0 = node.r1 - SLIVER_THICKNESS_PX;
  const r1 = node.r1;
  const midRadius = (r0 + r1) / 2;

  if (midRadius <= 0) return null;
  
  const gapRad = SLIVER_GAP_PX / midRadius;
  const totalAngle = node.theta1 - node.theta0;

  const parentArcLength = totalAngle * node.r1;
  if (parentArcLength < MIN_ARC_PIXELS_FOR_LABEL * 2) {
      const mergedSliverArc = d3.arc()
        .innerRadius(r0)
        .outerRadius(r1)
        .startAngle(node.theta0)
        .endAngle(node.theta1)
        .cornerRadius(2)();
      
      return (
        <g className="cursor-pointer" onClick={() => onSliverClick(node.nodeId)}>
            <title>+{node.data.children.length} deeper goals (Click to expand)</title>
            <path d={mergedSliverArc || ''} fill={d3.color(node.data.color || 'grey')?.brighter(0.8).toString()} />
        </g>
      );
  }

  const children = [...node.data.children].sort((a, b) => a.title.localeCompare(b.title));
  const totalImportance = children.reduce((sum, child) => sum + child.importance, 0);
  if (totalImportance === 0) return null;

  let currentAngle = node.theta0;

  return (
    <g>
      {children.map(child => {
        const childAngleSpan = totalAngle * (child.importance / totalImportance);
        const startAngle = currentAngle;
        const endAngle = currentAngle + childAngleSpan;
        currentAngle = endAngle;

        if ((endAngle - startAngle - gapRad) * midRadius < 2) return null;

        const sliverArc = d3.arc()
          .innerRadius(r0)
          .outerRadius(r1)
          .startAngle(startAngle + gapRad / 2)
          .endAngle(endAngle - gapRad / 2)
          .cornerRadius(2)();
        
        const childProgress = progressRollup(child);
        const progressR0 = r1 - (r1 - r0) * childProgress;
        
        const progressArc = childProgress > 0 ? d3.arc()
          .innerRadius(progressR0)
          .outerRadius(r1)
          .startAngle(startAngle + gapRad / 2)
          .endAngle(endAngle - gapRad / 2)
          .cornerRadius(2)() : '';

        return (
          <g key={`sliver-child-${child.id}`} className="cursor-pointer group" onClick={() => onSliverClick(child.id)}>
            <title>{`${child.title}\nImportance: ${child.importance.toFixed(1)}\nProgress: ${Math.round(childProgress * 100)}%`}</title>
            <path d={sliverArc || ''} fill={d3.color(node.data.color || 'grey')?.brighter(0.8).toString()} />
            {progressArc && <path d={progressArc} fill={d3.color(node.data.color || 'grey')?.brighter(1.2).toString()} className="pointer-events-none"/>}
          </g>
        )
      })}
    </g>
  );
};

const Arc: React.FC<{
  node: RenderNode;
  isSelected: boolean;
  onClick: (id: string) => void;
  onDoubleClick: (id: string) => void;
}> = ({ node, isSelected, onClick, onDoubleClick }) => {
  const arcGenerator = useMemo(() => {
    return d3.arc()
      .innerRadius(node.r0)
      .outerRadius(node.r1)
      .startAngle(node.theta0)
      .endAngle(node.theta1)
      .padAngle(0.01)
      .cornerRadius(4);
  }, [node.r0, node.r1, node.theta0, node.theta1]);

  const progressArcGenerator = useMemo(() => {
    const progressR0 = node.r1 - (node.r1 - node.r0) * node.displayProgress;
    return d3.arc()
      .innerRadius(progressR0)
      .outerRadius(node.r1)
      .startAngle(node.theta0)
      .endAngle(node.theta1)
      .padAngle(0.01)
      .cornerRadius(4);
  }, [node]);

  const pathD = arcGenerator() || '';
  const progressPathD = node.displayProgress > 0 ? progressArcGenerator() || '' : '';
  
  const arcLength = (node.theta1 - node.theta0) * ((node.r0 + node.r1) / 2);
  const labelFits = arcLength > MIN_ARC_PIXELS_FOR_LABEL;

  const midAngle = (node.theta0 + node.theta1) / 2;
  const textRadius = (node.r0 + node.r1) / 2;
  const textX = textRadius * Math.cos(midAngle - Math.PI / 2);
  const textY = textRadius * Math.sin(midAngle - Math.PI / 2);
  
  let textRotation = (midAngle * 180 / Math.PI) - 90;
  if (textRotation > 90 && textRotation < 270) {
    textRotation -= 180;
  }

  return (
    <g
      className="cursor-pointer group"
      onClick={() => onClick(node.nodeId)}
      onDoubleClick={() => onDoubleClick(node.nodeId)}
    >
      <title>{`${node.data.title}\nImportance: ${node.data.importance.toFixed(1)}\nProgress: ${Math.round(node.displayProgress * 100)}%`}</title>
      
      <path d={pathD} fill={node.data.color || 'grey'} fillOpacity={0.4} stroke={isSelected ? 'white' : node.data.color} strokeWidth={isSelected ? 2 : 1} 
        className="transition-all duration-300 group-hover:fill-opacity-60"
      />
      <path d={progressPathD} fill={node.data.color || 'grey'} fillOpacity={0.8} 
        className="pointer-events-none transition-all duration-300 group-hover:fill-opacity-100"
      />
      
      {labelFits && (
          <text 
            transform={`translate(${textX}, ${textY}) rotate(${textRotation})`}
            textAnchor="middle"
            dominantBaseline="middle"
            className="text-xs pointer-events-none fill-current text-gray-100 font-medium select-none"
            >
              {node.data.title}
          </text>
      )}
    </g>
  );
};


export default function GoalMap({ nodes, selectedNodeId, onNodeClick, onNodeDoubleClick, onCenterSelect, onCenterDoubleClick }: GoalMapProps) {
  const { width, height } = CHART_DIMENSIONS;
  const rootNode = nodes.find(n => n.depth === 0);
  const isAbsoluteRootFocused = rootNode?.nodeId === 'root';

  const renderCenterText = (title: string) => {
    const words = title.split(/\s+/);
    if (words.length === 0) return null;
    
    const lines: string[] = [];
    let currentLine = words[0];

    for (let i = 1; i < words.length; i++) {
        if ((currentLine.length + words[i].length) > 15) { // Character limit per line
            lines.push(currentLine);
            currentLine = words[i];
        } else {
            currentLine += ' ' + words[i];
        }
    }
    lines.push(currentLine);

    const visibleLines = lines.slice(0, 3); // Show max 3 lines
    const startY = -((visibleLines.length - 1) * 7);
    
    return (
        <text textAnchor="middle" className="fill-current text-gray-300 text-sm font-semibold select-none pointer-events-none">
            {visibleLines.map((line, i) => (
                <tspan x="0" y={startY + i * 14} key={i}>{line}</tspan>
            ))}
        </text>
    );
  };

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <g transform={`translate(${width / 2}, ${height / 2})`}>
        {nodes.filter(node => node.depth > 0).map(node => (
          <Arc
            key={node.nodeId}
            node={node}
            isSelected={node.nodeId === selectedNodeId}
            onClick={onNodeClick}
            onDoubleClick={onNodeDoubleClick}
          />
        ))}

        {nodes.filter(node => node.hasCollapsedChildren).map(node => (
          <ContinuationSlivers
            key={`sliver-${node.nodeId}`}
            node={node}
            onSliverClick={onNodeDoubleClick}
          />
        ))}

        <g 
            className="cursor-pointer"
            onClick={() => rootNode && onCenterSelect(rootNode.nodeId)}
            onDoubleClick={!isAbsoluteRootFocused ? onCenterDoubleClick : undefined}
        >
          <circle cx="0" cy="0" r={CENTER_RADIUS} fill="#1F2937" stroke="#4B5563" strokeWidth="2" />
          {rootNode && renderCenterText(rootNode.data.title)}
          {!isAbsoluteRootFocused && (
            <text
                textAnchor="middle"
                y={CENTER_RADIUS - 15}
                className="fill-current text-gray-400 text-[10px] pointer-events-none"
            >
                (Double-click to Zoom Out)
            </text>
          )}
        </g>
      </g>
    </svg>
  );
}
