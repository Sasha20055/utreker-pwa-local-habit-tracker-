import React from 'react';
import './styles.css';
import HeroSection from './components/HeroSection';
import Interactive3D from './components/Interactive3D';

function App() {
  return (
    <div className="app">
      <Interactive3D />
      <HeroSection />
    </div>
  );
}

export default App;