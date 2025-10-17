import { Link } from 'react-router-dom';

export function Footer() {
  return (
    <footer className="mt-auto border-t border-gray-200 bg-white/60 backdrop-blur-sm">
      <div className="container-mobile py-3">
        <div className="flex flex-col items-center justify-center space-y-1">
          <p className="text-xs text-gray-500">© 2025 Shumilog</p>
          <div className="flex items-center gap-3">
            <a
              href="https://github.com/7474/shumilog-wigh-spec-kit"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-gray-400 hover:text-sky-500 transition-colors"
            >
              GitHub
            </a>
            <span className="text-xs text-gray-300">·</span>
            <Link
              to="/api-docs"
              className="text-xs text-gray-400 hover:text-sky-500 transition-colors"
            >
              API仕様
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
