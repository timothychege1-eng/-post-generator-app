import React from 'react';
import { ScheduledPost, LinkedInPost } from '../types';
import Modal from './Modal';
import { ClockIcon, LinkedInIcon, TrashIcon, XIcon } from './icons';

interface ScheduledPostsModalProps {
    isOpen: boolean;
    onClose: () => void;
    scheduledPosts: ScheduledPost[];
    onUnschedule: (id: string) => void;
}

const ScheduledPostsModal: React.FC<ScheduledPostsModalProps> = ({ isOpen, onClose, scheduledPosts, onUnschedule }) => {
    
    const getSnippet = (post: ScheduledPost) => {
        if (post.platform === 'LinkedIn') {
            return (post.content as LinkedInPost).title;
        }
        return post.content.body.substring(0, 50) + '...';
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Scheduled Posts">
            <div className="space-y-4">
                {scheduledPosts.length > 0 ? (
                    scheduledPosts.map((post) => (
                        <div key={post.id} className="bg-[var(--color-bg-tertiary)]/50 p-4 rounded-lg flex items-center justify-between gap-4 border border-[var(--color-border-secondary)]">
                            <div className="flex items-center gap-4 flex-grow min-w-0">
                                {post.platform === 'LinkedIn' ? <LinkedInIcon /> : <XIcon />}
                                <div className="flex-grow min-w-0">
                                    <p className="font-bold text-[var(--color-text-primary)] truncate" title={post.topic}>{post.topic}</p>
                                    <p className="text-sm text-[var(--color-text-secondary)] truncate" title={getSnippet(post)}>
                                        {getSnippet(post)}
                                    </p>
                                    <p className="text-sm text-[var(--color-text-accent)] flex items-center gap-1.5 mt-1">
                                        <ClockIcon />
                                        {new Date(post.scheduledAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                                    </p>
                                </div>
                            </div>
                            <div className="flex-shrink-0">
                                <button 
                                    onClick={() => onUnschedule(post.id)}
                                    className="bg-[var(--color-accent-danger)] hover:bg-[var(--color-accent-danger-hover)] text-white p-2 rounded-md transition-colors"
                                    aria-label="Unschedule post"
                                >
                                    <TrashIcon />
                                </button>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="text-center text-[var(--color-text-secondary)] py-8">
                        <p>You have no posts scheduled yet.</p>
                        <p className="text-sm mt-2">Use the "Schedule" button on a generated post to add it to your calendar.</p>
                    </div>
                )}
            </div>
        </Modal>
    );
};

export default ScheduledPostsModal;
