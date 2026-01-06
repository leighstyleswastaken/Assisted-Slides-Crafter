
import React from 'react';
import { DndProvider } from 'react-dnd';
import { MultiBackend } from 'react-dnd-multi-backend';
import { HTML5toTouch } from 'rdndmb-html5-to-touch';
import { RunDocProvider } from './context/RunDocContext';
import AppShell from './components/Layout/AppShell';
import ErrorBoundary from './components/UI/ErrorBoundary';

const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <RunDocProvider>
        {/* Switched to MultiBackend to support Touch devices (Mobile/Tablet) automatically */}
        <DndProvider backend={MultiBackend} options={HTML5toTouch}>
          <AppShell />
        </DndProvider>
      </RunDocProvider>
    </ErrorBoundary>
  );
};

export default App;
