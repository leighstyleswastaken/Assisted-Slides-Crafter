
import React from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { RunDocProvider } from './context/RunDocContext';
import AppShell from './components/Layout/AppShell';
import ErrorBoundary from './components/UI/ErrorBoundary';

const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <RunDocProvider>
        {/* Using HTML5Backend to ensure stability and avoid MultiBackend import issues */}
        <DndProvider backend={HTML5Backend}>
          <AppShell />
        </DndProvider>
      </RunDocProvider>
    </ErrorBoundary>
  );
};

export default App;
