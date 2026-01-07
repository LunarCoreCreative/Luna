import React, { useRef, useEffect } from 'react';
import Editor, { loader } from '@monaco-editor/react';

// Pre-load loader configuration if needed (optional)
// loader.config({ paths: { vs: '...' } });

const CodeEditor = ({
    value = '',
    onChange,
    language = 'javascript',
    readOnly = false
}) => {
    const editorRef = useRef(null);

    // Map common language aliases to Monaco IDs
    const getMonacoLanguage = (lang) => {
        const l = (lang || '').toLowerCase();
        if (l === 'js' || l === 'jsx') return 'javascript';
        if (l === 'ts' || l === 'tsx') return 'typescript';
        if (l === 'py') return 'python';
        if (l === 'md') return 'markdown'; // Monaco supports markdown officially
        if (l === 'sh' || l === 'bash') return 'shell';
        if (l === 'json') return 'json';
        if (l === 'html') return 'html';
        if (l === 'css') return 'css';
        return l || 'javascript';
    };

    const handleBeforeMount = (monaco) => {
        monaco.editor.defineTheme('luna-deep-gray', {
            base: 'vs-dark',
            inherit: true,
            rules: [
                { token: 'comment', foreground: '6a9955' },
                { token: 'keyword', foreground: '569cd6' },
                { token: 'string', foreground: 'ce9178' },
                { token: 'number', foreground: 'b5cea8' },
                { token: 'regexp', foreground: 'd16969' },
                { token: 'type', foreground: '4ec9b0' },
                { token: 'class', foreground: '4ec9b0' },
                { token: 'function', foreground: 'dcdcaa' },
                { token: 'variable', foreground: '9cdcfe' },
            ],
            colors: {
                'editor.background': '#0d1117', // Cinza profundo (GitHub Dark style)
                'editor.foreground': '#c9d1d9',
                'editor.lineHighlightBackground': '#161b22',
                'editorCursor.foreground': '#58a6ff',
                'editorWhitespace.foreground': '#30363d',
                'editorIndentGuide.background': '#21262d',
                'editorIndentGuide.activeBackground': '#30363d',
                'editor.selectionBackground': '#1f6feb44',
            }
        });
    };

    const handleEditorDidMount = (editor, monaco) => {
        editorRef.current = editor;

        // Redefine para garantir (Monaco às vezes perde temas customizados em re-renders)
        monaco.editor.defineTheme('luna-deep-gray', {
            base: 'vs-dark',
            inherit: true,
            rules: [
                { token: 'comment', foreground: '6a9955' },
                { token: 'keyword', foreground: '569cd6' },
                { token: 'string', foreground: 'ce9178' },
                { token: 'number', foreground: 'b5cea8' },
                { token: 'regexp', foreground: 'd16969' },
                { token: 'type', foreground: '4ec9b0' },
                { token: 'class', foreground: '4ec9b0' },
                { token: 'function', foreground: 'dcdcaa' },
                { token: 'variable', foreground: '9cdcfe' },
            ],
            colors: {
                'editor.background': '#0d1117',
                'editor.foreground': '#c9d1d9',
                'editor.lineHighlightBackground': '#161b22',
                'editorCursor.foreground': '#58a6ff',
                'editorWhitespace.foreground': '#30363d',
                'editorIndentGuide.background': '#21262d',
                'editorIndentGuide.activeBackground': '#30363d',
                'editor.selectionBackground': '#1f6feb44',
            }
        });
        monaco.editor.setTheme('luna-deep-gray');
    };

    return (
        <div className="h-full w-full bg-[#0d1117] overflow-hidden">
            <Editor
                height="100%"
                language={getMonacoLanguage(language)}
                value={value}
                onChange={onChange}
                theme="luna-deep-gray"
                beforeMount={handleBeforeMount}
                onMount={handleEditorDidMount}
                options={{
                    readOnly: readOnly,
                    minimap: {
                        enabled: true,
                        side: 'right',
                        scale: 1,
                        showSlider: 'mouseover'
                    },
                    fontSize: 14,
                    lineHeight: 20,
                    fontFamily: "'JetBrains Mono', 'Fira Code', Consolas, monospace",
                    fontLigatures: true,
                    wordWrap: 'on',
                    automaticLayout: true,
                    scrollBeyondLastLine: false,
                    smoothScrolling: true,
                    padding: { top: 10, bottom: 10 },
                    renderLineHighlight: 'all',
                    cursorBlinking: 'smooth',
                    cursorSmoothCaretAnimation: 'on',
                    tabSize: 4,
                    scrollbar: {
                        vertical: 'visible',
                        horizontal: 'visible',
                        useShadows: false,
                        verticalScrollbarSize: 10,
                        horizontalScrollbarSize: 10
                    }
                }}
            />
        </div>
    );
};

export default CodeEditor;
