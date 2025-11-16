import React, { useState, useEffect, useMemo } from 'react';
import {
    generateCorePosts,
    generateImages,
    generatePodcastAudio,
    generatePodcastScript,
    generateBlogArticle,
    generateLinkedInPoll,
    generateCarousel,
    generateResearchReport,
    generateTopicSuggestions,
    analyzeYoutubeVideoForTopics,
} from './services/geminiService';
import { GeneratedPosts, SavedContent, ScheduledPost, TopicSuggestion, YoutubeTopicSuggestion } from './types';
import {
    SparklesIcon, LinkedInIcon, XIcon, ImagePlaceholderIcon, LoadingSpinner,
    CopyIcon, CheckIcon, ResetIcon, RegenerateIcon, EditIcon, SaveIcon, BookOpenIcon, ClockIcon,
    PlusCircleIcon, TrashIcon, MicrophoneIcon, DownloadIcon, DocumentTextIcon, ChartBarIcon, CollectionIcon,
    VideoCameraIcon,
} from './components/icons';
import Chatbot from './components/Chatbot';
import Modal from './components/Modal';
import RichTextEditor from './components/RichTextEditor';
import SavedPostsModal from './components/SavedPostsModal';
import ScheduledPostsModal from './components/ScheduledPostsModal';

const CopyButton: React.FC<{ text: string }> = ({ text }) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        try {
            // Use the modern Clipboard API
            await navigator.clipboard.writeText(text);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.warn('Clipboard API failed, falling back to legacy method.', err);
            
            // Fallback for browsers/environments that don't support the Clipboard API or have permission issues.
            const textArea = document.createElement('textarea');
            textArea.value = text;
            
            // Make the textarea invisible
            textArea.style.position = 'fixed';
            textArea.style.top = '-9999px';
            textArea.style.left = '-9999px';
            
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            
            try {
                const successful = document.execCommand('copy');
                if (successful) {
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                } else {
                    alert('Copying text failed. Please copy manually.');
                }
            } catch (legacyErr) {
                console.error('Legacy copy method failed:', legacyErr);
                alert('Copying text failed. Please copy manually.');
            }
            
            document.body.removeChild(textArea);
        }
    };

    return (
        <button
            onClick={handleCopy}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-md transition-colors absolute top-2 right-2"
            aria-label="Copy to clipboard"
        >
            {copied ? <CheckIcon /> : <CopyIcon />}
        </button>
    );
};

type EditContentType = 'linkedin' | 'x' | 'podcast' | 'blog' | 'poll' | 'carousel';

interface EditingState {
    type: EditContentType;
    content: any; // This will hold the specific content object being edited
}

const App: React.FC = () => {
    const [topic, setTopic] = useState('');
    const [activeTopic, setActiveTopic] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [generatedContent, setGeneratedContent] = useState<{
        posts: GeneratedPosts;
        images: string[];
    } | null>(null);
    const [selectedImageIndex, setSelectedImageIndex] = useState(0);

    const [isRegeneratingImage, setIsRegeneratingImage] = useState(false);
    
    // On-demand generation states
    const [isGeneratingPodcast, setIsGeneratingPodcast] = useState(false);
    const [isGeneratingBlog, setIsGeneratingBlog] = useState(false);
    const [isGeneratingPoll, setIsGeneratingPoll] = useState(false);
    const [isGeneratingCarousel, setIsGeneratingCarousel] = useState(false);
    const [isGeneratingReport, setIsGeneratingReport] = useState(false);

    const [isEditingPrompt, setIsEditingPrompt] = useState(false);
    const [editedPrompt, setEditedPrompt] = useState('');

    const [artisticStyle, setArtisticStyle] = useState('Default');
    const [colorPalette, setColorPalette] = useState('Default');
    const [composition, setComposition] = useState('Default');
    const [mood, setMood] = useState('Default');
    const [aspectRatio, setAspectRatio] = useState('16:9');
    
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingPost, setEditingPost] = useState<EditingState | null>(null);

    const [savedPosts, setSavedPosts] = useState<SavedContent[]>([]);
    const [isSavedPostsModalOpen, setIsSavedPostsModalOpen] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);
    
    const [scheduledPosts, setScheduledPosts] = useState<ScheduledPost[]>([]);
    const [isScheduledPostsModalOpen, setIsScheduledPostsModalOpen] = useState(false);
    const [schedulingPost, setSchedulingPost] = useState<'linkedin' | 'x' | null>(null);
    const [scheduleDateTime, setScheduleDateTime] = useState('');
    const [scheduleSuccess, setScheduleSuccess] = useState(false);

    // Topic Suggestions State
    const [topicSuggestions, setTopicSuggestions] = useState<TopicSuggestion[] | null>(null);
    const [isSuggesting, setIsSuggesting] = useState(false);

    // YouTube analysis state
    const [youtubeUrl, setYoutubeUrl] = useState('');
    const [isAnalyzingVideo, setIsAnalyzingVideo] = useState(false);
    const [youtubeSuggestions, setYoutubeSuggestions] = useState<YoutubeTopicSuggestion[] | null>(null);
    const [youtubeError, setYoutubeError] = useState<string | null>(null);


    // Podcast State
    const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const [audioError, setAudioError] = useState<string | null>(null);

    // Carousel state
    const [currentSlide, setCurrentSlide] = useState(0);

    useEffect(() => {
        try {
            const storedPosts = localStorage.getItem('viralPostGeneratorSaved');
            if (storedPosts) setSavedPosts(JSON.parse(storedPosts));
            
            const storedSchedule = localStorage.getItem('viralPostGeneratorScheduled');
            if(storedSchedule) setScheduledPosts(JSON.parse(storedSchedule));

        } catch (error) {
            console.error("Failed to load data from local storage", error);
        }
        
        // Cleanup object URLs on unmount
        return () => {
            if (audioUrl) {
                URL.revokeObjectURL(audioUrl);
            }
        };
    }, []);

    const hasResults = !!generatedContent;

    const formatPostContent = (posts: Partial<GeneratedPosts>) => {
        const convertToHtml = (text: string | undefined) => {
            if (!text) return '';
            const lines = text.split('\n');
