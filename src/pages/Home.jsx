import React, { useState, useEffect } from 'react';
import Sidebar from '@/components/familytree/Sidebar';
import TreeCanvas from '@/components/familytree/TreeCanvas';
import TreeToolbar from '@/components/familytree/TreeToolbar';
import GeneratorDialog from '@/components/familytree/GeneratorDialog';
import Timeline from '@/components/familytree/Timeline';
import { generateFamilyTree } from '@/components/familytree/treeGenerator';

export default function Home() {
  const [tree, setTree] = useState(null);
  const [selectedPerson, setSelectedPerson] = useState(null);
  const [generatorOpen, setGeneratorOpen] = useState(false);
  const [isSharedView, setIsSharedView] = useState(false);

  // Check for shared tree in URL on mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const sharedData = urlParams.get('shared');
    
    if (sharedData) {
      try {
        const treeData = JSON.parse(decodeURIComponent(sharedData));
        if (treeData.house_name && treeData.persons) {
          setTree(treeData);
          setIsSharedView(true);
          // Select the first person
          if (treeData.persons.length > 0) {
            setSelectedPerson(treeData.persons[0]);
          }
        }
      } catch (err) {
        console.error('Failed to load shared tree:', err);
      }
    }
  }, []);

  const handleGenerate = (config) => {
    const newTree = generateFamilyTree(config);
    // Ensure timeline_events exists
    if (!newTree.timeline_events || newTree.timeline_events.length === 0) {
      newTree.timeline_events = [];
    }
    setTree(newTree);
    setSelectedPerson(newTree.persons[0]);
    setIsSharedView(false);
    
    // Clear URL params if any
    if (window.location.search) {
      window.history.replaceState({}, '', window.location.pathname);
    }
  };

  const handleLoadTree = (loadedTree) => {
    // Ensure timeline_events exists (backward compatibility)
    if (!loadedTree.timeline_events) {
      loadedTree.timeline_events = [];
    }
    setTree(loadedTree);
    setSelectedPerson(loadedTree.persons[0] || null);
    setIsSharedView(false);
    
    // Clear URL params if any
    if (window.location.search) {
      window.history.replaceState({}, '', window.location.pathname);
    }
  };

  const handleSelectPerson = (person) => {
    setSelectedPerson(person);
  };

  return (
    <div className="h-screen w-screen flex bg-stone-950 overflow-hidden">
      {/* Sidebar - only show when tree exists */}
      {tree && (
        <Sidebar
          tree={tree}
          selectedPerson={selectedPerson}
          onSelectPerson={handleSelectPerson}
        />
      )}

      {/* Main Canvas Area */}
      <div className="flex-1 relative">
        <TreeToolbar
          tree={tree}
          onGenerateClick={() => setGeneratorOpen(true)}
          onLoadTree={handleLoadTree}
          isSharedView={isSharedView}
        />

        {tree ? (
          <TreeCanvas
            tree={tree}
            selectedPerson={selectedPerson}
            onSelectPerson={handleSelectPerson}
          />
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center px-4 pb-20">
            <div className="text-6xl mb-6">🏰</div>
            <h1 className="text-4xl font-serif text-amber-100 mb-3">
              Fantasy Family Tree Generator
            </h1>
            <p className="text-stone-400 mb-8 max-w-md">
              Create intricate family lineages for your fantasy world. 
              Generate noble houses with rich histories, complex relationships, and mysterious characters.
            </p>
            <button
              onClick={() => setGeneratorOpen(true)}
              className="px-8 py-4 bg-gradient-to-b from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white font-serif text-lg rounded-lg transition-all shadow-lg shadow-amber-900/50 hover:shadow-amber-800/50 flex items-center gap-3"
            >
              <span className="text-2xl">⚔️</span>
              Create Your House
            </button>
          </div>
        )}
      </div>

      {/* Timeline - only show when tree exists */}
      {tree && tree.timeline_events && tree.timeline_events.length > 0 && (
        <Timeline events={tree.timeline_events} />
      )}

      {/* Generator Dialog */}
      <GeneratorDialog
        open={generatorOpen}
        onOpenChange={setGeneratorOpen}
        onGenerate={handleGenerate}
      />
    </div>
  );
}