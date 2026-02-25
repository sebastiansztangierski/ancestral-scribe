import React, { useState, useEffect } from 'react';
import Sidebar from '@/components/familytree/Sidebar';
import TreeCanvas from '@/components/familytree/TreeCanvas';
import TreeToolbar from '@/components/familytree/TreeToolbar';
import GeneratorDialog from '@/components/familytree/GeneratorDialog';
import Timeline from '@/components/familytree/Timeline';
import EventDetailsModal from '@/components/familytree/EventDetailsModal';
import ResizeHandle from '@/components/familytree/ResizeHandle';
import { generateFamilyTree } from '@/components/familytree/treeGenerator';

const DEFAULT_LEFT_WIDTH = 360;
const DEFAULT_RIGHT_WIDTH = 340;
const MIN_LEFT_WIDTH = 260;
const MAX_LEFT_WIDTH = 520;
const MIN_RIGHT_WIDTH = 280;
const MAX_RIGHT_WIDTH = 560;

export default function Home() {
  const [tree, setTree] = useState(null);
  const [selectedPerson, setSelectedPerson] = useState(null);
  const [generatorOpen, setGeneratorOpen] = useState(false);
  const [isSharedView, setIsSharedView] = useState(false);
  const [hoveredEventParticipants, setHoveredEventParticipants] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [jumpToPersonId, setJumpToPersonId] = useState(null);
  const [hasInitialized, setHasInitialized] = useState(false);
  
  // Panel widths
  const [leftWidth, setLeftWidth] = useState(() => {
    const saved = localStorage.getItem('familyTreeLeftWidth');
    return saved ? parseInt(saved, 10) : DEFAULT_LEFT_WIDTH;
  });
  const [rightWidth, setRightWidth] = useState(() => {
    const saved = localStorage.getItem('familyTreeRightWidth');
    return saved ? parseInt(saved, 10) : DEFAULT_RIGHT_WIDTH;
  });

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
    setHasInitialized(false);
    
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
    setHasInitialized(false);
    
    // Clear URL params if any
    if (window.location.search) {
      window.history.replaceState({}, '', window.location.pathname);
    }
  };

  const handleSelectPerson = (person) => {
    setSelectedPerson(person);
  };

  const handleSearchSelect = (person) => {
    setSelectedPerson(person);
    setJumpToPersonId(person.id);
    
    // Clear jump highlight after animation
    setTimeout(() => {
      setJumpToPersonId(null);
    }, 1000);
  };

  // Handle left panel resize
  const handleLeftResize = (deltaX) => {
    setLeftWidth(prev => {
      const newWidth = Math.max(MIN_LEFT_WIDTH, Math.min(MAX_LEFT_WIDTH, prev + deltaX));
      return newWidth;
    });
  };

  const handleLeftResizeEnd = () => {
    localStorage.setItem('familyTreeLeftWidth', leftWidth.toString());
  };

  const handleLeftReset = () => {
    setLeftWidth(DEFAULT_LEFT_WIDTH);
    localStorage.setItem('familyTreeLeftWidth', DEFAULT_LEFT_WIDTH.toString());
  };

  // Handle right panel resize
  const handleRightResize = (deltaX) => {
    setRightWidth(prev => {
      const newWidth = Math.max(MIN_RIGHT_WIDTH, Math.min(MAX_RIGHT_WIDTH, prev - deltaX));
      return newWidth;
    });
  };

  const handleRightResizeEnd = () => {
    localStorage.setItem('familyTreeRightWidth', rightWidth.toString());
  };

  const handleRightReset = () => {
    setRightWidth(DEFAULT_RIGHT_WIDTH);
    localStorage.setItem('familyTreeRightWidth', DEFAULT_RIGHT_WIDTH.toString());
  };

  const hasTimeline = tree && tree.timeline_events && tree.timeline_events.length > 0;
  
  return (
    <div className="h-screen w-screen bg-stone-950 overflow-hidden">
      <div 
        className="h-full grid"
        style={{
          gridTemplateColumns: tree 
            ? `${leftWidth}px 8px 1fr ${hasTimeline ? `8px ${rightWidth}px` : ''}`
            : '1fr'
        }}
      >
        {/* Left Sidebar - only show when tree exists */}
        {tree && (
          <>
            <div className="overflow-hidden">
              <Sidebar
                tree={tree}
                selectedPerson={selectedPerson}
                onSelectPerson={handleSelectPerson}
              />
            </div>

            {/* Left resize handle */}
            <ResizeHandle
              onResize={handleLeftResize}
              onResizeEnd={handleLeftResizeEnd}
              onDoubleClick={handleLeftReset}
            />
          </>
        )}

        {/* Main Canvas Area */}
        <div className="relative overflow-hidden">
          <TreeToolbar
            tree={tree}
            onGenerateClick={() => setGeneratorOpen(true)}
            onLoadTree={handleLoadTree}
            isSharedView={isSharedView}
            onSearchSelect={handleSearchSelect}
          />

          {tree ? (
            <TreeCanvas
              tree={tree}
              selectedPerson={selectedPerson}
              onSelectPerson={handleSelectPerson}
              hoveredEventParticipants={hoveredEventParticipants}
              jumpToPersonId={jumpToPersonId}
              hasInitialized={hasInitialized}
              setHasInitialized={setHasInitialized}
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

        {/* Right Timeline - only show when tree exists */}
        {hasTimeline && (
          <>
            {/* Right resize handle */}
            <ResizeHandle
              onResize={handleRightResize}
              onResizeEnd={handleRightResizeEnd}
              onDoubleClick={handleRightReset}
            />

            <div className="overflow-hidden">
              <Timeline 
                events={tree.timeline_events}
                onEventHover={setHoveredEventParticipants}
                onEventClick={setSelectedEvent}
              />
            </div>
          </>
        )}
      </div>

      {/* Event Details Modal */}
      {selectedEvent && (
        <EventDetailsModal
          event={selectedEvent}
          open={!!selectedEvent}
          onOpenChange={(open) => !open && setSelectedEvent(null)}
          allPersons={tree?.persons}
        />
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