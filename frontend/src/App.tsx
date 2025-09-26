import { useState } from 'react';

export function App(): JSX.Element {
  const [filters] = useState({ tag: 'all' });

  return (
    <main>
      <header>
        <h1>Shumilog</h1>
      </header>
      <section aria-label="log list">
        <p>Log list is not implemented yet. Current tag filter: {filters.tag}</p>
      </section>
    </main>
  );
}

export default App;
