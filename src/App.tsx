import React, { useEffect } from 'react';
import { useAppStore } from './store/appStore';
import { Header } from './components/Layout/Header';
import { PuzzleView } from './components/Puzzle/PuzzleView';
import { AnalysisPanel } from './components/Analysis/AnalysisPanel';
import { StatsPanel } from './components/Stats/StatsPanel';
import { ThemeSelector } from './components/ThemeTrainer/ThemeSelector';

const App: React.FC = () => {
  const { view, status, loadPuzzle } = useAppStore();

  // Load initial puzzle on mount
  useEffect(() => {
    if (status === 'idle') {
      loadPuzzle();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      <Header />

      <main className="flex-1 w-full max-w-7xl mx-auto px-3 sm:px-6 py-4">
        {view === 'stats' && <StatsPanel />}

        {view === 'themes' && <ThemeSelector />}

        {view === 'puzzle' && (
          <div className="flex flex-col lg:flex-row gap-4 items-start justify-center">
            {/* Center: board */}
            <div className="w-full max-w-[560px] mx-auto lg:mx-0">
              <PuzzleView />
            </div>

            {/* Right panel: analysis */}
            <aside className="w-full lg:w-72 shrink-0">
              <AnalysisPanel />
            </aside>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
