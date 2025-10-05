export function Footer() {
  return (
    <footer className="mt-auto border-t border-gray-200 bg-white/60 backdrop-blur-sm">
      <div className="container-mobile py-4">
        <div className="flex flex-col items-center justify-center space-y-2">
          <p className="text-xs text-gray-500">
            © 2025 Shumilog
          </p>
          <a
            href="https://github.com/7474/shumilog-wigh-spec-kit"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-gray-400 hover:text-sky-500 transition-colors"
          >
            GitHub
          </a>
        </div>
      </div>
    </footer>
  );
}
