import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { LoginPage } from './pages/LoginPage';
import { LogsPage } from './pages/LogsPage';
import { TagsPage } from './pages/TagsPage';
import { TagDetailPage } from './pages/TagDetailPage';
import { LogDetailPage } from './pages/LogDetailPage';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AppLayout } from './components/AppLayout';

const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    children: [
      {
        index: true,
        element: <LogsPage />,
      },
      {
        path: 'logs',
        element: <LogsPage />,
      },
      {
        path: 'logs/:id',
        element: <LogDetailPage />,
      },
      {
        path: 'tags',
        element: <TagsPage />,
      },
      {
        path: 'tags/:id',
        element: <TagDetailPage />,
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
