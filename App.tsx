
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Node } from './types';
import GoalMap from './components/GoalMap';
import SidePanel from './components/SidePanel';
import Breadcrumbs from './components/Breadcrumbs';
import { sampleData, findNodeById, updateNodeInTree, generateRenderNodes, findNodePath, generateId, addNodeToTree, removeNodeFromTree, promoteChildrenInTree } from './utils';
import { CHART_DIMENSIONS, TRANSITION_DURATION } from './constants';
import DeleteConfirmationDialog from './components/DeleteConfirmationDialog';

const MAX_HISTORY_SIZE = 50;
const LOCAL_STORAGE_KEY = 'radialGoalMapData';

const getInitialState = (): Node => {
  try {
    const savedData = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (savedData) {
      const parsedData = JSON.parse(savedData);
      // Basic validation to ensure it's a valid goal tree
      if (parsedData.id && parsedData.title && Array.isArray(parsedData.children)) {
        return parsedData;
      }
    }
  } catch (error) {
    console.error("Failed to load or parse data from localStorage", error);
  }
  return sampleData;
};

export default function App() {
  const [history, setHistory] = useState<Node[]>([getInitialState()]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const allGoalData = history[historyIndex];

  const [focusedNodeId, setFocusedNodeId] = useState<string>('root');
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>('root');
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [deletionCandidateId, setDeletionCandidateId] = useState<string | null>(null);

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  const updateStateAndHistory = useCallback((newTree: Node) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newTree);

    while (newHistory.length > MAX_HISTORY_SIZE) {
        newHistory.shift();
    }
    
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);

    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(newTree));
    } catch (error) {
      console.error("Failed to save data to localStorage:", error);
      alert("Could not save your changes. Your browser's storage might be full.");
    }
  }, [history, historyIndex]);

  useEffect(() => {
    const isFocusedIdValid = findNodeById(allGoalData, focusedNodeId);
    if (!isFocusedIdValid) {
        setFocusedNodeId('root');
        setSelectedNodeId('root');
        return;
    }

    const isSelectedIdValid = selectedNodeId ? findNodeById(allGoalData, selectedNodeId) : false;
    if (!isSelectedIdValid) {
        setSelectedNodeId(focusedNodeId);
    }
  }, [allGoalData, selectedNodeId, focusedNodeId]);

  const focusedNode = useMemo(() => findNodeById(allGoalData, focusedNodeId) || allGoalData, [allGoalData, focusedNodeId]);
  const selectedNode = useMemo(() => selectedNodeId ? findNodeById(allGoalData, selectedNodeId) : null, [allGoalData, selectedNodeId]);
  const breadcrumbsPath = useMemo(() => findNodePath(allGoalData, focusedNodeId), [allGoalData, focusedNodeId]);
  const isFocused = useMemo(() => focusedNodeId !== 'root', [focusedNodeId]);
  
  const parentOfSelected = useMemo(() => {
    if (!selectedNodeId) return null;
    const path = findNodePath(allGoalData, selectedNodeId);
    return path.length > 1 ? path[path.length - 2] : null;
  }, [allGoalData, selectedNodeId]);
  
  const deletionCandidateNode = useMemo(
    () => (deletionCandidateId ? findNodeById(allGoalData, deletionCandidateId) : null),
    [allGoalData, deletionCandidateId]
  );

  const renderNodes = useMemo(() => generateRenderNodes(focusedNode, CHART_DIMENSIONS.width, CHART_DIMENSIONS.height, isFocused), [focusedNode, isFocused]);

  const selectedNodeDisplayProgress = useMemo(() => {
    return renderNodes.find(rn => rn.nodeId === selectedNodeId)?.displayProgress;
  }, [renderNodes, selectedNodeId]);

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
  }, [allGoalData.id, focusedNode.id, focusedNodeId, handleBreadcrumbClick]);


  const handleUpdateNode = useCallback((updatedNode: Node) => {
    const updatedTree = updateNodeInTree(allGoalData, updatedNode);
    updateStateAndHistory(updatedTree);
  }, [allGoalData, updateStateAndHistory]);

  const handleAddChild = useCallback((parentId: string) => {
    const parentNode = findNodeById(allGoalData, parentId);
    const newNode: Node = {
        id: generateId(),
        title: 'New Subgoal',
        importance: 1,
        progressSelf: 0,
        children: [],
        color: parentNode?.color,
        context: '',
    };
    const updatedTree = addNodeToTree(allGoalData, parentId, newNode);
    updateStateAndHistory(updatedTree);
    setSelectedNodeId(newNode.id);
  }, [allGoalData, updateStateAndHistory]);

  const handleAddSibling = useCallback((siblingId: string) => {
    const path = findNodePath(allGoalData, siblingId);
    if (path.length < 2) return;
    const parent = path[path.length - 2];
    
    const newNode: Node = {
        id: generateId(),
        title: 'New Goal',
        importance: 1,
        progressSelf: 0,
        children: [],
        color: parent.color,
        context: '',
    };
    const updatedTree = addNodeToTree(allGoalData, parent.id, newNode);
    updateStateAndHistory(updatedTree);
    setSelectedNodeId(newNode.id);
  }, [allGoalData, updateStateAndHistory]);

  const handleDeleteNode = useCallback((nodeId: string) => {
    if (nodeId === 'root') {
        alert("Cannot delete the root goal.");
        return;
    }
    const nodeToDelete = findNodeById(allGoalData, nodeId);
    if (!nodeToDelete) return;

    if (nodeToDelete.children.length > 0) {
        setDeletionCandidateId(nodeId);
    } else {
        const { newRoot, newSelectedId } = removeNodeFromTree(allGoalData, nodeId);
        updateStateAndHistory(newRoot);
        if (focusedNodeId === nodeId) {
            setFocusedNodeId(newSelectedId || 'root');
        }
        setSelectedNodeId(newSelectedId || 'root');
    }
  }, [allGoalData, focusedNodeId, updateStateAndHistory]);
  
  const handleConfirmDeletion = useCallback((mode: 'delete-subtree' | 'promote-children') => {
    if (!deletionCandidateId) return;

    let result: { newRoot: Node, newSelectedId: string | null };

    if (mode === 'delete-subtree') {
        result = removeNodeFromTree(allGoalData, deletionCandidateId);
    } else {
        result = promoteChildrenInTree(allGoalData, deletionCandidateId);
    }
    
    const { newRoot, newSelectedId } = result;

    updateStateAndHistory(newRoot);
    if (focusedNodeId === deletionCandidateId) {
        setFocusedNodeId(newSelectedId || 'root');
    }
    setSelectedNodeId(newSelectedId || 'root');
    setDeletionCandidateId(null);
  }, [allGoalData, deletionCandidateId, focusedNodeId, updateStateAndHistory]);
  
  const handleCancelDeletion = useCallback(() => {
    setDeletionCandidateId(null);
  }, []);

  const handleUndo = useCallback(() => {
    if (canUndo) {
        setHistoryIndex(prevIndex => prevIndex - 1);
    }
  }, [canUndo]);

  const handleRedo = useCallback(() => {
    if (canRedo) {
        setHistoryIndex(prevIndex => prevIndex + 1);
    }
  }, [canRedo]);

  const handleResetData = useCallback(() => {
    if (window.confirm("Are you sure you want to reset all goals to the default sample data? This action cannot be undone.")) {
      try {
        localStorage.removeItem(LOCAL_STORAGE_KEY);
        // Reloading is the simplest way to reset the entire app's state
        window.location.reload();
      } catch (error) {
        console.error("Failed to clear localStorage:", error);
        alert("Could not reset data. Please try clearing your browser's site data manually.");
      }
    }
  }, []);


  return (
    <div className="flex flex-col md:flex-row h-screen bg-gray-900 text-gray-100">
      <main className="flex-1 flex flex-col items-center justify-center p-4 relative">
        <div className="absolute top-4 left-4">
          <h1 className="text-2xl font-bold text-violet-400">Radial Goal Map</h1>
          <Breadcrumbs path={breadcrumbsPath} onNodeClick={handleBreadcrumbClick} />
        </div>
        <div className="absolute top-4 right-4 flex items-center space-x-2">
            <button 
                onClick={handleUndo} 
                disabled={!canUndo}
                className="p-2 bg-gray-700 text-gray-300 rounded-md hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                aria-label="Undo"
                title="Undo"
            >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
                </svg>
            </button>
            <button 
                onClick={handleRedo}
                disabled={!canRedo}
                className="p-2 bg-gray-700 text-gray-300 rounded-md hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                aria-label="Redo"
                title="Redo"
            >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 15l6-6m0 0l-6-6m6 6H9a6 6 0 000 12h3" />
                </svg>
            </button>
             <div className="border-l h-6 border-gray-600"></div>
            <button 
                onClick={handleResetData}
                className="p-2 bg-gray-700 text-gray-300 rounded-md hover:bg-red-600 hover:text-white transition-colors"
                aria-label="Reset Data"
                title="Reset to sample data"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 11.664 0l3.181-3.183m-11.664 0-3.182-3.182m11.664 0 3.182 3.182" />
              </svg>
            </button>
        </div>
        <div className={`transition-opacity duration-${TRANSITION_DURATION} ${isTransitioning ? 'opacity-0' : 'opacity-100'}`}>
          <GoalMap
            nodes={renderNodes}
            selectedNodeId={selectedNodeId}
            onNodeClick={handleNodeClick}
            onNodeDoubleClick={handleNodeDoubleClick}
            onCenterSelect={handleNodeClick}
            onCenterDoubleClick={handleCenterClick}
          />
        </div>
      </main>
      <aside className="w-full md:w-96 bg-gray-800 p-6 overflow-y-auto shadow-lg border-l border-gray-700">
        <SidePanel
          node={selectedNode}
          parent={parentOfSelected}
          displayProgress={selectedNodeDisplayProgress}
          onUpdate={handleUpdateNode}
          onAddChild={handleAddChild}
          onAddSibling={handleAddSibling}
          onDelete={handleDeleteNode}
          key={selectedNode?.id || 'empty'}
        />
      </aside>
      {deletionCandidateNode && (
        <DeleteConfirmationDialog 
          node={deletionCandidateNode}
          onConfirm={handleConfirmDeletion}
          onCancel={handleCancelDeletion}
        />
      )}
    </div>
  );
}
