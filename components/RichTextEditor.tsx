import React, { useRef } from 'react';
import { BoldIcon, ItalicIcon, ListOlIcon, ListUlIcon } from './icons';

interface RichTextEditorProps {
    initialContent: string;
    onContentChange: (html: string) => void;
}

const RichTextEditor: React.FC<RichTextEditorProps> = ({ initialContent, onContentChange }) => {
    const editorRef = useRef<HTMLDivElement>(null);

    const handleCommand = (command: string) => {
        document.execCommand(command, false, undefined);
        editorRef.current?.focus();
    };

    const ToolbarButton: React.FC<{ onClick: () => void; label: string; children: React.ReactNode }> = ({ onClick, label, children }) => (
        <button 
            type="button" 
            onClick={onClick} 
            className="p-2 rounded hover:bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-primary)]" 
            aria-label={label}
            title={label}
        >
            {children}
        </button>
    );

    return (
        <div className="bg-[var(--color-bg-primary)] border border-[var(--color-border-primary)] rounded-md focus-within:ring-2 focus-within:ring-[var(--color-accent-primary)] transition-shadow">
            <div className="flex items-center p-2 border-b border-[var(--color-border-primary)] gap-1 flex-wrap">
                <ToolbarButton onClick={() => handleCommand('bold')} label="Bold"><BoldIcon /></ToolbarButton>
                <ToolbarButton onClick={() => handleCommand('italic')} label="Italic"><ItalicIcon /></ToolbarButton>
                <ToolbarButton onClick={() => handleCommand('insertUnorderedList')} label="Unordered List"><ListUlIcon /></ToolbarButton>
                <ToolbarButton onClick={() => handleCommand('insertOrderedList')} label="Ordered List"><ListOlIcon /></ToolbarButton>
            </div>
            <div
                ref={editorRef}
                contentEditable={true}
                suppressContentEditableWarning={true}
                className="prose prose-invert max-w-none text-[var(--color-text-primary)] p-4 min-h-[200px] focus:outline-none"
                onInput={(e) => onContentChange(e.currentTarget.innerHTML)}
                dangerouslySetInnerHTML={{ __html: initialContent }}
            >
            </div>
        </div>
    );
};

export default RichTextEditor;