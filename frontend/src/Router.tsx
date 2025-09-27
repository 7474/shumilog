import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { App } from './App';
import { LoginPage } from './pages/LoginPage';
import { LogsPage } from './pages/LogsPage';
import { TagsPage } from './pages/TagsPage';

const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      {
        index: true,
        element: <LogsPage />,
      },
      {
        path: 'tags',
        element: <TagsPage />,
      },
      {
        path: 'login',
        element: <LoginPage />,
      },
    ],
  },
]);

export function Router() {
  return <RouterProvider router={router} />;
}
