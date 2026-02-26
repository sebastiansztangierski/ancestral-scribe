import React, { useState, useEffect } from 'react';
import Sidebar from '@/components/familytree/Sidebar';
import TreeCanvas from '@/components/familytree/TreeCanvas';
import TreeToolbar from '@/components/familytree/TreeToolbar';
import GeneratorDialog from '@/components/familytree/GeneratorDialog';
import Timeline from '@/components/familytree/Timeline';
import EventDetailsModal from '@/components/familytree/EventDetailsModal';
import { generateFamilyTree } from '@/components/familytree/treeGenerator';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const TAB_W = 44;
const LEFT_W = 340;
const RIGHT_W = 340;

export default function Home() {
  const [tree, setTree] = useState(null);
  const [selectedPerson, setSelectedPerson] = useState(null);
  const [generatorOpen, setGeneratorOpen] = useState(false);
  const [isSharedView, setIsSharedView] = useState(false);
  const [hoveredEventParticipants, setHoveredEventParticipants] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [jumpToPersonId, setJumpToPersonId] = useState(null);
  const [hasInitialized, setHasInitialized] = useState(false);
  
  const [leftCollapsed, setLeftCollapsed] = useState(() => {
    const saved = localStorage.getItem('leftPanelCollapsed');
    return saved === 'true';
  });
  
  const [rightCollapsed, setRightCollapsed] = useState(() => {
    const saved = localStorage.getItem('rightPanelCollapsed');
    return saved === 'true';
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

  const toggleLeftPanel = () => {
    setLeftCollapsed(prev => {
      const newValue = !prev;
      localStorage.setItem('leftPanelCollapsed', String(newValue));
      return newValue;
    });
  };

  const toggleRightPanel = () => {
    setRightCollapsed(prev => {
      const newValue = !prev;
      localStorage.setItem('rightPanelCollapsed', String(newValue));
      return newValue;
    });
  };

  const hasTimeline = tree && tree.timeline_events && tree.timeline_events.length > 0;
  
  const leftColWidth = tree ? (leftCollapsed ? TAB_W : LEFT_W) : 0;
  const rightColWidth = hasTimeline ? (rightCollapsed ? TAB_W : RIGHT_W) : 0;

  return (
    <div 
      className="h-screen w-screen bg-stone-950 overflow-hidden"
      style={{
        display: 'grid',
        gridTemplateColumns: tree 
          ? `${leftColWidth}px 1fr ${rightColWidth}px`
          : '1fr'
      }}
    >
      {/* Left Sidebar Column */}
      {tree && (
        <div className="relative overflow-visible h-full">
          {!leftCollapsed && (
            <div className="w-full h-full overflow-auto">
              <Sidebar
                tree={tree}
                selectedPerson={selectedPerson}
                onSelectPerson={handleSelectPerson}
              />
            </div>
          )}
          
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              toggleLeftPanel();
            }}
            className="absolute top-1/2 -translate-y-1/2 w-11 h-20 bg-amber-800/70 hover:bg-amber-700/90 backdrop-blur-sm border border-amber-600/50 flex items-center justify-center transition-all rounded-xl shadow-lg z-50"
            style={{ right: '-10px' }}
          >
            {leftCollapsed ? (
              <ChevronRight className="w-5 h-5 text-amber-100" />
            ) : (
              <ChevronLeft className="w-5 h-5 text-amber-100" />
            )}
          </button>
        </div>
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

      {/* Right Timeline Column */}
      {hasTimeline && (
        <div className="relative overflow-visible h-full">
          {!rightCollapsed && (
            <div className="w-full h-full overflow-auto">
              <Timeline 
                events={tree.timeline_events}
                onEventHover={setHoveredEventParticipants}
                onEventClick={setSelectedEvent}
              />
            </div>
          )}
          
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              toggleRightPanel();
            }}
            className="absolute top-1/2 -translate-y-1/2 w-11 h-20 bg-amber-800/70 hover:bg-amber-700/90 backdrop-blur-sm border border-amber-600/50 flex items-center justify-center transition-all rounded-xl shadow-lg z-50"
            style={{ left: '-10px' }}
          >
            {rightCollapsed ? (
              <ChevronLeft className="w-5 h-5 text-amber-100" />
            ) : (
              <ChevronRight className="w-5 h-5 text-amber-100" />
            )}
          </button>
        </div>
      )}

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