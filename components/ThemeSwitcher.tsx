import React from 'react';

type Theme = 'slate' | 'savanna' | 'nairobi';

interface ThemeSwitcherProps {
    currentTheme: Theme;
    setTheme: (theme: Theme) => void;
}

const ThemeSwitcher: React.FC<ThemeSwitcherProps> = ({ currentTheme, setTheme }) => {
    const themes: { name: Theme; label: string; color: string }[] = [
        { name: 'slate', label: 'Slate', color: 'bg-slate-500' },
        { name: 'savanna', label: 'Savanna', color: 'bg-orange-500' },
        { name: 'nairobi', label: 'Nairobi', color: 'bg-cyan-500' },
    ];

    return (
        <div className="flex items-center gap-1 p-1 bg-[var(--color-bg-secondary)] rounded-full border border-[var(--color-border-primary)]">
            {themes.map(theme => (
                <button
                    key={theme.name}
                    onClick={() => setTheme(theme.name)}
                    className={`px-3 py-1 text-sm font-semibold rounded-full transition-colors duration-200 ${
                        currentTheme === theme.name
                            ? 'bg-[var(--color-bg-interactive)] text-[var(--color-text-primary)] shadow-inner'
                            : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-tertiary)] hover:text-[var(--color-text-primary)]'
                    }`}
                    aria-pressed={currentTheme === theme.name}
                    title={`Switch to ${theme.label} theme`}
                >
                    <span className="flex items-center gap-2">
                        <span className={`w-3 h-3 rounded-full ${theme.color} border border-white/20`}></span>
                        <span className="hidden sm:inline">{theme.label}</span>
                    </span>
                </button>
            ))}
        </div>
    );
};

export default ThemeSwitcher;
