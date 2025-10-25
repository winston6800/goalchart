import React, { useMemo } from 'react';
// FIX: Import d3 library to resolve reference errors.
import * as d3 from 'd3';
import { RenderNode } from '../types';
import { CHART_DIMENSIONS, CENTER_RADIUS } from '../constants';

interface GoalMapProps {
  nodes: RenderNode[];
  selectedNodeId: string | null;
  onNodeClick: (nodeId: string) => void;
  onNodeDoubleClick: (nodeId: string) => void;
  onCenterClick: () => void;
}

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
    const progressR0 = node.r1 - (node.r1 - node.r0) * node.data.progress;
    return d3.arc()
      .innerRadius(progressR0)
      .outerRadius(node.r1)
      .startAngle(node.theta0)
      .endAngle(node.theta1)
      .padAngle(0.01)
      .cornerRadius(4);
  }, [node]);

  const pathD = arcGenerator() || '';
  const progressPathD = node.data.progress > 0 ? progressArcGenerator() || '' : '';
  
  const arcLength = (node.theta1 - node.theta0) * ((node.r0 + node.r1) / 2);
  const labelFits = (node.data.title.length * 8) < arcLength;

  const textPathId = `textpath-${node.nodeId}`;
  
  const angle = (node.theta0 + node.theta1) / 2;
  const isFlipped = angle > Math.PI / 2 && angle < 3 * Math.PI / 2;

  const textArcPathD = useMemo(() => {
    const textRadius = (node.r0 + node.r1) / 2;
    // For flipped text, swap start and end angles to reverse path direction
    const startAngle = isFlipped ? node.theta1 : node.theta0;
    const endAngle = isFlipped ? node.theta0 : node.theta1;
    return d3.arc()({
        innerRadius: textRadius,
        outerRadius: textRadius,
        startAngle,
        endAngle,
      }) || undefined
  }, [node.r0, node.r1, node.theta0, node.theta1, isFlipped]);


  return (
    <g
      className="cursor-pointer group"
      onClick={() => onClick(node.nodeId)}
      onDoubleClick={() => onDoubleClick(node.nodeId)}
    >
      <title>{`${node.data.title}\nImportance: ${node.data.importance.toFixed(1)}\nProgress: ${Math.round(node.data.progress * 100)}%`}</title>
      
      <path d={pathD} fill={node.data.color || 'grey'} fillOpacity={0.4} stroke={isSelected ? 'white' : node.data.color} strokeWidth={isSelected ? 2 : 1} 
        className="transition-all duration-300 group-hover:fill-opacity-60"
      />
      <path d={progressPathD} fill={node.data.color || 'grey'} fillOpacity={0.8} 
        className="pointer-events-none transition-all duration-300 group-hover:fill-opacity-100"
      />
      
      {/* Path for text to follow, always in DOM but invisible */}
      <path
        d={textArcPathD}
        id={textPathId}
        fill="none"
      />

      {labelFits && node.depth > 0 && (
          <text 
            // Adjust vertical position for better centering
            dy={isFlipped ? "-0.35em" : "0.75em"} 
            className="text-xs pointer-events-none fill-current text-gray-100 font-medium select-none"
            >
            <textPath href={`#${textPathId}`} startOffset="50%" textAnchor="middle">
              {node.data.title}
            </textPath>
          </text>
      )}
    </g>
  );
};


export default function GoalMap({ nodes, selectedNodeId, onNodeClick, onNodeDoubleClick, onCenterClick }: GoalMapProps) {
  const { width, height } = CHART_DIMENSIONS;
  const rootNode = nodes.find(n => n.depth === 0);

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <g transform={`translate(${width / 2}, ${height / 2})`}>
        {nodes.map(node => (
          node.depth > 0 && <Arc
            key={node.nodeId}
            node={node}
            isSelected={node.nodeId === selectedNodeId}
            onClick={onNodeClick}
            onDoubleClick={onNodeDoubleClick}
          />
        ))}
        <g className="cursor-pointer" onClick={onCenterClick}>
          <circle cx="0" cy="0" r={CENTER_RADIUS} fill="#1F2937" stroke="#4B5563" strokeWidth="2" />
           <text
            textAnchor="middle"
            dy="0.1em"
            className="fill-current text-gray-300 text-[10px] font-semibold"
          >
             {rootNode?.data.title.substring(0,8)}
          </text>
           <text
            textAnchor="middle"
            dy="1.2em"
            className="fill-current text-gray-400 text-[9px]"
          >
             (Back)
          </text>
        </g>
      </g>
    </svg>
  );
}