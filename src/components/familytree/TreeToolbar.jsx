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
      <div className="absolute top-0 left-0 right-0 z-10 bg-[rgba(10,10,10,0.75)] backdrop-blur-sm border-b border-amber-700/30">
        <div className="h-16 flex items-center justify-center px-6">
          <p className="text-amber-100 text-sm font-serif">
            Viewing shared tree — <span className="text-amber-500">View Only</span>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="absolute top-0 left-0 right-0 z-10 bg-[rgba(10,10,10,0.75)] backdrop-blur-sm border-b border-amber-700/30">
      <div className="h-16 flex items-center justify-between px-6 gap-4">
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
            className="h-10 bg-gradient-to-b from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white border border-amber-500/50 shadow-lg shadow-amber-900/30 gap-2"
          >
            <Sparkles className="w-4 h-4" />
            Generate
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                className="h-10 w-10 p-0 bg-gradient-to-b from-stone-700 to-stone-800 hover:from-stone-600 hover:to-stone-700 text-amber-100 border border-amber-700/50 shadow-lg shadow-amber-900/20"
              >
                <Menu className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-stone-900 border-amber-700/50 shadow-xl">
              <DropdownMenuItem 
                onClick={handleSave}
                disabled={!tree}
                className="text-amber-100 focus:bg-stone-800 focus:text-amber-100 gap-2"
              >
                <Download className="w-4 h-4" />
                Save to JSON
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => fileInputRef.current?.click()}
                className="text-amber-100 focus:bg-stone-800 focus:text-amber-100 gap-2"
              >
                <Upload className="w-4 h-4" />
                Load from JSON
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={handleShare}
                disabled={!tree}
                className="text-amber-100 focus:bg-stone-800 focus:text-amber-100 gap-2"
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