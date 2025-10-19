import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { LoginPage } from './pages/LoginPage';
import { LogsPage } from './pages/LogsPage';
import { MyLogsPage } from './pages/MyLogsPage';
import { TagsPage } from './pages/TagsPage';
import { TagDetailPage } from './pages/TagDetailPage';
import { LogDetailPage } from './pages/LogDetailPage';
import { ApiDocsPage } from './pages/ApiDocsPage';
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
        path: 'my/logs',
        element: <MyLogsPage />,
      },
      {
        path: 'tags',
        element: <TagsPage />,
      },
      {
        path: 'tags/:name',
        element: <TagDetailPage />,
      },
      {
        path: 'login',
        element: <LoginPage />,
      },
    ],
  },
  {
    path: 'api-docs',
    element: <ApiDocsPage />,
  },
]);

export function Router() {
  return <RouterProvider router={router} />;
}
