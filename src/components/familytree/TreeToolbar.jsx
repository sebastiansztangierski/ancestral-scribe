import React, { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Sparkles, Download, Upload, Share2, Menu } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import SearchPeople from './SearchPeople';

export default function TreeToolbar({ 
  tree, 
  onGenerateClick, 
  onLoadTree,
  isSharedView = false,
  onSearchSelect
}) {
  const fileInputRef = useRef(null);

  const handleSave = () => {
    if (!tree) {
      toast.error('No tree to save');
      return;
    }
    const dataStr = JSON.stringify(tree, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `house-${tree.house_name.toLowerCase()}-family-tree.json`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Tree saved!');
  };

  const handleLoad = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        if (data.house_name && data.persons && data.family_edges) {
          onLoadTree(data);
          toast.success(`Loaded House ${data.house_name}!`);
        } else {
          toast.error('Invalid tree file format');
        }
      } catch (err) {
        toast.error('Failed to parse file');
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  const handleShare = async () => {
    if (!tree) {
      toast.error('No tree to share');
      return;
    }
    
    // Create a shareable URL with the tree data encoded
    const treeData = encodeURIComponent(JSON.stringify(tree));
    const shareUrl = `${window.location.origin}${window.location.pathname}?shared=${treeData}`;
    
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success('Share link copied to clipboard!');
    } catch {
      toast.error('Failed to copy link');
    }
  };

  if (isSharedView) {
    return (
      <div className="absolute top-0 left-0 right-0 z-10" style={{
        background: 'linear-gradient(to bottom, rgba(20,15,10,0.95) 0%, rgba(30,22,15,0.95) 50%, rgba(20,15,10,0.95) 100%)',
        border: '2px solid rgba(217,119,6,0.4)',
        boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.5), inset 0 0 0 1px rgba(120,53,15,0.3)',
        backdropFilter: 'blur(8px)'
      }}>
        <div className="h-16 flex items-center justify-center px-6">
          <p className="text-amber-100 text-sm font-serif">
            Viewing shared tree — <span className="text-amber-500">View Only</span>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="absolute top-0 left-0 right-0 z-10 gothic-hud-bar">
      <div className="h-16 flex items-center justify-between px-6 gap-4" style={{
        background: 'linear-gradient(to bottom, rgba(20,15,10,0.95) 0%, rgba(30,22,15,0.95) 50%, rgba(20,15,10,0.95) 100%)',
        border: '2px solid rgba(217,119,6,0.4)',
        boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.5), inset 0 0 0 1px rgba(120,53,15,0.3)',
        backdropFilter: 'blur(8px)',
        position: 'relative'
      }}>
        <div className="flex-1 max-w-md">
          {tree && tree.persons && (
            <SearchPeople persons={tree.persons} onSelectPerson={onSearchSelect} />
          )}
        </div>

        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleLoad}
            className="hidden"
          />

          <Button
            onClick={onGenerateClick}
            className="h-10 gap-2 gothic-button-primary"
            style={{
              background: 'linear-gradient(to bottom, #d97706 0%, #b45309 70%, #92400e 100%)',
              border: '1px solid rgba(217,119,6,0.6)',
              boxShadow: 'inset 0 1px 2px rgba(251,191,36,0.3), 0 2px 8px rgba(217,119,6,0.4)',
              textShadow: '0 1px 2px rgba(0,0,0,0.5)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = 'inset 0 1px 2px rgba(251,191,36,0.4), 0 0 12px rgba(217,119,6,0.6), 0 2px 8px rgba(217,119,6,0.4)';
              e.currentTarget.style.borderColor = 'rgba(217,119,6,0.8)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = 'inset 0 1px 2px rgba(251,191,36,0.3), 0 2px 8px rgba(217,119,6,0.4)';
              e.currentTarget.style.borderColor = 'rgba(217,119,6,0.6)';
            }}
            onMouseDown={(e) => {
              e.currentTarget.style.boxShadow = 'inset 0 2px 4px rgba(0,0,0,0.5)';
            }}
            onMouseUp={(e) => {
              e.currentTarget.style.boxShadow = 'inset 0 1px 2px rgba(251,191,36,0.3), 0 2px 8px rgba(217,119,6,0.4)';
            }}
          >
            <Sparkles className="w-4 h-4" />
            Generate
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                className="h-10 w-10 p-0 text-amber-100 gothic-button-menu"
                style={{
                  background: 'linear-gradient(to bottom, rgba(28,25,23,0.95) 0%, rgba(41,37,36,0.95) 50%, rgba(28,25,23,0.95) 100%)',
                  border: '1px solid rgba(217,119,6,0.4)',
                  boxShadow: 'inset 0 2px 6px rgba(0,0,0,0.5), inset 0 0 0 1px rgba(120,53,15,0.2)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = 'inset 0 2px 6px rgba(0,0,0,0.5), inset 0 0 0 1px rgba(120,53,15,0.2), 0 0 8px rgba(217,119,6,0.4)';
                  e.currentTarget.style.borderColor = 'rgba(217,119,6,0.6)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = 'inset 0 2px 6px rgba(0,0,0,0.5), inset 0 0 0 1px rgba(120,53,15,0.2)';
                  e.currentTarget.style.borderColor = 'rgba(217,119,6,0.4)';
                }}
                onMouseDown={(e) => {
                  e.currentTarget.style.boxShadow = 'inset 0 3px 8px rgba(0,0,0,0.7)';
                }}
                onMouseUp={(e) => {
                  e.currentTarget.style.boxShadow = 'inset 0 2px 6px rgba(0,0,0,0.5), inset 0 0 0 1px rgba(120,53,15,0.2)';
                }}
              >
                <Menu className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="gothic-dropdown" style={{
              background: 'linear-gradient(to bottom, rgba(20,15,10,0.98) 0%, rgba(28,25,23,0.98) 50%, rgba(20,15,10,0.98) 100%)',
              border: '2px solid rgba(217,119,6,0.4)',
              boxShadow: 'inset 0 0 0 1px rgba(120,53,15,0.3), 0 8px 24px rgba(0,0,0,0.6)',
              backdropFilter: 'blur(8px)'
            }}>
              <DropdownMenuItem 
                onClick={handleSave}
                disabled={!tree}
                className="text-amber-100 gap-2 cursor-pointer"
                style={{
                  background: 'transparent',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'linear-gradient(to right, rgba(120,53,15,0.3), rgba(217,119,6,0.15))';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                }}
              >
                <Download className="w-4 h-4" />
                Save to JSON
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => fileInputRef.current?.click()}
                className="text-amber-100 gap-2 cursor-pointer"
                style={{
                  background: 'transparent',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'linear-gradient(to right, rgba(120,53,15,0.3), rgba(217,119,6,0.15))';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                }}
              >
                <Upload className="w-4 h-4" />
                Load from JSON
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={handleShare}
                disabled={!tree}
                className="text-amber-100 gap-2 cursor-pointer"
                style={{
                  background: 'transparent',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'linear-gradient(to right, rgba(120,53,15,0.3), rgba(217,119,6,0.15))';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                }}
              >
                <Share2 className="w-4 h-4" />
                Copy Share Link
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}