import { useRef } from 'react'
import type { FC } from 'react'
import Editor, { useMonaco } from '@monaco-editor/react'
import type { OnMount } from '@monaco-editor/react'

export type Language = 'Python' | 'JavaScript' | 'TypeScript' | 'Java' | 'C++' | 'Go'
type MonacoLanguage = 'python' | 'javascript' | 'typescript' | 'java' | 'cpp' | 'go'

const languageMap: Record<Language, MonacoLanguage> = {
    'Python': 'python',
    'JavaScript': 'javascript',
    'TypeScript': 'typescript',
    'Java': 'java',
    'C++': 'cpp',
    'Go': 'go'
}

interface CodeEditorProps {
    code: string
    language: Language
    fontSize: number
    tabSize: number
    showMinimap: boolean
    wordWrap: 'on' | 'off'
    onChange: (value: string | undefined) => void
    onRun?: () => void
    onSubmit?: () => void
}

export const CodeEditor: FC<CodeEditorProps> = ({
    code,
    language,
    fontSize,
    tabSize,
    showMinimap,
    wordWrap,
    onChange,
    onRun,
    onSubmit
}) => {
    const monaco = useMonaco()
    const editorRef = useRef<any>(null)

    const handleEditorMount: OnMount = (editor, monaco) => {
        editorRef.current = editor

        // Define custom theme
        monaco.editor.defineTheme('skillosDark', {
            base: 'vs-dark',
            inherit: true,
            rules: [
                { background: '0a0a0a' },
                { token: 'keyword', foreground: '30e8bd' },
                { token: 'identifier', foreground: 'e8e6e3' },
            ],
            colors: {
                'editor.background': '#0a0a0a',
                'editor.lineHighlightBackground': '#ffffff08',
                'editorLineNumber.foreground': '#4a4845',
                'editorLineNumber.activeForeground': '#9a9996',
                'editorIndentGuide.background': '#242424',
                'editorIndentGuide.activeBackground': '#4a4845',
            }
        })
        monaco.editor.setTheme('skillosDark')

        // Add keyboard shortcuts
        if (onRun) {
            editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
                onRun()
            })
        }
        if (onSubmit) {
            editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.Enter, () => {
                onSubmit()
            })
        }
    }

    return (
        <div className="w-full h-full min-h-[400px]">
            <Editor
                height="100%"
                language={languageMap[language]}
                value={code}
                onChange={onChange}
                onMount={handleEditorMount}
                theme="skillosDark"
                options={{
                    fontSize,
                    tabSize,
                    minimap: { enabled: showMinimap },
                    wordWrap,
                    fontFamily: '"JetBrains Mono", "Fira Code", monospace',
                    bracketPairColorization: { enabled: true },
                    formatOnPaste: true,
                    scrollBeyondLastLine: false,
                    smoothScrolling: true,
                    cursorBlinking: 'smooth',
                    renderLineHighlight: 'all',
                    padding: { top: 16, bottom: 16 }
                }}
                loading={<div className="text-sm text-[#4A4845] p-4 text-center">Loading Editor...</div>}
            />
        </div>
    )
}
