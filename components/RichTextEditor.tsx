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
            className="p-2 rounded hover:bg-slate-700 text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500" 
            aria-label={label}
            title={label}
        >
            {children}
        </button>
    );

    return (
        <div className="bg-slate-900 border border-slate-700 rounded-md focus-within:ring-2 focus-within:ring-blue-500 transition-shadow">
            <div className="flex items-center p-2 border-b border-slate-700 gap-1 flex-wrap">
                <ToolbarButton onClick={() => handleCommand('bold')} label="Bold"><BoldIcon /></ToolbarButton>
                <ToolbarButton onClick={() => handleCommand('italic')} label="Italic"><ItalicIcon /></ToolbarButton>
                <ToolbarButton onClick={() => handleCommand('insertUnorderedList')} label="Unordered List"><ListUlIcon /></ToolbarButton>
                <ToolbarButton onClick={() => handleCommand('insertOrderedList')} label="Ordered List"><ListOlIcon /></ToolbarButton>
            </div>
            <div
                ref={editorRef}
                contentEditable={true}
                suppressContentEditableWarning={true}
                className="prose prose-invert max-w-none text-slate-200 p-4 min-h-[200px] focus:outline-none"
                onInput={(e) => onContentChange(e.currentTarget.innerHTML)}
                dangerouslySetInnerHTML={{ __html: initialContent }}
            >
            </div>
        </div>
    );
};

export default RichTextEditor;
