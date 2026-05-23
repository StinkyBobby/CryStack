import { Github, MessageCircle } from "lucide-react";

export function Footer() {
  return (
    <footer className="relative z-10 border-t border-red-900/30 bg-black/70 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
          <div>
            <p className="text-lg font-semibold tracking-tight">CryStack</p>
            <p className="mt-1 text-sm text-white/50">
              Платформа для поиска команд и аналитики Dota 2
            </p>
          </div>

          <div className="flex items-center gap-4">
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-red-900/35 text-white/60 transition hover:border-[#df2531]/60 hover:text-white"
              aria-label="GitHub"
            >
              <Github className="h-4 w-4" />
            </a>
            <a
              href="#"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-red-900/35 text-white/60 transition hover:border-[#df2531]/60 hover:text-white"
              aria-label="Discord"
            >
              <MessageCircle className="h-4 w-4" />
            </a>
          </div>
        </div>

        <div className="flex flex-col gap-4 border-t border-red-900/20 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-white/40">
            © {new Date().getFullYear()} CryStack. Все права защищены.
          </p>
          <div className="flex items-center gap-5 text-xs text-white/40">
            <span className="transition hover:text-white/70 cursor-default">Условия использования</span>
            <span className="transition hover:text-white/70 cursor-default">Конфиденциальность</span>
            <span className="transition hover:text-white/70 cursor-default">Контакты</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
