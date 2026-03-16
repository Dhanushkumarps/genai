import type { FC } from 'react'
import { RotateCcw, Settings2, Layout, Type } from 'lucide-react'

const LANGUAGES = ['Python', 'JavaScript', 'TypeScript', 'Java', 'C++', 'Go'] as const

interface EditorToolbarProps {
    language: string
    onLanguageChange: (lang: string) => void
    fontSize: number
    onFontSizeChange: (size: number) => void
    tabSize: number
    onTabSizeChange: (size: number) => void
    showMinimap: boolean
    onMinimapToggle: () => void
    onReset: () => void
}

export const EditorToolbar: FC<EditorToolbarProps> = ({
    language,
    onLanguageChange,
    fontSize,
    onFontSizeChange,
    tabSize,
    onTabSizeChange,
    showMinimap,
    onMinimapToggle,
    onReset
}) => {
    return (
        <div className="flex items-center justify-between px-4 py-2 bg-[#1A1D20] border-b border-[#242424] rounded-t-xl">
            {/* Language Selector */}
            <div className="flex gap-1 overflow-x-auto no-scrollbar">
                {LANGUAGES.map(l => (
                    <button
                        key={l}
                        onClick={() => onLanguageChange(l)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex-shrink-0
                            ${language === l
                                ? 'bg-[#30e8bd]/15 text-[#30e8bd] border border-[#30e8bd]/30'
                                : 'text-[#6B6966] hover:text-[#9A9996] border border-transparent hover:bg-[#22262A]'
                            }`}
                    >
                        {l}
                    </button>
                ))}
            </div>

            {/* Settings */}
            <div className="flex items-center gap-2">
                {/* Font Size Dropdown (Custom implementation for specific look without external dependencies) */}
                <div className="relative group flex items-center">
                    <button className="p-1.5 text-[#6B6966] hover:text-[#E8E6E3] hover:bg-[#22262A] rounded transition" title="Font Size">
                        <Type className="w-4 h-4" />
                    </button>
                    <div className="absolute right-0 top-full mt-1 hidden group-hover:block bg-[#1A1D20] border border-[#242424] rounded-lg shadow-xl z-50 p-1">
                        {[12, 14, 16, 18, 20].map(size => (
                            <button
                                key={size}
                                onClick={() => onFontSizeChange(size)}
                                className={`block w-full text-left px-3 py-1.5 text-xs rounded hover:bg-[#22262A] ${fontSize === size ? 'text-[#30e8bd]' : 'text-[#E8E6E3]'}`}
                            >
                                {size}px
                            </button>
                        ))}
                    </div>
                </div>

                {/* Tab Size Toggle */}
                <button
                    onClick={() => onTabSizeChange(tabSize === 2 ? 4 : 2)}
                    className="flex items-center gap-1 p-1.5 text-xs font-mono text-[#6B6966] hover:text-[#E8E6E3] hover:bg-[#22262A] rounded transition"
                    title={`Tab Size: ${tabSize}`}
                >
                    <Settings2 className="w-4 h-4" />
                    <span>{tabSize}</span>
                </button>

                {/* Minimap Toggle */}
                <button
                    onClick={onMinimapToggle}
                    className={`p-1.5 rounded transition ${showMinimap ? 'text-[#30e8bd] bg-[#30e8bd]/10' : 'text-[#6B6966] hover:text-[#E8E6E3] hover:bg-[#22262A]'}`}
                    title="Toggle Minimap"
                >
                    <Layout className="w-4 h-4" />
                </button>

                <div className="w-[1px] h-4 bg-[#242424] mx-1" />

                <button
                    onClick={() => {
                        if (confirm('Are you sure you want to reset your code to the default starter code?')) {
                            onReset()
                        }
                    }}
                    className="p-1.5 text-[#6B6966] hover:text-[#f04848] hover:bg-[#f04848]/10 rounded transition"
                    title="Reset Code"
                >
                    <RotateCcw className="w-4 h-4" />
                </button>
            </div>
        </div>
    )
}
