import React, { useEffect, useMemo } from 'react';
import logo from './logo.svg';
import './App.css';

function App() {
  const [tests, setTests] = React.useState<TestCoverage[]>([]);
  useEffect(() => {
    async function effect() {
      const response = await fetch('/is-deno-compatible-yet/tests.json');
      const tests = await response.json();
      setTests(tests);
    }

    effect();
  }, []);

  const percentageCompatible = useMemo(() => {
    const implementedTests = tests.filter(test => test.implemented);
    return Math.round(implementedTests.length / tests.length * 100);
  }, [tests]);

  if(tests.length === 0) {
    return <div>Loading...</div>;
  }

  return (
    <div className="App">
      <header className="App-header">
        Deno 2 is <strong>{percentageCompatible}%</strong> compatible with Node.js
      </header>
    </div>
  );
}

export default App;
