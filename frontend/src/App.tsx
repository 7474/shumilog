import { Outlet } from 'react-router-dom';

export function App() {
  return (
    <div className="container mx-auto p-4">
      <header className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-bold">Shumilog</h1>
        <nav>
          <a href="/" className="mr-4">Logs</a>
          <a href="/tags">Tags</a>
        </nav>
      </header>
      <main>
        <Outlet />
      </main>
    </div>
  );
}

export default App;
