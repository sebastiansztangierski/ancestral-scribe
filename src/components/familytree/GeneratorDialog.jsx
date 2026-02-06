import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { HOUSE_CRESTS } from './portraitLibrary';

export default function GeneratorDialog({ open, onOpenChange, onGenerate }) {
  const [config, setConfig] = useState({
    houseName: '',
    houseMotto: '',
    houseCrest: '🦁',
    generations: 4,
    avgChildren: 2,
    unknownChance: 0.1
  });

  const handleGenerate = () => {
    if (!config.houseName.trim()) {
      return;
    }
    onGenerate(config);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-stone-900 border-amber-800/50 text-amber-100 max-w-md">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl text-amber-100">
            Generate Family Tree
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* House Name */}
          <div className="space-y-2">
            <Label className="text-amber-500">House Name *</Label>
            <Input
              value={config.houseName}
              onChange={(e) => setConfig({ ...config, houseName: e.target.value })}
              placeholder="e.g., Stark, Lannister, Targaryen"
              className="bg-stone-800 border-amber-800/50 text-amber-100 placeholder:text-stone-500"
            />
          </div>

          {/* House Motto */}
          <div className="space-y-2">
            <Label className="text-amber-500">House Motto (optional)</Label>
            <Input
              value={config.houseMotto}
              onChange={(e) => setConfig({ ...config, houseMotto: e.target.value })}
              placeholder="e.g., Winter is Coming"
              className="bg-stone-800 border-amber-800/50 text-amber-100 placeholder:text-stone-500"
            />
          </div>

          {/* House Crest */}
          <div className="space-y-2">
            <Label className="text-amber-500">House Crest</Label>
            <div className="flex flex-wrap gap-2">
              {HOUSE_CRESTS.map((crest) => (
                <button
                  key={crest}
                  onClick={() => setConfig({ ...config, houseCrest: crest })}
                  className={`w-10 h-10 rounded border-2 text-xl flex items-center justify-center transition-colors ${
                    config.houseCrest === crest
                      ? 'border-amber-500 bg-amber-900/30'
                      : 'border-stone-700 hover:border-amber-700'
                  }`}
                >
                  {crest}
                </button>
              ))}
            </div>
          </div>

          {/* Generations */}
          <div className="space-y-2">
            <Label className="text-amber-500">
              Generations: {config.generations}
            </Label>
            <Slider
              value={[config.generations]}
              onValueChange={([val]) => setConfig({ ...config, generations: val })}
              min={2}
              max={6}
              step={1}
              className="py-2"
            />
            <p className="text-xs text-stone-500">Number of generations in the family tree</p>
          </div>

          {/* Average Children */}
          <div className="space-y-2">
            <Label className="text-amber-500">
              Average Children per Couple: {config.avgChildren}
            </Label>
            <Slider
              value={[config.avgChildren]}
              onValueChange={([val]) => setConfig({ ...config, avgChildren: val })}
              min={1}
              max={5}
              step={1}
              className="py-2"
            />
          </div>

          {/* Unknown Chance */}
          <div className="space-y-2">
            <Label className="text-amber-500">
              Mystery Characters: {Math.round(config.unknownChance * 100)}%
            </Label>
            <Slider
              value={[config.unknownChance * 100]}
              onValueChange={([val]) => setConfig({ ...config, unknownChance: val / 100 })}
              min={0}
              max={30}
              step={5}
              className="py-2"
            />
            <p className="text-xs text-stone-500">Chance for characters to be unknown/mysterious</p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="border-amber-800/50 text-amber-100 hover:bg-stone-800"
          >
            Cancel
          </Button>
          <Button
            onClick={handleGenerate}
            disabled={!config.houseName.trim()}
            className="bg-amber-700 hover:bg-amber-600 text-white"
          >
            Generate Tree
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}