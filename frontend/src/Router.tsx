import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { LoginPage } from './pages/LoginPage';
import { LogsPage } from './pages/LogsPage';
import { TagsPage } from './pages/TagsPage';
import { LogDetailPage } from './pages/LogDetailPage';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AppLayout } from './components/AppLayout';

const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    children: [
      {
        element: <ProtectedRoute />,
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
        ],
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
