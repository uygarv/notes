import { create } from 'zustand';

type Draft = { title: string; content: string; tags: number[] } | null;

type UiState = {
  isSidebarOpen: boolean;
  selectedNoteId: number | null;
  draft: Draft;
  commandOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  selectNote: (id: number | null) => void;
  startDraft: () => void;
  updateDraft: (draft: NonNullable<Draft>) => void;
  clearDraft: () => void;
  setCommandOpen: (open: boolean) => void;
};

export const useUiStore = create<UiState>((set) => ({
  isSidebarOpen: false,
  selectedNoteId: null,
  draft: null,
  commandOpen: false,
  setSidebarOpen: (isSidebarOpen) => set({ isSidebarOpen }),
  selectNote: (selectedNoteId) => set({ selectedNoteId, draft: null }),
  startDraft: () => set({ draft: { title: '', content: '', tags: [] }, selectedNoteId: null }),
  updateDraft: (draft) => set({ draft }),
  clearDraft: () => set({ draft: null }),
  setCommandOpen: (commandOpen) => set({ commandOpen }),
}));
