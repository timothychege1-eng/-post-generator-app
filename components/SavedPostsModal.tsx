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
        <Modal isOpen={isOpen} onClose={onClose} title="Saved Posts">
            <div className="space-y-4">
                {savedPosts.length > 0 ? (
                    savedPosts.map((post) => (
                        <div key={post.id} className="bg-slate-700/50 p-4 rounded-lg flex items-center justify-between gap-4">
                            <div className="flex-grow">
                                <p className="font-bold text-white truncate" title={post.topic}>{post.topic}</p>
                                <p className="text-sm text-slate-400">
                                    Saved on: {new Date(post.savedAt).toLocaleDateString()} at {new Date(post.savedAt).toLocaleTimeString()}
                                </p>
                            </div>
                            <div className="flex-shrink-0 flex gap-2">
                                <button 
                                    onClick={() => onLoad(post)}
                                    className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-md transition-colors text-sm"
                                >
                                    Load
                                </button>
                                <button 
                                    onClick={() => onDelete(post.id)}
                                    className="bg-red-600 hover:bg-red-700 text-white p-2 rounded-md transition-colors"
                                    aria-label="Delete saved post"
                                >
                                    <TrashIcon />
                                </button>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="text-center text-slate-400 py-8">
                        <p>You have no saved posts yet.</p>
                        <p className="text-sm mt-2">Generate some content and click "Save This Result" to store it here.</p>
                    </div>
                )}
            </div>
        </Modal>
    );
};

export default SavedPostsModal;
