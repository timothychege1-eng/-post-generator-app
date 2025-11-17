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
            let html = '';
            let inList = false;

            lines.forEach(line => {
                line = line.trim();
                if (/^\d+\./.test(line)) { // Matches lines starting with "1.", "2.", etc.
                    if (!inList) {
                        html += '<ol class="list-decimal list-inside">';
                        inList = true;
                    }
                    html += `<li>${line.substring(line.indexOf('.') + 1).trim()}</li>`;
                } else {
                    if (inList) {
                        html += '</ol>';
                        inList = false;
                    }
                    if (line) {
                        html += `<p>${line}</p>`;
                    }
                }
            });

            if (inList) {
                html += '</ol>';
            }

            return html;
        };
        
        return {
            linkedinBodyHtml: convertToHtml(posts.linkedinPost?.body),
            xBodyHtml: posts.xPost?.body.replace(/\n/g, '<br />'),
            blogBodyHtml: posts.blogArticle?.body, // Assuming blog body is already formatted
        };
    };
    
    const { linkedinBodyHtml, xBodyHtml, blogBodyHtml } = useMemo(() => {
        return formatPostContent(generatedContent?.posts || {});
    }, [generatedContent]);


    const handleGenerate = async (useTopic: string) => {
        if (!useTopic) {
            setError('Please enter a topic.');
            return;
        }
        setIsLoading(true);
        setError(null);
        setGeneratedContent(null);
        setActiveTopic(useTopic);
        setTopicSuggestions(null);
        setYoutubeSuggestions(null);

        try {
            const corePosts = await generateCorePosts(useTopic);
            
            setEditedPrompt(corePosts.imagePrompt); // Set initial prompt for editing

            const generatedImages = await generateImages(
                corePosts.imagePrompt,
                artisticStyle,
                colorPalette,
                composition,
                mood,
                aspectRatio
            );
            
            setGeneratedContent({
                posts: corePosts,
                images: generatedImages,
            });
            setSelectedImageIndex(0);

        } catch (err: any) {
            setError(err.message || 'An unexpected error occurred.');
        } finally {
            setIsLoading(false);
            setTopic('');
        }
    };

    const handleRegenerateImage = async () => {
        if (!generatedContent?.posts.imagePrompt) return;
        setIsRegeneratingImage(true);
        setError(null);
        try {
             const promptToUse = isEditingPrompt && editedPrompt ? editedPrompt : generatedContent.posts.imagePrompt;
            const newImages = await generateImages(
                promptToUse,
                artisticStyle,
                colorPalette,
                composition,
                mood,
                aspectRatio
            );
            setGeneratedContent(prev => prev ? ({ ...prev, images: newImages }) : null);
            setSelectedImageIndex(0);
        } catch (err: any) {
            setError('Failed to regenerate image: ' + err.message);
        } finally {
            setIsRegeneratingImage(false);
            setIsEditingPrompt(false);
        }
    };

    const handleGeneratePodcast = async () => {
        if (!activeTopic) return;
        setIsGeneratingPodcast(true);
        setAudioError(null);
        setAudioUrl(null);
        try {
            let script: string;
            // If we already have a script, use it. Otherwise, generate one.
            if(generatedContent?.posts.podcastScript?.script) {
                script = generatedContent.posts.podcastScript.script;
            } else {
                const podcastContent = await generatePodcastScript(activeTopic);
                setGeneratedContent(prev => prev ? ({
                    ...prev,
                    posts: { ...prev.posts, podcastScript: podcastContent }
                }) : null);
                script = podcastContent.script;
            }

            setIsGeneratingAudio(true);
            const audioBlob = await generatePodcastAudio(script);
            if (audioUrl) {
                URL.revokeObjectURL(audioUrl);
            }
            setAudioUrl(URL.createObjectURL(audioBlob));

        } catch (err: any) {
            setAudioError("Failed to generate podcast: " + err.message);
        } finally {
            setIsGeneratingPodcast(false);
            setIsGeneratingAudio(false);
        }
    };

    const handleGenerateOnDemand = async (type: 'blog' | 'poll' | 'carousel' | 'report') => {
        if (!activeTopic) return;
        
        const setLoading = {
            blog: setIsGeneratingBlog,
            poll: setIsGeneratingPoll,
            carousel: setIsGeneratingCarousel,
            report: setIsGeneratingReport,
        }[type];
        
        const generatorFn = {
            blog: generateBlogArticle,
            poll: generateLinkedInPoll,
            carousel: generateCarousel,
            report: generateResearchReport,
        }[type];

        const contentKey = {
            blog: 'blogArticle',
            poll: 'linkedinPoll',
            carousel: 'carouselPresentation',
            report: 'researchReport',
        }[type];

        setLoading(true);
        setError(null);
        try {
            const result = await generatorFn(activeTopic);
            setGeneratedContent(prev => {
                if (!prev) return null;
                return {
                    ...prev,
                    posts: {
                        ...prev.posts,
                        [contentKey]: result,
                    }
                }
            });
        } catch (err: any) {
             setError(`Failed to generate ${type}: ` + err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenEditModal = (type: EditContentType) => {
        if (!generatedContent) return;
        let contentToEdit: any;
        switch(type) {
            case 'linkedin': contentToEdit = generatedContent.posts.linkedinPost; break;
            case 'x': contentToEdit = generatedContent.posts.xPost; break;
            case 'podcast': contentToEdit = generatedContent.posts.podcastScript; break;
            case 'blog': contentToEdit = generatedContent.posts.blogArticle; break;
            case 'poll': contentToEdit = generatedContent.posts.linkedinPoll; break;
            case 'carousel': contentToEdit = generatedContent.posts.carouselPresentation; break;
        }
        if (contentToEdit) {
            setEditingPost({ type, content: contentToEdit });
            setIsEditModalOpen(true);
        }
    };

    const handleSaveEditedPost = (newContent: any) => {
        if (!editingPost || !generatedContent) return;

        const keyMap = {
            linkedin: 'linkedinPost',
            x: 'xPost',
            podcast: 'podcastScript',
            blog: 'blogArticle',
            poll: 'linkedinPoll',
            carousel: 'carouselPresentation',
        };

        const contentKey = keyMap[editingPost.type];

        setGeneratedContent({
            ...generatedContent,
            posts: {
                ...generatedContent.posts,
                [contentKey]: newContent
            }
        });
        setIsEditModalOpen(false);
        setEditingPost(null);
    };

    const handleSave = () => {
        if (!generatedContent) return;
        const newSavedPost: SavedContent = {
            id: new Date().toISOString(),
            savedAt: new Date().toISOString(),
            topic: activeTopic,
            posts: generatedContent.posts,
        };
        const updatedSavedPosts = [newSavedPost, ...savedPosts];
        setSavedPosts(updatedSavedPosts);
        localStorage.setItem('viralPostGeneratorSaved', JSON.stringify(updatedSavedPosts));
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 2000);
    };
    
    const handleDeleteSaved = (id: string) => {
        const updatedPosts = savedPosts.filter(p => p.id !== id);
        setSavedPosts(updatedPosts);
        localStorage.setItem('viralPostGeneratorSaved', JSON.stringify(updatedPosts));
    };

    const handleLoadSaved = (savedItem: SavedContent) => {
        setActiveTopic(savedItem.topic);
        setGeneratedContent({
            // Assuming saved items don't have images, or we regenerate them
            posts: savedItem.posts,
            images: [],
        });
        setEditedPrompt(savedItem.posts.imagePrompt);
        setIsSavedPostsModalOpen(false);
        // We're not regenerating the image on load, but we could add a button for it.
        // For now, clear any previous image.
    };

    const handleSchedulePost = () => {
        if (!schedulingPost || !scheduleDateTime || !generatedContent) return;

        const content = schedulingPost === 'linkedin' ?
            generatedContent.posts.linkedinPost :
            generatedContent.posts.xPost;
        
        if (!content) return;

        const newScheduledPost: ScheduledPost = {
            id: `${schedulingPost}-${new Date().toISOString()}`,
            platform: schedulingPost === 'linkedin' ? 'LinkedIn' : 'X',
            scheduledAt: new Date(scheduleDateTime).toISOString(),
            content: content,
            topic: activeTopic
        };

        const updatedSchedule = [...scheduledPosts, newScheduledPost].sort((a,b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());
        setScheduledPosts(updatedSchedule);
        localStorage.setItem('viralPostGeneratorScheduled', JSON.stringify(updatedSchedule));

        setScheduleSuccess(true);
        setTimeout(() => {
            setScheduleSuccess(false);
            setSchedulingPost(null);
            setScheduleDateTime('');
        }, 2000);
    };

    const handleUnschedule = (id: string) => {
        const updatedSchedule = scheduledPosts.filter(p => p.id !== id);
        setScheduledPosts(updatedSchedule);
        localStorage.setItem('viralPostGeneratorScheduled', JSON.stringify(updatedSchedule));
    };

    const handleSuggestTopics = async () => {
        if (!topic.trim()) {
            setError("Please enter a central theme to get suggestions.");
            return;
        }
        setIsSuggesting(true);
        setError(null);
        setYoutubeSuggestions(null);
        setTopicSuggestions(null);

        try {
            const suggestions = await generateTopicSuggestions(topic);
            setTopicSuggestions(suggestions);
        } catch (err: any) {
            setError(err.message || "Failed to get topic suggestions.");
        } finally {
            setIsSuggesting(false);
        }
    };
    
    const handleAnalyzeVideo = async () => {
        if (!youtubeUrl.trim() || !youtubeUrl.startsWith('https://')) {
            setYoutubeError("Please enter a valid YouTube URL (starting with https://).");
            return;
        }
        setIsAnalyzingVideo(true);
        setYoutubeError(null);
        setYoutubeSuggestions(null);
        setTopicSuggestions(null);

        try {
            const suggestions = await analyzeYoutubeVideoForTopics(youtubeUrl);
            setYoutubeSuggestions(suggestions);
        } catch (err: any) {
            setYoutubeError(err.message || "Failed to analyze the video.");
        } finally {
            setIsAnalyzingVideo(false);
        }
    };


    const resetState = () => {
        setTopic('');
        setActiveTopic('');
        setIsLoading(false);
        setError(null);
        setGeneratedContent(null);
        setTopicSuggestions(null);
        setYoutubeSuggestions(null);
        setYoutubeUrl('');
        setYoutubeError(null);
    };

    const PostCard: React.FC<{
        title: string;
        icon: React.ReactNode;
        children: React.ReactNode;
        onEdit?: () => void;
        onSchedule?: () => void;
    }> = ({ title, icon, children, onEdit, onSchedule }) => (
        <div className="bg-slate-800/50 rounded-lg shadow-lg overflow-hidden relative border border-slate-700">
            <div className="p-4 border-b border-slate-700 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <span className="text-blue-400">{icon}</span>
                    <h3 className="text-lg font-bold text-white">{title}</h3>
                </div>
                <div className="flex items-center gap-2">
                    {onEdit && (
                         <button onClick={onEdit} className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-md transition-colors" aria-label={`Edit ${title}`}>
                            <EditIcon />
                        </button>
                    )}
                    {onSchedule && (
                         <button onClick={onSchedule} className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-md transition-colors" aria-label={`Schedule ${title}`}>
                            <ClockIcon />
                        </button>
                    )}
                </div>
            </div>
            <div className="p-6 text-slate-300">
                {children}
            </div>
        </div>
    );
    
    const OnDemandButton: React.FC<{
        isGenerating: boolean;
        onClick: () => void;
        generatedContent: any;
        icon: React.ReactNode;
        label: string;
    }> = ({ isGenerating, onClick, generatedContent, icon, label }) => (
         <button
            onClick={onClick}
            disabled={isGenerating}
            className={`w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold rounded-md transition-colors duration-200 ease-in-out
                ${isGenerating ? 'bg-slate-600 text-slate-400 cursor-not-allowed' :
                 generatedContent ? 'bg-green-600/20 text-green-300 border border-green-500/50 hover:bg-green-600/40' :
                 'bg-blue-600/20 text-blue-300 border border-blue-500/50 hover:bg-blue-600/40'
                }`}
        >
            {isGenerating ? <LoadingSpinner /> : icon}
            <span>{isGenerating ? `Generating ${label}...` : generatedContent ? `${label} Generated` : `Generate ${label}`}</span>
        </button>
    );

    return (
        <div className="min-h-screen bg-slate-900 text-slate-200 font-sans">
            <header className="bg-slate-900/70 backdrop-blur-lg sticky top-0 z-40 border-b border-slate-800">
                <div className="container mx-auto px-4 py-4 flex flex-col sm:flex-row justify-between items-center gap-4">
                    <div className="flex items-center gap-3">
                         <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400">
                             <SparklesIcon />
                         </div>
                        <h1 className="text-xl font-bold text-white">Kenya Data & AI Society Content Hub</h1>
                    </div>
                     <div className="flex items-center gap-2">
                        <button 
                            onClick={() => setIsSavedPostsModalOpen(true)}
                            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold py-2 px-4 rounded-md transition-colors text-sm"
                        >
                            <SaveIcon /> Saved ({savedPosts.length})
                        </button>
                         <button 
                            onClick={() => setIsScheduledPostsModalOpen(true)}
                            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold py-2 px-4 rounded-md transition-colors text-sm"
                        >
                            <ClockIcon /> Scheduled ({scheduledPosts.length})
                        </button>
                    </div>
                </div>
            </header>

            <main className="container mx-auto p-4 md:p-8">
                <div className="max-w-3xl mx-auto bg-slate-800/50 p-6 md:p-8 rounded-2xl shadow-2xl border border-slate-700/50">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-3 bg-blue-500/10 rounded-lg text-blue-400">
                            <PlusCircleIcon />
                        </div>
                        <h2 className="text-2xl font-bold text-white">Create New Content</h2>
                    </div>
                    <p className="text-slate-400 mb-6">
                        Start by entering a topic, a central theme, or even a YouTube video URL. The AI will generate a variety of content for you to use.
                    </p>

                    {error && <div className="bg-red-500/10 border border-red-500/30 text-red-300 p-4 rounded-md mb-6">{error}</div>}

                    <div className="space-y-4">
                        <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700">
                            <label htmlFor="topic-input" className="block text-sm font-medium text-slate-300 mb-2">Topic or Theme</label>
                            <form onSubmit={(e) => { e.preventDefault(); handleGenerate(topic); }} className="flex flex-col sm:flex-row gap-2">
                                <input
                                    id="topic-input"
                                    type="text"
                                    value={topic}
                                    onChange={(e) => setTopic(e.target.value)}
                                    placeholder="e.g., The Future of AI in Kenyan Agriculture"
                                    className="flex-grow bg-slate-800 border border-slate-600 rounded-md px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow"
                                />
                                <button
                                    type="submit"
                                    disabled={isLoading || !topic.trim()}
                                    className="flex items-center justify-center bg-blue-600 text-white font-semibold py-2.5 px-6 rounded-md hover:bg-blue-700 disabled:bg-slate-600 disabled:cursor-not-allowed transition-colors"
                                >
                                    {isLoading ? <LoadingSpinner /> : <SparklesIcon />}
                                    <span className="ml-2">{isLoading ? 'Generating...' : 'Generate'}</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={handleSuggestTopics}
                                    disabled={isSuggesting || !topic.trim()}
                                    className="flex items-center justify-center bg-purple-600 text-white font-semibold py-2.5 px-6 rounded-md hover:bg-purple-700 disabled:bg-slate-600 disabled:cursor-not-allowed transition-colors"
                                >
                                    {isSuggesting ? <LoadingSpinner /> : '💡'}
                                    <span className="ml-2">{isSuggesting ? 'Suggesting...' : 'Suggest Topics'}</span>
                                </button>
                            </form>
                        </div>

                         <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700">
                             <label htmlFor="youtube-url-input" className="block text-sm font-medium text-slate-300 mb-2">Or, Analyze a YouTube Video</label>
                             <form onSubmit={(e) => { e.preventDefault(); handleAnalyzeVideo(); }} className="flex flex-col sm:flex-row gap-2">
                                 <input
                                     id="youtube-url-input"
                                     type="url"
                                     value={youtubeUrl}
                                     onChange={(e) => setYoutubeUrl(e.target.value)}
                                     placeholder="e.g., https://www.youtube.com/watch?v=..."
                                     className="flex-grow bg-slate-800 border border-slate-600 rounded-md px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow"
                                 />
                                 <button
                                     type="submit"
                                     disabled={isAnalyzingVideo || !youtubeUrl.trim()}
                                     className="flex items-center justify-center bg-red-600 text-white font-semibold py-2.5 px-6 rounded-md hover:bg-red-700 disabled:bg-slate-600 disabled:cursor-not-allowed transition-colors"
                                 >
                                     {isAnalyzingVideo ? <LoadingSpinner /> : <VideoCameraIcon/>}
                                     <span className="ml-2">{isAnalyzingVideo ? 'Analyzing...' : 'Analyze Video'}</span>
                                 </button>
                             </form>
                            {youtubeError && <p className="text-red-400 text-sm mt-2">{youtubeError}</p>}
                         </div>

                    </div>
                </div>

                {(topicSuggestions || youtubeSuggestions) && (
                    <div className="max-w-3xl mx-auto mt-8">
                        <h3 className="text-xl font-bold mb-4">Topic Suggestions</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {(topicSuggestions || youtubeSuggestions)?.map((suggestion, index) => (
                                <div key={index} className="bg-slate-800/50 p-4 rounded-lg border border-slate-700/50 hover:bg-slate-800 transition-colors">
                                    <p className="font-semibold text-blue-300">{(suggestion as TopicSuggestion).day || `Suggestion ${index + 1}`}</p>
                                    <p className="text-slate-300 mt-1">{(suggestion as any).topic}</p>
                                    {(suggestion as YoutubeTopicSuggestion).description && <p className="text-sm text-slate-400 mt-2">{(suggestion as YoutubeTopicSuggestion).description}</p>}
                                    <button onClick={() => handleGenerate((suggestion as any).topic)} className="mt-4 text-sm bg-blue-600/50 hover:bg-blue-600 text-white font-semibold py-1 px-3 rounded-full transition-colors">
                                        Generate content for this topic
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}


                {hasResults && (
                    <div id="results" className="mt-12 max-w-5xl mx-auto">
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h2 className="text-3xl font-bold text-white">Generated Content</h2>
                                <p className="text-slate-400 mt-1">Topic: <span className="font-semibold text-slate-300">{activeTopic}</span></p>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={handleSave}
                                    className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-md transition-colors"
                                >
                                    {saveSuccess ? <CheckIcon/> : <SaveIcon />}
                                    {saveSuccess ? 'Saved!' : 'Save This Result'}
                                </button>
                                <button
                                    onClick={resetState}
                                    className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-slate-300 font-semibold py-2 px-4 rounded-md transition-colors"
                                >
                                    <ResetIcon />
                                    Start Over
                                </button>
                            </div>
                        </div>
                        
                        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                           {/* Main Content Column */}
                            <div className="lg:col-span-3 space-y-8">
                                {generatedContent?.posts.linkedinPost && (
                                    <PostCard title="LinkedIn Post" icon={<LinkedInIcon />} onEdit={() => handleOpenEditModal('linkedin')} onSchedule={() => setSchedulingPost('linkedin')}>
                                        <h4 className="text-xl font-bold mb-2 text-white">{generatedContent.posts.linkedinPost.title}</h4>
                                        <div className="prose prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: linkedinBodyHtml || '' }} />
                                        <div className="mt-4 flex flex-wrap gap-2">
                                            {generatedContent.posts.linkedinPost.hashtags.map((tag, i) => (
                                                <span key={i} className="text-sm bg-slate-700 text-blue-300 px-2 py-1 rounded">#{tag}</span>
                                            ))}
                                        </div>
                                        <CopyButton text={generatedContent.posts.linkedinPost.body} />
                                    </PostCard>
                                )}
                                {generatedContent?.posts.xPost && (
                                    <PostCard title="X (Twitter) Post" icon={<XIcon />} onEdit={() => handleOpenEditModal('x')} onSchedule={() => setSchedulingPost('x')}>
                                        <div className="prose prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: xBodyHtml || '' }} />
                                        <div className="mt-4 flex flex-wrap gap-2">
                                            {generatedContent.posts.xPost.hashtags.map((tag, i) => (
                                                <span key={i} className="text-sm bg-slate-700 text-blue-300 px-2 py-1 rounded">#{tag}</span>
                                            ))}
                                        </div>
                                         <CopyButton text={generatedContent.posts.xPost.body} />
                                    </PostCard>
                                )}
                                {generatedContent?.posts.podcastScript && (
                                     <PostCard title="Podcast" icon={<MicrophoneIcon />} onEdit={() => handleOpenEditModal('podcast')}>
                                        <h4 className="text-xl font-bold mb-2 text-white">{generatedContent.posts.podcastScript.title}</h4>
                                        <div className="prose prose-invert max-w-none mb-4" dangerouslySetInnerHTML={{ __html: generatedContent.posts.podcastScript.script.replace(/\n/g, '<br/>') }} />
                                        
                                        {audioError && <p className="text-red-400 text-sm mt-4">{audioError}</p>}
                                        {audioUrl && (
                                            <div className="mt-4">
                                                <audio controls src={audioUrl} className="w-full"></audio>
                                            </div>
                                        )}
                                        <button 
                                            onClick={handleGeneratePodcast} 
                                            disabled={isGeneratingAudio}
                                            className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold rounded-md transition-colors bg-purple-600 hover:bg-purple-700 text-white disabled:bg-slate-600"
                                        >
                                            {isGeneratingAudio ? <LoadingSpinner/> : <MicrophoneIcon/>}
                                            {isGeneratingAudio ? 'Generating Audio...' : audioUrl ? 'Regenerate Audio' : 'Generate Audio'}
                                        </button>
                                    </PostCard>
                                )}
                                {generatedContent?.posts.blogArticle && (
                                     <PostCard title="Blog Article" icon={<DocumentTextIcon />} onEdit={() => handleOpenEditModal('blog')}>
                                        <h4 className="text-xl font-bold mb-2 text-white">{generatedContent.posts.blogArticle.title}</h4>
                                        <div className="prose prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: blogBodyHtml || '' }} />
                                        <div className="mt-4 flex flex-wrap gap-2">
                                            {generatedContent.posts.blogArticle.hashtags.map((tag, i) => (
                                                <span key={i} className="text-sm bg-slate-700 text-blue-300 px-2 py-1 rounded">#{tag}</span>
                                            ))}
                                        </div>
                                    </PostCard>
                                )}
                                {generatedContent?.posts.linkedinPoll && (
                                    <PostCard title="LinkedIn Poll" icon={<ChartBarIcon />} onEdit={() => handleOpenEditModal('poll')}>
                                        <p className="font-semibold text-white mb-4">{generatedContent.posts.linkedinPoll.question}</p>
                                        <div className="space-y-2">
                                            {generatedContent.posts.linkedinPoll.options.map((option, i) => (
                                                <div key={i} className="bg-slate-700/50 p-3 rounded-md border border-slate-600">
                                                    {option}
                                                </div>
                                            ))}
                                        </div>
                                    </PostCard>
                                )}
                                {generatedContent?.posts.carouselPresentation && (
                                    <PostCard title="Carousel Presentation" icon={<CollectionIcon />} onEdit={() => handleOpenEditModal('carousel')}>
                                        <h4 className="text-xl font-bold mb-4 text-white">{generatedContent.posts.carouselPresentation.title}</h4>
                                        <div className="bg-slate-900/50 p-6 rounded-lg min-h-[200px] flex flex-col justify-center border border-slate-700">
                                             <h5 className="text-lg font-bold text-blue-300 mb-2">{generatedContent.posts.carouselPresentation.slides[currentSlide].title}</h5>
                                             <p>{generatedContent.posts.carouselPresentation.slides[currentSlide].content}</p>
                                        </div>
                                        <div className="flex justify-between items-center mt-4">
                                            <button 
                                                onClick={() => setCurrentSlide(prev => Math.max(0, prev - 1))}
                                                disabled={currentSlide === 0}
                                                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                Previous
                                            </button>
                                            <span className="text-sm text-slate-400">{currentSlide + 1} / {generatedContent.posts.carouselPresentation.slides.length}</span>
                                            <button 
                                                onClick={() => setCurrentSlide(prev => Math.min(generatedContent.posts.carouselPresentation.slides.length - 1, prev + 1))}
                                                disabled={currentSlide === generatedContent.posts.carouselPresentation.slides.length - 1}
                                                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                Next
                                            </button>
                                        </div>
                                    </PostCard>
                                )}
                                {generatedContent?.posts.researchReport && (
                                    <PostCard title="Research Report" icon={<BookOpenIcon />}>
                                        <h4 className="text-xl font-bold mb-2 text-white">{generatedContent.posts.researchReport.title}</h4>
                                        <div className="prose prose-invert max-w-none mb-6" dangerouslySetInnerHTML={{ __html: generatedContent.posts.researchReport.report.replace(/\n/g, '<br/>') }} />
                                        <h5 className="font-bold text-slate-300 mt-6 mb-2 border-t border-slate-700 pt-4">Sources</h5>
                                        <ul className="list-disc list-inside space-y-2">
                                            {generatedContent.posts.researchReport.sources.map((source, i) =>(
                                                <li key={i}>
                                                    <a href={source.uri} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">{source.title}</a>
                                                </li>
                                            ))}
                                        </ul>
                                    </PostCard>
                                )}
                            </div>

                             {/* Sidebar Column */}
                            <div className="lg:col-span-2 space-y-6 lg:sticky top-24 self-start">
                                {/* Image Generation Card */}
                                <div className="bg-slate-800/50 p-6 rounded-lg shadow-lg border border-slate-700">
                                    <h3 className="text-lg font-bold text-white mb-4">Generated Image</h3>
                                    <div className="aspect-video bg-slate-700/50 rounded-md flex items-center justify-center overflow-hidden border border-slate-600">
                                        {isRegeneratingImage ? (
                                            <LoadingSpinner />
                                        ) : generatedContent?.images.length > 0 ? (
                                            <img
                                                src={`data:image/jpeg;base64,${generatedContent.images[selectedImageIndex]}`}
                                                alt={generatedContent.posts.imagePrompt}
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <ImagePlaceholderIcon />
                                        )}
                                    </div>
                                    {generatedContent?.images.length > 0 && (
                                        <a 
                                            href={`data:image/jpeg;base64,${generatedContent.images[selectedImageIndex]}`} 
                                            download={`${activeTopic.replace(/\s+/g, '_')}_image.jpg`}
                                            className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold rounded-md transition-colors bg-green-600 hover:bg-green-700 text-white"
                                        >
                                            <DownloadIcon /> Download Image
                                        </a>
                                    )}

                                    <div className="mt-4">
                                        <label className="text-sm font-medium text-slate-300">Image Prompt</label>
                                        <div className="mt-1 relative">
                                            <textarea
                                                value={editedPrompt}
                                                onChange={(e) => {
                                                    setEditedPrompt(e.target.value);
                                                    if (!isEditingPrompt) setIsEditingPrompt(true);
                                                }}
                                                className="w-full bg-slate-700 border border-slate-600 rounded-md p-2 text-sm text-slate-300 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                rows={4}
                                            />
                                            <CopyButton text={editedPrompt}/>
                                        </div>
                                    </div>

                                    {/* Advanced Image Options */}
                                    <details className="mt-4">
                                        <summary className="cursor-pointer text-sm font-semibold text-slate-400 hover:text-white">Advanced Options</summary>
                                        <div className="grid grid-cols-2 gap-4 mt-2">
                                            <div>
                                                <label htmlFor="style" className="text-xs text-slate-400 block mb-1">Artistic Style</label>
                                                <select id="style" value={artisticStyle} onChange={e => setArtisticStyle(e.target.value)} className="w-full bg-slate-700 text-sm p-2 rounded-md border border-slate-600 focus:outline-none focus:ring-1 focus:ring-blue-500">
                                                    <option>Default</option>
                                                    <option>Photorealistic</option>
                                                    <option>Minimalist</option>
                                                    <option>Impressionistic</option>
                                                    <option>Abstract</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label htmlFor="palette" className="text-xs text-slate-400 block mb-1">Color Palette</label>
                                                <select id="palette" value={colorPalette} onChange={e => setColorPalette(e.target.value)} className="w-full bg-slate-700 text-sm p-2 rounded-md border border-slate-600 focus:outline-none focus:ring-1 focus:ring-blue-500">
                                                    <option>Default</option>
                                                    <option>Vibrant</option>
                                                    <option>Monochromatic</option>
                                                    <option>Pastel</option>
                                                    <option>Earthy</option>
                                                </select>
                                            </div>
                                              <div>
                                                <label htmlFor="composition" className="text-xs text-slate-400 block mb-1">Composition</label>
                                                <select id="composition" value={composition} onChange={e => setComposition(e.target.value)} className="w-full bg-slate-700 text-sm p-2 rounded-md border border-slate-600 focus:outline-none focus:ring-1 focus:ring-blue-500">
                                                    <option>Default</option>
                                                    <option>Centered</option>
                                                    <option>Rule of thirds</option>
                                                    <option>Wide shot</option>
                                                    <option>Close-up</option>
                                                </select>
                                            </div>
                                             <div>
                                                <label htmlFor="mood" className="text-xs text-slate-400 block mb-1">Mood</label>
                                                <select id="mood" value={mood} onChange={e => setMood(e.target.value)} className="w-full bg-slate-700 text-sm p-2 rounded-md border border-slate-600 focus:outline-none focus:ring-1 focus:ring-blue-500">
                                                    <option>Default</option>
                                                    <option>Optimistic</option>
                                                    <option>Dramatic</option>
                                                    <option>Calm</option>
                                                    <option>Energetic</option>
                                                </select>
                                            </div>
                                            <div className="col-span-2">
                                                <label htmlFor="aspectRatio" className="text-xs text-slate-400 block mb-1">Aspect Ratio</label>
                                                <select id="aspectRatio" value={aspectRatio} onChange={e => setAspectRatio(e.target.value)} className="w-full bg-slate-700 text-sm p-2 rounded-md border border-slate-600 focus:outline-none focus:ring-1 focus:ring-blue-500">
                                                    <option>16:9</option>
                                                    <option>1:1</option>
                                                    <option>9:16</option>
                                                    <option>4:3</option>
                                                    <option>3:4</option>
                                                </select>
                                            </div>
                                        </div>
                                    </details>
                                    
                                    <button
                                        onClick={handleRegenerateImage}
                                        disabled={isRegeneratingImage}
                                        className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold rounded-md transition-colors bg-slate-600 hover:bg-slate-500 text-white disabled:bg-slate-700 disabled:cursor-not-allowed"
                                    >
                                        {isRegeneratingImage ? <LoadingSpinner /> : <RegenerateIcon />}
                                        Regenerate Image
                                    </button>
                                </div>
                                {/* On-demand Content Card */}
                                <div className="bg-slate-800/50 p-6 rounded-lg shadow-lg border border-slate-700">
                                    <h3 className="text-lg font-bold text-white mb-4">More Content Ideas</h3>
                                    <div className="space-y-3">
                                        <OnDemandButton 
                                            isGenerating={isGeneratingPodcast}
                                            onClick={handleGeneratePodcast}
                                            generatedContent={generatedContent?.posts.podcastScript}
                                            icon={<MicrophoneIcon />}
                                            label="Podcast Script"
                                        />
                                        <OnDemandButton 
                                            isGenerating={isGeneratingBlog}
                                            onClick={() => handleGenerateOnDemand('blog')}
                                            generatedContent={generatedContent?.posts.blogArticle}
                                            icon={<DocumentTextIcon />}
                                            label="Blog Article"
                                        />
                                        <OnDemandButton 
                                            isGenerating={isGeneratingPoll}
                                            onClick={() => handleGenerateOnDemand('poll')}
                                            generatedContent={generatedContent?.posts.linkedinPoll}
                                            icon={<ChartBarIcon />}
                                            label="LinkedIn Poll"
                                        />
                                         <OnDemandButton 
                                            isGenerating={isGeneratingCarousel}
                                            onClick={() => handleGenerateOnDemand('carousel')}
                                            generatedContent={generatedContent?.posts.carouselPresentation}
                                            icon={<CollectionIcon />}
                                            label="Carousel"
                                        />
                                         <OnDemandButton 
                                            isGenerating={isGeneratingReport}
                                            onClick={() => handleGenerateOnDemand('report')}
                                            generatedContent={generatedContent?.posts.researchReport}
                                            icon={<BookOpenIcon />}
                                            label="Research Report"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </main>
            
            <Chatbot />
            <SavedPostsModal isOpen={isSavedPostsModalOpen} onClose={() => setIsSavedPostsModalOpen(false)} savedPosts={savedPosts} onDelete={handleDeleteSaved} onLoad={handleLoadSaved} />
            <ScheduledPostsModal isOpen={isScheduledPostsModalOpen} onClose={() => setIsScheduledPostsModalOpen(false)} scheduledPosts={scheduledPosts} onUnschedule={handleUnschedule} />

            <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title={`Edit ${editingPost?.type.charAt(0).toUpperCase() + editingPost?.type.slice(1) || ''}`}>
                {editingPost && (
                    <EditForm 
                        contentState={editingPost}
                        onSave={handleSaveEditedPost}
                        onCancel={() => setIsEditModalOpen(false)}
                    />
                )}
            </Modal>
            
             <Modal isOpen={!!schedulingPost} onClose={() => setSchedulingPost(null)} title={`Schedule ${schedulingPost === 'linkedin' ? 'LinkedIn' : 'X'} Post`}>
                <div>
                    <label htmlFor="schedule-datetime" className="block text-sm font-medium text-slate-300 mb-2">
                        Select date and time
                    </label>
                    <input
                        type="datetime-local"
                        id="schedule-datetime"
                        value={scheduleDateTime}
                        onChange={(e) => setScheduleDateTime(e.target.value)}
                        className="w-full bg-slate-700 border border-slate-600 rounded-md p-2 text-white"
                        min={new Date().toISOString().slice(0, 16)}
                    />
                    <div className="mt-6 flex justify-end gap-3">
                        <button onClick={() => setSchedulingPost(null)} className="py-2 px-4 bg-slate-600 hover:bg-slate-500 rounded-md font-semibold">Cancel</button>
                        <button 
                            onClick={handleSchedulePost}
                            disabled={!scheduleDateTime}
                            className="py-2 px-4 bg-blue-600 hover:bg-blue-700 rounded-md font-semibold disabled:bg-slate-500 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                             {scheduleSuccess ? <><CheckIcon /> Scheduled!</> : 'Confirm Schedule'}
                        </button>
                    </div>
                </div>
            </Modal>

        </div>
    );
};

const EditForm: React.FC<{ contentState: EditingState; onSave: (newContent: any) => void; onCancel: () => void; }> = ({ contentState, onSave, onCancel }) => {
    const [editedContent, setEditedContent] = useState(contentState.content);

    const handleFieldChange = (field: string, value: string | string[]) => {
        setEditedContent({ ...editedContent, [field]: value });
    };

    const handleSlideChange = (index: number, field: 'title' | 'content', value: string) => {
        const newSlides = [...editedContent.slides];
        newSlides[index] = { ...newSlides[index], [field]: value };
        setEditedContent({ ...editedContent, slides: newSlides });
    };

    const renderFormFields = () => {
        switch (contentState.type) {
            case 'linkedin':
                return (
                    <>
                        <label className="block text-sm font-medium text-slate-300 mb-2">Title</label>
                        <input type="text" value={editedContent.title} onChange={e => handleFieldChange('title', e.target.value)} className="w-full bg-slate-700 border border-slate-600 rounded-md p-2 mb-4" />
                        <label className="block text-sm font-medium text-slate-300 mb-2">Body</label>
                        <RichTextEditor initialContent={editedContent.body} onContentChange={html => handleFieldChange('body', html)} />
                        <label className="block text-sm font-medium text-slate-300 mt-4 mb-2">Hashtags (comma-separated)</label>
                        <input type="text" value={editedContent.hashtags.join(', ')} onChange={e => handleFieldChange('hashtags', e.target.value.split(',').map(s => s.trim()))} className="w-full bg-slate-700 border border-slate-600 rounded-md p-2" />
                    </>
                );
            case 'x':
                 return (
                    <>
                        <label className="block text-sm font-medium text-slate-300 mb-2">Body</label>
                        <textarea value={editedContent.body} onChange={e => handleFieldChange('body', e.target.value)} className="w-full bg-slate-700 border border-slate-600 rounded-md p-2 mb-4" rows={6}/>
                        <label className="block text-sm font-medium text-slate-300 mb-2">Hashtags (comma-separated)</label>
                        <input type="text" value={editedContent.hashtags.join(', ')} onChange={e => handleFieldChange('hashtags', e.target.value.split(',').map(s => s.trim()))} className="w-full bg-slate-700 border border-slate-600 rounded-md p-2" />
                    </>
                );
            case 'podcast':
            case 'blog':
                 return (
                    <>
                        <label className="block text-sm font-medium text-slate-300 mb-2">Title</label>
                        <input type="text" value={editedContent.title} onChange={e => handleFieldChange('title', e.target.value)} className="w-full bg-slate-700 border border-slate-600 rounded-md p-2 mb-4" />
                        <label className="block text-sm font-medium text-slate-300 mb-2">{contentState.type === 'podcast' ? 'Script' : 'Body'}</label>
                        <RichTextEditor initialContent={contentState.type === 'podcast' ? editedContent.script : editedContent.body} onContentChange={html => handleFieldChange(contentState.type === 'podcast' ? 'script' : 'body', html)} />
                    </>
                );
            case 'poll':
                return (
                    <>
                        <label className="block text-sm font-medium text-slate-300 mb-2">Question</label>
                        <textarea value={editedContent.question} onChange={e => handleFieldChange('question', e.target.value)} className="w-full bg-slate-700 border border-slate-600 rounded-md p-2 mb-4" rows={3}/>
                        <label className="block text-sm font-medium text-slate-300 mb-2">Options</label>
                        {editedContent.options.map((option: string, index: number) => (
                             <input 
                                key={index} 
                                type="text" 
                                value={option} 
                                onChange={e => {
                                    const newOptions = [...editedContent.options];
                                    newOptions[index] = e.target.value;
                                    handleFieldChange('options', newOptions);
                                }} 
                                className="w-full bg-slate-700 border border-slate-600 rounded-md p-2 mb-2" 
                            />
                        ))}
                    </>
                );
            case 'carousel':
                 return (
                     <>
                        <label className="block text-sm font-medium text-slate-300 mb-2">Main Title</label>
                        <input type="text" value={editedContent.title} onChange={e => handleFieldChange('title', e.target.value)} className="w-full bg-slate-700 border border-slate-600 rounded-md p-2 mb-6" />
                        {editedContent.slides.map((slide: { title: string, content: string }, index: number) => (
                            <div key={index} className="bg-slate-700/50 p-4 rounded-lg mb-4 border border-slate-600">
                                <label className="block text-sm font-bold text-slate-300 mb-2">Slide {index + 1}</label>
                                <label className="block text-xs font-medium text-slate-400 mb-1">Slide Title</label>
                                <input type="text" value={slide.title} onChange={e => handleSlideChange(index, 'title', e.target.value)} className="w-full bg-slate-600 border border-slate-500 rounded-md p-2 mb-2" />
                                <label className="block text-xs font-medium text-slate-400 mb-1">Slide Content</label>
                                <textarea value={slide.content} onChange={e => handleSlideChange(index, 'content', e.target.value)} className="w-full bg-slate-600 border border-slate-500 rounded-md p-2" rows={3}/>
                            </div>
                        ))}
                    </>
                );
            default:
                return <p>Editing for this content type is not supported.</p>;
        }
    };
    
    return (
        <div className="space-y-4">
            {renderFormFields()}
            <div className="mt-6 flex justify-end gap-3">
                <button onClick={onCancel} className="py-2 px-4 bg-slate-600 hover:bg-slate-500 rounded-md font-semibold">Cancel</button>
                <button onClick={() => onSave(editedContent)} className="py-2 px-4 bg-blue-600 hover:bg-blue-700 rounded-md font-semibold">Save Changes</button>
            </div>
        </div>
    );
};


export default App;
