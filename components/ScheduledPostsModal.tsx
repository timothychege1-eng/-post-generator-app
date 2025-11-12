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
                        <div key={post.id} className="bg-slate-700/50 p-4 rounded-lg flex items-center justify-between gap-4">
                            <div className="flex items-center gap-4 flex-grow min-w-0">
                                {post.platform === 'LinkedIn' ? <LinkedInIcon /> : <XIcon />}
                                <div className="flex-grow min-w-0">
                                    <p className="font-bold text-white truncate" title={post.topic}>{post.topic}</p>
                                    <p className="text-sm text-slate-400 truncate" title={getSnippet(post)}>
                                        {getSnippet(post)}
                                    </p>
                                    <p className="text-sm text-purple-300 flex items-center gap-1.5 mt-1">
                                        <ClockIcon />
                                        {new Date(post.scheduledAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                                    </p>
                                </div>
                            </div>
                            <div className="flex-shrink-0">
                                <button 
                                    onClick={() => onUnschedule(post.id)}
                                    className="bg-red-600 hover:bg-red-700 text-white p-2 rounded-md transition-colors"
                                    aria-label="Unschedule post"
                                >
                                    <TrashIcon />
                                </button>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="text-center text-slate-400 py-8">
                        <p>You have no posts scheduled yet.</p>
                        <p className="text-sm mt-2">Use the "Schedule" button on a generated post to add it to your calendar.</p>
                    </div>
                )}
            </div>
        </Modal>
    );
};

export default ScheduledPostsModal;
