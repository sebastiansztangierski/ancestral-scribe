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

export default function TreeToolbar({ 
  tree, 
  onGenerateClick, 
  onLoadTree,
  isSharedView = false
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
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 bg-stone-900/90 backdrop-blur border border-amber-800/50 rounded-lg px-4 py-2">
        <p className="text-amber-100 text-sm font-serif">
          Viewing shared tree — <span className="text-amber-500">View Only</span>
        </p>
      </div>
    );
  }

  return (
    <div className="absolute top-4 right-4 z-10 flex gap-2">
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleLoad}
        className="hidden"
      />

      <Button
        onClick={onGenerateClick}
        className="bg-amber-700 hover:bg-amber-600 text-white gap-2"
      >
        <Sparkles className="w-4 h-4" />
        Generate
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="border-amber-800/50 text-amber-100 hover:bg-stone-800">
            <Menu className="w-4 h-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="bg-stone-900 border-amber-800/50">
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
  );
}