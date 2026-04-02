"use client";

import { useState, useEffect } from "react";

export interface SavedCalculation {
  id: string;
  name: string;
  savedAt: string;
  data: Record<string, unknown>;
}

interface Props {
  getCurrentState: () => Record<string, unknown>;
  loadState: (data: Record<string, unknown>) => void;
  clientName: string;
  industryName: string;
}

const STORAGE_KEY = "cogent-roi-saves";

function getSaves(): SavedCalculation[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function setSaves(saves: SavedCalculation[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(saves));
}

export default function SaveLoad({ getCurrentState, loadState, clientName, industryName }: Props) {
  const [saves, setSavesState] = useState<SavedCalculation[]>([]);
  const [showSaves, setShowSaves] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [justDownloaded, setJustDownloaded] = useState(false);

  useEffect(() => {
    setSavesState(getSaves());
  }, []);

  function handleSave() {
    const state = getCurrentState();
    const now = new Date();
    const id = `save-${Date.now()}`;
    const name = `${clientName || "Unnamed"} — ${industryName} — ${now.toLocaleDateString()} ${now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;

    const newSave: SavedCalculation = {
      id,
      name,
      savedAt: now.toISOString(),
      data: state,
    };

    const updated = [newSave, ...getSaves()].slice(0, 50); // Keep last 50
    setSaves(updated);
    setSavesState(updated);
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 2000);
  }

  function handleLoad(save: SavedCalculation) {
    loadState(save.data);
    setShowSaves(false);
  }

  function handleDelete(id: string) {
    const updated = getSaves().filter((s) => s.id !== id);
    setSaves(updated);
    setSavesState(updated);
  }

  function handleDownload() {
    const state = getCurrentState();
    const filename = `ROI-Calculator_${(clientName || "Unnamed").replace(/\s+/g, "-")}_${new Date().toISOString().slice(0, 10)}.json`;
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setJustDownloaded(true);
    setTimeout(() => setJustDownloaded(false), 2000);
  }

  function handleUpload() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const data = JSON.parse(evt.target?.result as string);
          loadState(data);
        } catch {
          alert("Invalid file format. Please select a valid ROI Calculator save file.");
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }

  return (
    <section className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-cogent-navy mb-4">Save &amp; Export</h2>

      <div className="flex flex-wrap gap-3">
        {/* Save to browser */}
        <button
          onClick={handleSave}
          className="px-4 py-2 bg-cogent-navy text-white text-sm font-medium rounded-md hover:bg-cogent-navy-dark transition-colors"
        >
          {justSaved ? "Saved!" : "Save Calculation"}
        </button>

        {/* Download as file */}
        <button
          onClick={handleDownload}
          className="px-4 py-2 bg-cogent-sage text-cogent-navy-dark text-sm font-medium rounded-md hover:opacity-90 transition-opacity"
        >
          {justDownloaded ? "Downloaded!" : "Download as File"}
        </button>

        {/* Upload a saved file */}
        <button
          onClick={handleUpload}
          className="px-4 py-2 border border-gray-300 text-cogent-neutral-dark text-sm font-medium rounded-md hover:bg-gray-50 transition-colors"
        >
          Load from File
        </button>

        {/* Show saved calculations */}
        {saves.length > 0 && (
          <button
            onClick={() => setShowSaves(!showSaves)}
            className="px-4 py-2 border border-cogent-navy/20 text-cogent-navy text-sm font-medium rounded-md hover:bg-cogent-ivory transition-colors"
          >
            {showSaves ? "Hide" : "View"} Saved ({saves.length})
          </button>
        )}
      </div>

      {/* Saved calculations list */}
      {showSaves && saves.length > 0 && (
        <div className="mt-4 border border-gray-200 rounded-md divide-y divide-gray-100 max-h-64 overflow-y-auto">
          {saves.map((save) => (
            <div key={save.id} className="flex items-center justify-between px-4 py-3 hover:bg-cogent-ivory/50">
              <div>
                <p className="text-sm font-medium text-cogent-navy-dark">{save.name}</p>
                <p className="text-xs text-gray-400">
                  {new Date(save.savedAt).toLocaleDateString()} at{" "}
                  {new Date(save.savedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleLoad(save)}
                  className="px-3 py-1 text-xs bg-cogent-navy text-white rounded hover:bg-cogent-navy-dark transition-colors"
                >
                  Load
                </button>
                <button
                  onClick={() => handleDelete(save.id)}
                  className="px-3 py-1 text-xs text-red-500 border border-red-200 rounded hover:bg-red-50 transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="mt-3 text-xs text-cogent-neutral">
        Saved calculations are stored in your browser. Download as a file to share with team members or keep a permanent backup.
      </p>
    </section>
  );
}
