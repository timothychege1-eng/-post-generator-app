import React from 'react';
import { SavedContent } from '../types';
import Modal from './Modal';
import { TrashIcon } from './icons';

interface SavedPostsModalProps {
    isOpen: boolean;
    onClose: () => void;
    savedPosts: SavedContent[];
    onLoad: (post: SavedContent) => void;
    onDelete: (id: string) => void;
}

const SavedPostsModal: React.FC<SavedPostsModalProps> = ({ isOpen, onClose, savedPosts, onLoad, onDelete }) => {
    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Saved Content">
            <div className="space-y-4">
                {savedPosts.length > 0 ? (
                    savedPosts.map((post) => (
                        <div key={post.id} className="bg-[var(--color-bg-tertiary)]/50 p-4 rounded-lg flex items-center justify-between gap-4 border border-[var(--color-border-secondary)]">
                            <div className="flex-grow min-w-0">
                                <p className="font-bold text-[var(--color-text-primary)] truncate" title={post.topic}>{post.topic}</p>
                                <p className="text-sm text-[var(--color-text-secondary)]">
                                    Saved on: {new Date(post.savedAt).toLocaleDateString()}
                                </p>
                            </div>
                            <div className="flex-shrink-0 flex gap-2">
                                <button
                                    onClick={() => onLoad(post)}
                                    className="bg-[var(--color-accent-primary)] hover:bg-[var(--color-accent-primary-hover)] text-white font-semibold py-2 px-4 rounded-md transition-colors text-sm"
                                >
                                    Load
                                </button>
                                <button 
                                    onClick={() => onDelete(post.id)}
                                    className="bg-[var(--color-accent-danger)] hover:bg-[var(--color-accent-danger-hover)] text-white p-2 rounded-md transition-colors"
                                    aria-label="Delete saved post"
                                >
                                    <TrashIcon />
                                </button>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="text-center text-[var(--color-text-secondary)] py-8">
                        <p>You have no saved content yet.</p>
                        <p className="text-sm mt-2">Use the "Save This Result" button on generated content to save it for later.</p>
                    </div>
                )}
            </div>
        </Modal>
    );
};

export default SavedPostsModal;
