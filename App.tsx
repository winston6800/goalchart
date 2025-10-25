
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Node } from './types';
import GoalMap from './components/GoalMap';
import SidePanel from './components/SidePanel';
import Breadcrumbs from './components/Breadcrumbs';
import { sampleData, findNodeById, updateNodeInTree, generateRenderNodes, findNodePath, generateId, addNodeToTree, removeNodeFromTree } from './utils';
import { CHART_DIMENSIONS, TRANSITION_DURATION } from './constants';

export default function App() {
  const [allGoalData, setAllGoalData] = useState<Node>(sampleData);
  const [focusedNodeId, setFocusedNodeId] = useState<string>('root');
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>('root');
  const [isTransitioning, setIsTransitioning] = useState(false);

  const focusedNode = useMemo(() => findNodeById(allGoalData, focusedNodeId) || allGoalData, [allGoalData, focusedNodeId]);
  const selectedNode = useMemo(() => selectedNodeId ? findNodeById(allGoalData, selectedNodeId) : null, [allGoalData, selectedNodeId]);
  const breadcrumbsPath = useMemo(() => findNodePath(allGoalData, focusedNodeId), [allGoalData, focusedNodeId]);
  
  const parentOfSelected = useMemo(() => {
    if (!selectedNodeId) return null;
    const path = findNodePath(allGoalData, selectedNodeId);
    return path.length > 1 ? path[path.length - 2] : null;
  }, [allGoalData, selectedNodeId]);

  const renderNodes = useMemo(() => generateRenderNodes(focusedNode, CHART_DIMENSIONS.width, CHART_DIMENSIONS.height), [focusedNode]);

  const handleNodeClick = useCallback((nodeId: string) => {
    setSelectedNodeId(nodeId);
  }, []);

  const handleNodeDoubleClick = useCallback((nodeId: string) => {
    setIsTransitioning(true);
    setTimeout(() => {
      setFocusedNodeId(nodeId);
      setSelectedNodeId(nodeId);
      setIsTransitioning(false);
    }, TRANSITION_DURATION);
  }, []);

  const handleBreadcrumbClick = useCallback((nodeId: string) => {
     if(nodeId === focusedNodeId) return;
    setIsTransitioning(true);
    setTimeout(() => {
      setFocusedNodeId(nodeId);
      setSelectedNodeId(nodeId);
      setIsTransitioning(false);
    }, TRANSITION_DURATION);
  }, [focusedNodeId]);
  
  const handleCenterClick = useCallback(() => {
    if(focusedNode.id === allGoalData.id) return;
    const parentPath = findNodePath(allGoalData, focusedNodeId);
    if(parentPath.length > 1) {
       const parentId = parentPath[parentPath.length - 2].id;
       handleBreadcrumbClick(parentId);
    }
  }, [allGoalData.id, focusedNodeId, handleBreadcrumbClick]);


  const handleUpdateNode = useCallback((updatedNode: Node) => {
    const originalNode = findNodeById(allGoalData, updatedNode.id);
    if (!originalNode) return;
    
    const parentPath = findNodePath(allGoalData, updatedNode.id);
    const parent = parentPath.length > 1 ? parentPath[parentPath.length - 2] : null;

    let updatedTree = allGoalData;

    // If importance changes, adjust siblings proportionally to keep total constant
    if (parent && originalNode.importance !== updatedNode.importance) {
      const siblings = parent.children.filter(c => c.id !== updatedNode.id);
      const importanceDelta = updatedNode.importance - originalNode.importance;
      const totalOtherSiblingImportance = siblings.reduce((sum, s) => sum + s.importance, 0);

      const updatedSiblings = siblings.map(sibling => {
        if (totalOtherSiblingImportance > 0) {
          const proportionalChange = importanceDelta * (sibling.importance / totalOtherSiblingImportance);
          return { ...sibling, importance: Math.max(0.1, sibling.importance - proportionalChange) };
        }
        return sibling;
      });
      
      const newParentChildren = [updatedNode, ...updatedSiblings].sort((a,b) => a.title.localeCompare(b.title));
      const updatedParent = { ...parent, children: newParentChildren };
      updatedTree = updateNodeInTree(allGoalData, updatedParent);
    } else {
       updatedTree = updateNodeInTree(allGoalData, updatedNode);
    }

    setAllGoalData(updatedTree);
  }, [allGoalData]);

  const handleAddChild = useCallback((parentId: string) => {
    const parentNode = findNodeById(allGoalData, parentId);
    const newNode: Node = {
        id: generateId(),
        title: 'New Subgoal',
        importance: 1,
        progress: 0,
        children: [],
        color: parentNode?.color,
    };
    const updatedTree = addNodeToTree(allGoalData, parentId, newNode);
    setAllGoalData(updatedTree);
    setSelectedNodeId(newNode.id);
  }, [allGoalData]);

  const handleAddSibling = useCallback((siblingId: string) => {
    const path = findNodePath(allGoalData, siblingId);
    if (path.length < 2) return;
    const parent = path[path.length - 2];
    
    const newNode: Node = {
        id: generateId(),
        title: 'New Goal',
        importance: 1,
        progress: 0,
        children: [],
        color: parent.color,
    };
    const updatedTree = addNodeToTree(allGoalData, parent.id, newNode);
    setAllGoalData(updatedTree);
    setSelectedNodeId(newNode.id);
  }, [allGoalData]);

  const handleDeleteNode = useCallback((nodeId: string) => {
    if (nodeId === 'root') {
        alert("Cannot delete the root goal.");
        return;
    }
    if (window.confirm('Are you sure you want to delete this goal and all its subgoals?')) {
        const { newRoot, newSelectedId } = removeNodeFromTree(allGoalData, nodeId);
        setAllGoalData(newRoot);
        // If focused node is deleted, focus on parent
        if (focusedNodeId === nodeId) {
            setFocusedNodeId(newSelectedId || 'root');
        }
        setSelectedNodeId(newSelectedId);
    }
  }, [allGoalData, focusedNodeId]);


  return (
    <div className="flex flex-col md:flex-row h-screen bg-gray-900 text-gray-100">
      <main className="flex-1 flex flex-col items-center justify-center p-4 relative">
        <div className="absolute top-4 left-4">
          <h1 className="text-2xl font-bold text-violet-400">Radial Goal Map</h1>
          <Breadcrumbs path={breadcrumbsPath} onNodeClick={handleBreadcrumbClick} />
        </div>
        <div className={`transition-opacity duration-${TRANSITION_DURATION} ${isTransitioning ? 'opacity-0' : 'opacity-100'}`}>
          <GoalMap
            nodes={renderNodes}
            selectedNodeId={selectedNodeId}
            onNodeClick={handleNodeClick}
            onNodeDoubleClick={handleNodeDoubleClick}
            onCenterClick={handleCenterClick}
          />
        </div>
      </main>
      <aside className="w-full md:w-96 bg-gray-800 p-6 overflow-y-auto shadow-lg border-l border-gray-700">
        <SidePanel
          node={selectedNode}
          parent={parentOfSelected}
          onUpdate={handleUpdateNode}
          onAddChild={handleAddChild}
          onAddSibling={handleAddSibling}
          onDelete={handleDeleteNode}
          key={selectedNode?.id || 'empty'}
        />
      </aside>
    </div>
  );
}