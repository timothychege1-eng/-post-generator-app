import React, { useState, useEffect, useMemo } from 'react';
import {
    generateSocialPosts,
    generatePostIdeas,
    generateWeeklySchedule,
    regenerateImages,
    generatePodcastAudio,
} from './services/geminiService';
import { GeneratedPosts, ScheduleItem, SavedContent, ScheduledPost, LinkedInPoll, CarouselPresentation, PodcastScript } from './types';
import {
    SparklesIcon, LinkedInIcon, XIcon, CalendarIcon, LightbulbIcon, ImagePlaceholderIcon, LoadingSpinner,
    CopyIcon, CheckIcon, ResetIcon, RegenerateIcon, EditIcon, SaveIcon, BookOpenIcon, ClockIcon,
    DocumentTextIcon, ChartBarIcon, CollectionIcon, PlusCircleIcon, TrashIcon, MicrophoneIcon, DownloadIcon,
} from './components/icons';
import Chatbot from './components/Chatbot';
import Modal from './components/Modal';
import RichTextEditor from './components/RichTextEditor';
import SavedPostsModal from './components/SavedPostsModal';
import ScheduledPostsModal from './components/ScheduledPostsModal';

const CopyButton: React.FC<{ text: string }> = ({ text }) => {
    const [copied, setCopied] = useState(false);
    const handleCopy = () => {
        navigator.clipboard.writeText(text).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
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

type EditContentType = 'linkedin' | 'x' | 'blog' | 'report' | 'poll' | 'carousel' | 'podcast';

interface EditingState {
    type: EditContentType;
    content: any; // This will hold the specific content object being edited
}

const App: React.FC = () => {
    const [topic, setTopic] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [generatedContent, setGeneratedContent] = useState<{
        posts: GeneratedPosts;
        images: string[];
    } | null>(null);
    const [ideas, setIdeas] = useState<string[]>([]);
    const [schedule, setSchedule] = useState<ScheduleItem[]>([]);
    const [selectedImageIndex, setSelectedImageIndex] = useState(0);
    const [isRegeneratingImage, setIsRegeneratingImage] = useState(false);
    const [isEditingPrompt, setIsEditingPrompt] = useState(false);
    const [editedPrompt, setEditedPrompt] = useState('');
    const [carouselSlideIndex, setCarouselSlideIndex] = useState(0);

    const [artisticStyle, setArtisticStyle] = useState('Default');
    const [colorPalette, setColorPalette] = useState('Default');
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

    // Podcast State
    const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const [audioError, setAudioError] = useState<string | null>(null);


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

    const hasResults = generatedContent || ideas.length > 0 || schedule.length > 0;

    const formatPostContent = (postsResult: { posts: GeneratedPosts; images: string[] }) => {
        const convertToHtml = (text: string) => text.split('\n').filter(p => p.trim()).map(p => `<p>${p}</p>`).join('');
        const { posts } = postsResult;
        return {
            ...postsResult,
            posts: {
                ...posts,
                linkedinPost: { ...posts.linkedinPost, body: convertToHtml(posts.linkedinPost.body) },
                xPost: { ...posts.xPost, body: convertToHtml(posts.xPost.body) },
                blogArticle: { ...posts.blogArticle, body: convertToHtml(posts.blogArticle.body) },
                researchReport: { ...posts.researchReport, body: convertToHtml(posts.researchReport.body) },
                podcastScript: { ...posts.podcastScript, script: convertToHtml(posts.podcastScript.script) },
            }
        };
    };

    const handleGenerateAll = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!topic.trim()) {
            setError('Please enter a topic to generate content.');
            return;
        }
        handleReset(); // Reset all states before generating new content
        setIsLoading(true);
        setTopic(topic);
        try {
            const [postsResult, ideasResult, scheduleResult] = await Promise.all([
                generateSocialPosts(topic, artisticStyle, colorPalette, aspectRatio),
                generatePostIdeas(topic),
                generateWeeklySchedule(topic),
            ]);
            setGeneratedContent(formatPostContent(postsResult));
            setIdeas(ideasResult);
            setSchedule(scheduleResult);
        } catch (err) {
            console.error("Generation failed:", err);
            setError(err instanceof Error ? err.message : 'An unexpected error occurred during content generation.');
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleGeneratePostsOnly = async (selectedTopic: string) => {
        if (!selectedTopic.trim() || isLoading) return;

        window.scrollTo({ top: 0, behavior: 'smooth' });
        handleReset(); // Reset all states before generating new content
        setIsLoading(true);
        setTopic(selectedTopic);

        try {
            const postsResult = await generateSocialPosts(selectedTopic, artisticStyle, colorPalette, aspectRatio);
            setGeneratedContent(formatPostContent(postsResult));
        } catch (err) {
            console.error("Generation failed for selected topic:", err);
            setError(err instanceof Error ? err.message : 'An unexpected error occurred during content generation.');
        } finally {
            setIsLoading(false);
        }
    };

    const constructEnhancedPrompt = (basePrompt: string) => {
        let enhancedPrompt = basePrompt;
        if (artisticStyle !== 'Default') {
            enhancedPrompt += `, in a ${artisticStyle.toLowerCase()} style`;
        }
        if (colorPalette !== 'Default') {
            enhancedPrompt += `, with a ${colorPalette.toLowerCase().replace(' ', '-')} color palette`;
        }
        return enhancedPrompt;
    };
    
    const handleRegenerateImages = async () => {
        if (!generatedContent || isRegeneratingImage) return;

        setIsRegeneratingImage(true);
        setError(null);
        try {
            const finalPrompt = constructEnhancedPrompt(generatedContent.posts.imagePrompt);
            const newImages = await regenerateImages(finalPrompt, aspectRatio);
            setGeneratedContent(prev => prev ? { ...prev, images: newImages } : null);
            setSelectedImageIndex(0);
        } catch (err) {
            console.error("Image regeneration failed:", err);
            setError(err instanceof Error ? err.message : 'An unexpected error occurred during image regeneration.');
        } finally {
            setIsRegeneratingImage(false);
        }
    };

    const handleUpdatePromptAndRegenerate = async () => {
        if (!generatedContent || isRegeneratingImage || !editedPrompt.trim()) {
            if (!editedPrompt.trim()) setError("Prompt cannot be empty.");
            return;
        }

        setIsRegeneratingImage(true);
        setError(null);
        try {
            const finalPrompt = constructEnhancedPrompt(editedPrompt);
            const newImages = await regenerateImages(finalPrompt, aspectRatio);
            setGeneratedContent(prev => {
                if (!prev) return null;
                return {
                    ...prev,
                    images: newImages,
                    posts: {
                        ...prev.posts,
                        imagePrompt: editedPrompt,
                    }
                };
            });
            setSelectedImageIndex(0);
            setIsEditingPrompt(false);
        } catch (err)
 {
            console.error("Image regeneration with new prompt failed:", err);
            setError(err instanceof Error ? err.message : 'An unexpected error occurred during image regeneration.');
        } finally {
            setIsRegeneratingImage(false);
        }
    };

    const handleReset = () => {
        setTopic('');
        setIsLoading(false);
        setError(null);
        setGeneratedContent(null);
        setSelectedImageIndex(0);
        setIdeas([]);
        setSchedule([]);
        setIsEditingPrompt(false);
        setEditedPrompt('');
        setSchedulingPost(null);
        setCarouselSlideIndex(0);
        if (audioUrl) {
            URL.revokeObjectURL(audioUrl);
        }
        setAudioUrl(null);
        setAudioError(null);
        setIsGeneratingAudio(false);
    };

    const handleOpenEditModal = (type: EditContentType) => {
        if (!generatedContent) return;
        let contentToEdit;
        switch(type) {
            case 'linkedin': contentToEdit = generatedContent.posts.linkedinPost; break;
            case 'x': contentToEdit = generatedContent.posts.xPost; break;
            case 'blog': contentToEdit = generatedContent.posts.blogArticle; break;
            case 'report': contentToEdit = generatedContent.posts.researchReport; break;
            case 'poll': contentToEdit = generatedContent.posts.linkedinPoll; break;
            case 'carousel': contentToEdit = generatedContent.posts.carouselPresentation; break;
            case 'podcast': contentToEdit = generatedContent.posts.podcastScript; break;
            default: return;
        }
        setEditingPost({ type, content: JSON.parse(JSON.stringify(contentToEdit)) }); // Deep copy
        setIsEditModalOpen(true);
    };

    const handleCloseEditModal = () => {
        setIsEditModalOpen(false);
        setEditingPost(null);
    };

    const handleSaveEdit = () => {
        if (!editingPost || !generatedContent) return;
        
        setGeneratedContent(prev => {
            if (!prev) return null;
            const newPosts = { ...prev.posts };
            switch(editingPost.type) {
                case 'linkedin': newPosts.linkedinPost = editingPost.content; break;
                case 'x': newPosts.xPost = editingPost.content; break;
                case 'blog': newPosts.blogArticle = editingPost.content; break;
                case 'report': newPosts.researchReport = editingPost.content; break;
                case 'poll': newPosts.linkedinPoll = editingPost.content; break;
                case 'carousel': newPosts.carouselPresentation = editingPost.content; break;
                case 'podcast': 
                    newPosts.podcastScript = editingPost.content;
                    // If script is edited, invalidate the old audio
                    if (audioUrl) URL.revokeObjectURL(audioUrl);
                    setAudioUrl(null);
                    setAudioError(null);
                    break;
            }
            return { ...prev, posts: newPosts };
        });

        handleCloseEditModal();
    };

    const handleSaveCurrentContent = () => {
        if (!generatedContent) return;

        const newSave: SavedContent = {
            id: crypto.randomUUID(),
            savedAt: new Date().toISOString(),
            topic: topic,
            posts: generatedContent.posts,
        };

        const updatedSavedPosts = [newSave, ...savedPosts];
        setSavedPosts(updatedSavedPosts);
        localStorage.setItem('viralPostGeneratorSaved', JSON.stringify(updatedSavedPosts));

        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
    };

    const handleDeletePost = (idToDelete: string) => {
        const updatedSavedPosts = savedPosts.filter(p => p.id !== idToDelete);
        setSavedPosts(updatedSavedPosts);
        localStorage.setItem('viralPostGeneratorSaved', JSON.stringify(updatedSavedPosts));
    };

    const handleLoadPost = (contentToLoad: SavedContent) => {
        handleReset();
        setTopic(contentToLoad.topic);
        setGeneratedContent(formatPostContent({
            posts: contentToLoad.posts,
            images: [], // Images are not saved, require regeneration
        }));
        setIsSavedPostsModalOpen(false);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const convertHtmlToPlainTextForCopy = (html: string) => {
        const tempDiv = document.createElement('div');
        const htmlWithBreaks = html.replace(/<\/p>/g, '</p>\n').replace(/<br\s*\/?>/gi, '\n');
        tempDiv.innerHTML = htmlWithBreaks;
        return tempDiv.innerText.trim();
    };

    const handleScheduleClick = (platform: 'linkedin' | 'x') => {
        if (schedulingPost === platform) {
            setSchedulingPost(null); // Toggle off if already open
        } else {
            setSchedulingPost(platform);
            const now = new Date();
            now.setHours(now.getHours() + 1);
            now.setMinutes(0);
            now.setSeconds(0);
            const isoString = now.toISOString().slice(0, 16);
            setScheduleDateTime(isoString);
        }
    };

    const handleConfirmSchedule = () => {
        if (!schedulingPost || !generatedContent || !scheduleDateTime) return;
        
        const contentToSchedule = schedulingPost === 'linkedin'
            ? generatedContent.posts.linkedinPost
            : generatedContent.posts.xPost;

        const newScheduledPost: ScheduledPost = {
            id: crypto.randomUUID(),
            platform: schedulingPost === 'linkedin' ? 'LinkedIn' : 'X',
            scheduledAt: new Date(scheduleDateTime).toISOString(),
            content: contentToSchedule,
            topic: topic,
        };

        const updatedSchedule = [...scheduledPosts, newScheduledPost].sort((a,b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());
        setScheduledPosts(updatedSchedule);
        localStorage.setItem('viralPostGeneratorScheduled', JSON.stringify(updatedSchedule));
        
        setSchedulingPost(null);
        setScheduleDateTime('');
        setScheduleSuccess(true);
        setTimeout(() => setScheduleSuccess(false), 3000);
    };
    
    const handleUnschedule = (id: string) => {
        const updatedSchedule = scheduledPosts.filter(p => p.id !== id);
        setScheduledPosts(updatedSchedule);
        localStorage.setItem('viralPostGeneratorScheduled', JSON.stringify(updatedSchedule));
    };

    const handleGenerateAudio = async () => {
        if (!generatedContent || isGeneratingAudio) return;
        
        setIsGeneratingAudio(true);
        setAudioError(null);
        if (audioUrl) URL.revokeObjectURL(audioUrl);
        setAudioUrl(null);

        try {
            const audioBlob = await generatePodcastAudio(generatedContent.posts.podcastScript.script);
            const url = URL.createObjectURL(audioBlob);
            setAudioUrl(url);
        } catch (err) {
            console.error("Audio generation failed:", err);
            setAudioError(err instanceof Error ? err.message : 'An unexpected error occurred during audio generation.');
        } finally {
            setIsGeneratingAudio(false);
        }
    };

    const scheduledLinkedInPost = useMemo(() => {
        if(!generatedContent) return null;
        return scheduledPosts.find(p => 
            p.platform === 'LinkedIn' && 
            p.topic === topic &&
            (p.content as any).title === generatedContent.posts.linkedinPost.title
        ) || null;
    }, [scheduledPosts, generatedContent, topic]);

    const scheduledXPost = useMemo(() => {
        if(!generatedContent) return null;
        return scheduledPosts.find(p => 
            p.platform === 'X' &&
            p.topic === topic &&
            p.content.body === generatedContent.posts.xPost.body
        ) || null;
    }, [scheduledPosts, generatedContent, topic]);

    const getModalTitle = () => {
        if (!editingPost) return '';
        switch (editingPost.type) {
            case 'linkedin': return 'Edit LinkedIn Post';
            case 'x': return 'Edit X Post';
            case 'blog': return 'Edit Blog Article';
            case 'report': return 'Edit Research Report';
            case 'poll': return 'Edit LinkedIn Poll';
            case 'carousel': return 'Edit Carousel Presentation';
            case 'podcast': return 'Edit Podcast Script';
            default: return 'Edit Content';
        }
    };

    const renderEditModalContent = () => {
        if (!editingPost) return null;

        const { type, content } = editingPost;

        const updateContent = (newContent: any) => {
            setEditingPost(prev => prev ? { ...prev, content: newContent } : null);
        };
        
        const updateField = (field: string, value: any) => {
            updateContent({ ...content, [field]: value });
        };

        switch (type) {
            case 'linkedin':
            case 'blog':
            case 'report':
            case 'podcast':
                const bodyLabel = type === 'podcast' ? 'Script' : 'Body';
                return (
                    <div className="space-y-4">
                        <div>
                            <label htmlFor="post-title" className="block text-sm font-medium text-slate-300 mb-1">Title</label>
                            <input
                                id="post-title" type="text" value={content.title}
                                onChange={(e) => updateField('title', e.target.value)}
                                className="w-full bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1">{bodyLabel}</label>
                            <RichTextEditor
                                initialContent={type === 'podcast' ? content.script : content.body}
                                onContentChange={(html) => updateField(type === 'podcast' ? 'script' : 'body', html)}
                            />
                        </div>
                    </div>
                );
            case 'x':
                 return (
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">Body</label>
                        <RichTextEditor
                            initialContent={content.body}
                            onContentChange={(html) => updateField('body', html)}
                        />
                    </div>
                );
            case 'poll':
                const poll = content as LinkedInPoll;
                const handleOptionChange = (index: number, value: string) => {
                    const newOptions = [...poll.options];
                    newOptions[index] = value;
                    updateField('options', newOptions);
                };
                const addOption = () => updateField('options', [...poll.options, '']);
                const removeOption = (index: number) => updateField('options', poll.options.filter((_, i) => i !== index));

                return (
                    <div className="space-y-4">
                         <div>
                            <label htmlFor="poll-question" className="block text-sm font-medium text-slate-300 mb-1">Question</label>
                            <input
                                id="poll-question" type="text" value={poll.question}
                                onChange={(e) => updateField('question', e.target.value)}
                                className="w-full bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1">Options</label>
                            <div className="space-y-2">
                            {poll.options.map((option, index) => (
                                <div key={index} className="flex items-center gap-2">
                                    <input
                                        type="text" value={option}
                                        onChange={(e) => handleOptionChange(index, e.target.value)}
                                        className="w-full bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                                    />
                                    <button onClick={() => removeOption(index)} className="p-2 text-red-400 hover:text-red-300 hover:bg-red-900/50 rounded-full"><TrashIcon /></button>
                                </div>
                            ))}
                            </div>
                             <button onClick={addOption} className="mt-3 flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300"><PlusCircleIcon/> Add Option</button>
                        </div>
                    </div>
                );
            case 'carousel':
                const carousel = content as CarouselPresentation;
                const handleSlideChange = (index: number, field: 'title' | 'body', value: string) => {
                    const newSlides = [...carousel.slides];
                    newSlides[index] = { ...newSlides[index], [field]: value };
                    updateField('slides', newSlides);
                };
                return (
                     <div className="space-y-6">
                         <div>
                            <label htmlFor="carousel-title" className="block text-sm font-medium text-slate-300 mb-1">Main Title</label>
                            <input
                                id="carousel-title" type="text" value={carousel.title}
                                onChange={(e) => updateField('title', e.target.value)}
                                className="w-full bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                            />
                        </div>
                        <div className="space-y-4">
                            {carousel.slides.map((slide, index) => (
                                <div key={index} className="p-3 bg-slate-900/50 border border-slate-700 rounded-lg">
                                    <label className="block text-sm font-bold text-slate-300 mb-2">Slide {index + 1}</label>
                                    <div className="space-y-2">
                                         <input
                                            type="text" placeholder="Slide Title" value={slide.title}
                                            onChange={(e) => handleSlideChange(index, 'title', e.target.value)}
                                            className="w-full bg-slate-700 border border-slate-600 rounded-md px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                                        />
                                        <textarea
                                            placeholder="Slide Body" value={slide.body}
                                            onChange={(e) => handleSlideChange(index, 'body', e.target.value)}
                                            rows={3}
                                            className="w-full bg-slate-700 border border-slate-600 rounded-md px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                );

            default: return null;
        }
    };


    return (
        <div className="bg-slate-900 text-white min-h-screen font-sans">
            <main className="container mx-auto px-4 py-8 md:py-16">
                <header className="text-center mb-12">
                     <div className="flex justify-center items-center gap-4 mb-4">
                        <h1 className="text-4xl md:text-5xl font-extrabold bg-gradient-to-r from-blue-500 to-purple-500 text-transparent bg-clip-text">
                            Viral Post Generator AI
                        </h1>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setIsScheduledPostsModalOpen(true)}
                                className="bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-semibold py-2 px-4 rounded-full flex items-center gap-2 transition-colors relative"
                                aria-label="View scheduled posts"
                            >
                                <ClockIcon />
                                <span>Scheduled</span>
                                {scheduledPosts.length > 0 && <span className="absolute -top-1 -right-1 bg-purple-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">{scheduledPosts.length}</span>}
                            </button>
                            <button
                                onClick={() => setIsSavedPostsModalOpen(true)}
                                className="bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-semibold py-2 px-4 rounded-full flex items-center gap-2 transition-colors relative"
                                aria-label="View saved posts"
                            >
                                <BookOpenIcon />
                                <span>Saved</span>
                                {savedPosts.length > 0 && <span className="absolute -top-1 -right-1 bg-blue-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">{savedPosts.length}</span>}
                            </button>
                        </div>
                    </div>
                    <p className="text-lg text-slate-400">
                        Craft compelling social media content, generate ideas, and plan your week with AI.
                    </p>
                </header>

                <form onSubmit={handleGenerateAll} className="max-w-3xl mx-auto mb-12">
                    <div className="flex flex-col sm:flex-row gap-3">
                        <input
                            type="text"
                            value={topic}
                            onChange={(e) => setTopic(e.target.value)}
                            placeholder="Enter your content topic... (e.g., 'The future of AI in Africa')"
                            className="flex-grow bg-slate-800 border border-slate-700 rounded-md px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                            disabled={isLoading}
                        />
                        <button
                            type="submit"
                            className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-md flex items-center justify-center transition-colors"
                            disabled={isLoading || !topic.trim()}
                        >
                            {isLoading ? (
                                <>
                                    <LoadingSpinner />
                                    <span>Generating...</span>
                                </>
                            ) : (
                                <>
                                    <SparklesIcon />
                                    <span className="ml-2 whitespace-nowrap">Generate Content</span>
                                </>
                            )}
                        </button>
                        <button
                            type="button"
                            onClick={handleReset}
                            className="bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed text-slate-300 hover:text-white p-3 rounded-md flex items-center justify-center transition-colors"
                            disabled={isLoading || (!hasResults && !topic.trim())}
                            aria-label="Reset form and results"
                        >
                            <ResetIcon />
                        </button>
                    </div>
                    {error && <p className="text-red-400 mt-4 text-center">{error}</p>}
                </form>

                {isLoading && !hasResults && (
                    <div className="text-center text-slate-400">
                        <p>AI is warming up... Please wait a moment.</p>
                    </div>
                )}
                
                {generatedContent && (
                    <div className="text-center mb-8">
                        <button
                            onClick={handleSaveCurrentContent}
                            className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-5 rounded-full flex items-center gap-2 transition-colors mx-auto"
                        >
                            <SaveIcon />
                            Save This Result
                        </button>
                    </div>
                 )}
                
                {hasResults && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fade-in">
                        {/* Generated Posts Column */}
                        <div className="lg:col-span-2 space-y-8">
                            {generatedContent && (
                                <>
                                    {/* Podcast */}
                                    <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl shadow-lg relative p-6">
                                        <div className="flex justify-between items-center mb-4">
                                            <h2 className="text-2xl font-bold flex items-center"><MicrophoneIcon/><span className="ml-2">Podcast Episode</span></h2>
                                            <button onClick={() => handleOpenEditModal('podcast')} className="flex items-center gap-2 text-sm text-slate-300 hover:text-white bg-slate-700 hover:bg-slate-600 px-3 py-1.5 rounded-md transition-colors"><EditIcon/> Edit Script</button>
                                        </div>
                                        <CopyButton text={`Podcast Title: ${generatedContent.posts.podcastScript.title}\n\n${convertHtmlToPlainTextForCopy(generatedContent.posts.podcastScript.script)}`} />
                                        <h3 className="font-semibold text-xl text-purple-400">{generatedContent.posts.podcastScript.title}</h3>
                                        
                                        <div className="my-4">
                                            {audioError && <p className="text-red-400 text-sm mb-2">{audioError}</p>}
                                            {isGeneratingAudio ? (
                                                <div className="flex items-center justify-center gap-2 text-slate-300 bg-slate-700/50 p-4 rounded-lg">
                                                    <LoadingSpinner />
                                                    <span>Generating audio... This may take a moment.</span>
                                                </div>
                                            ) : audioUrl ? (
                                                <div className="flex flex-col sm:flex-row items-center gap-4 bg-slate-700/50 p-3 rounded-lg">
                                                    <audio controls src={audioUrl} className="w-full sm:w-auto sm:flex-grow">Your browser does not support the audio element.</audio>
                                                    <a href={audioUrl} download={`${generatedContent.posts.podcastScript.title.replace(/ /g, '_')}.mp3`} className="flex-shrink-0 w-full sm:w-auto flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-md transition-colors">
                                                        <DownloadIcon/> Download MP3
                                                    </a>
                                                </div>
                                            ) : (
                                                <button onClick={handleGenerateAudio} disabled={isGeneratingAudio} className="w-full flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 disabled:bg-slate-600 text-white font-bold py-3 px-4 rounded-md transition-colors">
                                                    <MicrophoneIcon/> Generate Audio
                                                </button>
                                            )}
                                        </div>

                                        <div className="text-slate-300 my-4 prose prose-invert max-w-none max-h-60 overflow-y-auto p-2 border border-slate-700 rounded-md" dangerouslySetInnerHTML={{__html: generatedContent.posts.podcastScript.script }} />
                                    </div>
                                    
                                    {/* LinkedIn Post */}
                                    <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl shadow-lg relative p-6">
                                        <div className="flex justify-between items-center mb-4">
                                            <h2 className="text-2xl font-bold flex items-center"><LinkedInIcon/><span className="ml-2">LinkedIn Post</span></h2>
                                            <div className="flex items-center gap-2">
                                                {scheduledLinkedInPost ? (
                                                    <div className="flex items-center gap-2 text-sm text-purple-300">
                                                        <ClockIcon />
                                                        <span>Scheduled</span>
                                                        <button onClick={() => handleUnschedule(scheduledLinkedInPost.id)} className="text-xs text-slate-400 hover:text-white">(Unschedule)</button>
                                                    </div>
                                                ) : (
                                                    <button onClick={() => handleScheduleClick('linkedin')} className="flex items-center gap-2 text-sm text-slate-300 hover:text-white bg-slate-700 hover:bg-slate-600 px-3 py-1.5 rounded-md transition-colors"><ClockIcon/> Schedule</button>
                                                )}
                                                <button onClick={() => handleOpenEditModal('linkedin')} className="flex items-center gap-2 text-sm text-slate-300 hover:text-white bg-slate-700 hover:bg-slate-600 px-3 py-1.5 rounded-md transition-colors"><EditIcon/> Edit</button>
                                            </div>
                                        </div>
                                        {schedulingPost === 'linkedin' && (
                                            <div className="my-4 p-4 bg-slate-700/50 rounded-lg animate-fade-in">
                                                <label htmlFor="linkedin-schedule" className="block text-sm font-semibold text-slate-300 mb-2">Schedule Date and Time</label>
                                                <div className="flex items-center gap-2">
                                                    <input 
                                                        type="datetime-local" 
                                                        id="linkedin-schedule"
                                                        value={scheduleDateTime}
                                                        onChange={(e) => setScheduleDateTime(e.target.value)}
                                                        className="w-full bg-slate-900 border border-slate-600 rounded-md px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                                                    />
                                                    <button onClick={handleConfirmSchedule} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-3 rounded-md transition-colors">Confirm</button>
                                                    <button onClick={() => setSchedulingPost(null)} className="bg-slate-600 hover:bg-slate-500 text-white font-semibold py-2 px-3 rounded-md transition-colors">Cancel</button>
                                                </div>
                                            </div>
                                        )}
                                        {scheduledLinkedInPost && (
                                            <div className="mb-4 text-center text-sm p-2 bg-purple-900/50 border border-purple-700 rounded-md text-purple-300">
                                                Scheduled for: {new Date(scheduledLinkedInPost.scheduledAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                                            </div>
                                        )}
                                        <CopyButton text={`Title: ${generatedContent.posts.linkedinPost.title}\n\n${convertHtmlToPlainTextForCopy(generatedContent.posts.linkedinPost.body)}\n\nHashtags: ${generatedContent.posts.linkedinPost.hashtags.map(h => `#${h}`).join(' ')}`} />
                                        <h3 className="font-semibold text-lg text-blue-400">{generatedContent.posts.linkedinPost.title}</h3>
                                        <div className="text-slate-300 my-4 prose prose-invert max-w-none" dangerouslySetInnerHTML={{__html: generatedContent.posts.linkedinPost.body }} />
                                        <div className="flex flex-wrap gap-2">
                                            {generatedContent.posts.linkedinPost.hashtags.map((tag, i) => <span key={i} className="bg-slate-700 text-slate-300 px-2 py-1 rounded-full text-sm">#{tag}</span>)}
                                        </div>
                                    </div>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl shadow-lg relative p-6">
                                            <div className="flex justify-between items-center mb-4">
                                                <h2 className="text-2xl font-bold flex items-center"><XIcon/><span className="ml-2">X Post</span></h2>
                                                <div className="flex items-center gap-2">
                                                    {scheduledXPost ? (
                                                        <div className="flex items-center gap-2 text-sm text-purple-300">
                                                            <ClockIcon />
                                                            <span>Scheduled</span>
                                                            <button onClick={() => handleUnschedule(scheduledXPost.id)} className="text-xs text-slate-400 hover:text-white">(Unschedule)</button>
                                                        </div>
                                                    ) : (
                                                       <button onClick={() => handleScheduleClick('x')} className="flex items-center gap-2 text-sm text-slate-300 hover:text-white bg-slate-700 hover:bg-slate-600 px-3 py-1.5 rounded-md transition-colors"><ClockIcon/> Schedule</button>
                                                    )}
                                                    <button onClick={() => handleOpenEditModal('x')} className="flex items-center gap-2 text-sm text-slate-300 hover:text-white bg-slate-700 hover:bg-slate-600 px-3 py-1.5 rounded-md transition-colors"><EditIcon/> Edit</button>
                                                </div>
                                            </div>
                                            {schedulingPost === 'x' && (
                                                <div className="my-4 p-4 bg-slate-700/50 rounded-lg animate-fade-in">
                                                    <label htmlFor="x-schedule" className="block text-sm font-semibold text-slate-300 mb-2">Schedule Date and Time</label>
                                                    <div className="flex items-center gap-2">
                                                        <input 
                                                            type="datetime-local" 
                                                            id="x-schedule"
                                                            value={scheduleDateTime}
                                                            onChange={(e) => setScheduleDateTime(e.target.value)}
                                                            className="w-full bg-slate-900 border border-slate-600 rounded-md px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                                                        />
                                                        <button onClick={handleConfirmSchedule} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-3 rounded-md transition-colors">Confirm</button>
                                                        <button onClick={() => setSchedulingPost(null)} className="bg-slate-600 hover:bg-slate-500 text-white font-semibold py-2 px-3 rounded-md transition-colors">Cancel</button>
                                                    </div>
                                                </div>
                                            )}
                                            {scheduledXPost && (
                                                <div className="mb-4 text-center text-sm p-2 bg-purple-900/50 border border-purple-700 rounded-md text-purple-300">
                                                    Scheduled for: {new Date(scheduledXPost.scheduledAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                                                </div>
                                            )}
                                            <CopyButton text={`${convertHtmlToPlainTextForCopy(generatedContent.posts.xPost.body)}\n\n${generatedContent.posts.xPost.hashtags.map(h => `#${h}`).join(' ')}`} />
                                            <div className="text-slate-300 mb-4 prose prose-invert max-w-none" dangerouslySetInnerHTML={{__html: generatedContent.posts.xPost.body }} />
                                            <div className="flex flex-wrap gap-2">
                                                {generatedContent.posts.xPost.hashtags.map((tag, i) => <span key={i} className="bg-slate-700 text-slate-300 px-2 py-1 rounded-full text-sm">#{tag}</span>)}
                                            </div>
                                        </div>
                                        
                                        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl shadow-lg relative p-6">
                                            <div className="flex justify-between items-center mb-4">
                                                <h2 className="text-2xl font-bold flex items-center"><ChartBarIcon/><span className="ml-2">LinkedIn Poll</span></h2>
                                                <button onClick={() => handleOpenEditModal('poll')} className="flex items-center gap-2 text-sm text-slate-300 hover:text-white bg-slate-700 hover:bg-slate-600 px-3 py-1.5 rounded-md transition-colors"><EditIcon/> Edit</button>
                                            </div>
                                            <CopyButton text={`Poll Question: ${generatedContent.posts.linkedinPoll.question}\n\nOptions:\n${generatedContent.posts.linkedinPoll.options.map(o => `- ${o}`).join('\n')}`} />
                                            <p className="font-semibold text-lg text-slate-200 mb-4">{generatedContent.posts.linkedinPoll.question}</p>
                                            <div className="space-y-2">
                                                {generatedContent.posts.linkedinPoll.options.map((option, i) => (
                                                    <div key={i} className="bg-slate-700/50 text-slate-300 px-4 py-2 rounded-md text-sm border border-slate-700">{option}</div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl shadow-lg relative p-6">
                                        <div className="flex justify-between items-center mb-4">
                                            <h2 className="text-2xl font-bold flex items-center"><CollectionIcon/><span className="ml-2">Carousel Presentation</span></h2>
                                            <button onClick={() => handleOpenEditModal('carousel')} className="flex items-center gap-2 text-sm text-slate-300 hover:text-white bg-slate-700 hover:bg-slate-600 px-3 py-1.5 rounded-md transition-colors"><EditIcon/> Edit</button>
                                        </div>
                                        <CopyButton text={`Carousel: ${generatedContent.posts.carouselPresentation.title}\n\n${generatedContent.posts.carouselPresentation.slides.map((s, i) => `Slide ${i + 1}/${generatedContent.posts.carouselPresentation.slides.length}: ${s.title}\n${s.body}`).join('\n\n---\n\n')}`} />
                                        <h3 className="font-semibold text-lg text-purple-400 mb-4">{generatedContent.posts.carouselPresentation.title}</h3>
                                        <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700 min-h-[150px] flex flex-col justify-center">
                                            <p className="font-bold text-md text-slate-200">{generatedContent.posts.carouselPresentation.slides[carouselSlideIndex].title}</p>
                                            <p className="text-slate-300 mt-1 text-sm">{generatedContent.posts.carouselPresentation.slides[carouselSlideIndex].body}</p>
                                        </div>
                                        <div className="flex items-center justify-center gap-4 mt-4">
                                            <button onClick={() => setCarouselSlideIndex(prev => (prev - 1 + 5) % 5)} className="text-sm bg-slate-700 hover:bg-slate-600 px-4 py-1 rounded-md transition">Prev</button>
                                            <span className="text-sm text-slate-400">Slide {carouselSlideIndex + 1} / 5</span>
                                            <button onClick={() => setCarouselSlideIndex(prev => (prev + 1) % 5)} className="text-sm bg-slate-700 hover:bg-slate-600 px-4 py-1 rounded-md transition">Next</button>
                                        </div>
                                    </div>
                                    
                                    <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl shadow-lg relative p-6">
                                        <div className="flex justify-between items-center mb-4">
                                            <h2 className="text-2xl font-bold flex items-center"><DocumentTextIcon/><span className="ml-2">Blog Article</span></h2>
                                            <button onClick={() => handleOpenEditModal('blog')} className="flex items-center gap-2 text-sm text-slate-300 hover:text-white bg-slate-700 hover:bg-slate-600 px-3 py-1.5 rounded-md transition-colors"><EditIcon/> Edit</button>
                                        </div>
                                        <CopyButton text={`Title: ${generatedContent.posts.blogArticle.title}\n\n${convertHtmlToPlainTextForCopy(generatedContent.posts.blogArticle.body)}`} />
                                        <h3 className="font-semibold text-xl text-blue-400">{generatedContent.posts.blogArticle.title}</h3>
                                        <div className="text-slate-300 my-4 prose prose-invert max-w-none" dangerouslySetInnerHTML={{__html: generatedContent.posts.blogArticle.body }} />
                                    </div>
                                    
                                    <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl shadow-lg relative p-6">
                                        <div className="flex justify-between items-center mb-4">
                                            <h2 className="text-2xl font-bold flex items-center"><DocumentTextIcon/><span className="ml-2">Research Report</span></h2>
                                            <button onClick={() => handleOpenEditModal('report')} className="flex items-center gap-2 text-sm text-slate-300 hover:text-white bg-slate-700 hover:bg-slate-600 px-3 py-1.5 rounded-md transition-colors"><EditIcon/> Edit</button>
                                        </div>
                                        <CopyButton text={`Title: ${generatedContent.posts.researchReport.title}\n\n${convertHtmlToPlainTextForCopy(generatedContent.posts.researchReport.body)}`} />
                                        <h3 className="font-semibold text-xl text-green-400">{generatedContent.posts.researchReport.title}</h3>
                                        <div className="text-slate-300 my-4 prose prose-invert max-w-none" dangerouslySetInnerHTML={{__html: generatedContent.posts.researchReport.body }} />
                                    </div>
                                </>
                            )}
                             {ideas.length > 0 && (
                                 <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl shadow-lg p-6">
                                    <h2 className="text-2xl font-bold mb-4 flex items-center"><LightbulbIcon/><span className="ml-2">Post Ideas</span></h2>
                                    <ul className="space-y-3 text-slate-300">
                                        {ideas.map((idea, i) => (
                                            <li key={i} className="group flex items-center gap-2">
                                                <button
                                                    onClick={() => handleGeneratePostsOnly(idea)}
                                                    disabled={isLoading}
                                                    className="w-full text-left p-2 rounded-md hover:bg-slate-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-start disabled:cursor-not-allowed disabled:opacity-50"
                                                >
                                                    <span className="text-blue-400 mr-2 mt-1">&#8227;</span>
                                                    <span>{idea}</span>
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                            
                            {schedule.length > 0 && (
                                <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl shadow-lg p-6">
                                    <h2 className="text-2xl font-bold mb-4 flex items-center"><CalendarIcon/><span className="ml-2">Weekly Schedule</span></h2>
                                    <div className="space-y-4">
                                        {schedule.map((item, i) => (
                                             <div 
                                                key={i} 
                                                className="group p-3 bg-slate-700/50 rounded-lg transition-all duration-300 ease-in-out relative"
                                            >
                                                <div
                                                    onClick={() => !isLoading && handleGeneratePostsOnly(item.topic)}
                                                    role="button"
                                                    tabIndex={isLoading ? -1 : 0}
                                                    onKeyDown={(e) => { if (!isLoading && (e.key === 'Enter' || e.key === ' ')) handleGeneratePostsOnly(item.topic); }}
                                                    aria-label={`Generate post for topic: ${item.topic}`}
                                                    aria-disabled={isLoading}
                                                    className={` ${ isLoading ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
                                                >
                                                    <div className="font-bold text-md flex justify-between items-center">
                                                        <span>{item.day} - {item.time}</span>
                                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${item.platform === 'LinkedIn' ? 'bg-blue-200 text-blue-800' : 'bg-slate-600 text-slate-100'}`}>
                                                            {item.platform === 'LinkedIn' ? <LinkedInIcon/> : <XIcon/>}
                                                            <span className="ml-1.5">{item.platform}</span>
                                                        </span>
                                                    </div>
                                                    <p className="text-slate-300 mt-1">{item.topic}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                        
                        <div className="space-y-8">
                             {generatedContent && (
                                <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl shadow-lg p-6 flex flex-col sticky top-8">
                                    <div className="flex justify-between items-center mb-2">
                                        <h2 className="text-xl font-bold">Generated Image</h2>
                                        <button
                                            onClick={handleRegenerateImages}
                                            disabled={isRegeneratingImage || isLoading || isEditingPrompt}
                                            className="flex items-center gap-2 text-sm text-slate-300 hover:text-white bg-slate-700 hover:bg-slate-600 px-3 py-1.5 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {isRegeneratingImage ? <LoadingSpinner /> : <RegenerateIcon />}
                                            {isRegeneratingImage ? 'Generating...' : 'Regenerate'}
                                        </button>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                                        <div>
                                            <label htmlFor="artistic-style" className="block text-sm font-medium text-slate-300 mb-1">Style</label>
                                            <select id="artistic-style" value={artisticStyle} onChange={e => setArtisticStyle(e.target.value)} disabled={isLoading || isRegeneratingImage} className="w-full bg-slate-700 border border-slate-600 rounded-md p-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition disabled:opacity-50">
                                                <option>Default</option>
                                                <option>Photorealistic</option>
                                                <option>Digital Art</option>
                                                <option>Minimalist</option>
                                                <option>Cartoonish</option>
                                                <option>Abstract</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label htmlFor="color-palette" className="block text-sm font-medium text-slate-300 mb-1">Color Palette</label>
                                            <select id="color-palette" value={colorPalette} onChange={e => setColorPalette(e.target.value)} disabled={isLoading || isRegeneratingImage} className="w-full bg-slate-700 border border-slate-600 rounded-md p-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition disabled:opacity-50">
                                                <option>Default</option>
                                                <option>Vibrant</option>
                                                <option>Muted</option>
                                                <option>Monochrome</option>
                                                <option>Pastel</option>
                                                <option>Warm Tones</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label htmlFor="aspect-ratio" className="block text-sm font-medium text-slate-300 mb-1">Aspect Ratio</label>
                                            <select id="aspect-ratio" value={aspectRatio} onChange={e => setAspectRatio(e.target.value)} disabled={isLoading || isRegeneratingImage} className="w-full bg-slate-700 border border-slate-600 rounded-md p-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition disabled:opacity-50">
                                                <option value="16:9">16:9 (Landscape)</option>
                                                <option value="9:16">9:16 (Portrait)</option>
                                                <option value="1:1">1:1 (Square)</option>
                                                <option value="4:3">4:3 (Standard)</option>
                                                <option value="3:4">3:4 (Tall)</option>
                                            </select>
                                        </div>
                                    </div>
                                    
                                    <div className="mb-4">
                                        {isEditingPrompt ? (
                                            <div>
                                                <label htmlFor="prompt-editor" className="block text-sm font-medium text-slate-300 mb-1">Edit Image Prompt</label>
                                                <textarea
                                                    id="prompt-editor"
                                                    value={editedPrompt}
                                                    onChange={(e) => setEditedPrompt(e.target.value)}
                                                    className="w-full bg-slate-700 border border-slate-600 rounded-md p-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                                                    rows={4}
                                                    disabled={isRegeneratingImage}
                                                />
                                                <div className="flex justify-end gap-2 mt-2">
                                                    <button onClick={() => setIsEditingPrompt(false)} disabled={isRegeneratingImage} className="text-sm bg-slate-600 hover:bg-slate-500 text-white font-semibold py-1 px-3 rounded-md transition-colors disabled:opacity-50">Cancel</button>
                                                    <button onClick={handleUpdatePromptAndRegenerate} disabled={isRegeneratingImage || !editedPrompt.trim()} className="text-sm bg-blue-600 hover:bg-blue-700 text-white font-semibold py-1 px-3 rounded-md transition-colors flex items-center gap-2 disabled:bg-slate-600">
                                                        {isRegeneratingImage ? <LoadingSpinner/> : null}
                                                        Update & Regenerate
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex items-start justify-between gap-2 group">
                                                <p className="text-sm text-slate-400 bg-slate-900/50 p-2 rounded-md flex-grow break-words">
                                                    <strong className="text-slate-300">Prompt:</strong> {generatedContent.posts.imagePrompt}
                                                </p>
                                                <button
                                                    onClick={() => {
                                                        setIsEditingPrompt(true);
                                                        setEditedPrompt(generatedContent.posts.imagePrompt);
                                                    }}
                                                    disabled={isRegeneratingImage || isLoading}
                                                    className="p-2 text-slate-400 hover:text-white bg-slate-700/50 group-hover:bg-slate-700 rounded-md transition-colors flex-shrink-0 disabled:opacity-50"
                                                    aria-label="Edit image prompt"
                                                >
                                                    <EditIcon />
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    <div className="relative aspect-video w-full bg-slate-700 rounded-lg mb-4">
                                        {generatedContent.images && generatedContent.images.length > 0 ? (
                                            <>
                                                <img 
                                                    src={`data:image/jpeg;base64,${generatedContent.images[selectedImageIndex]}`} 
                                                    alt={generatedContent.posts.imagePrompt} 
                                                    className="rounded-lg object-cover w-full h-full" 
                                                />
                                                {isRegeneratingImage && (
                                                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center rounded-lg transition-opacity">
                                                        <div className="text-center">
                                                            <LoadingSpinner />
                                                            <p className="mt-2 text-sm">Generating new images...</p>
                                                        </div>
                                                    </div>
                                                )}
                                            </>
                                        ) : <div className="flex justify-center items-center w-full h-full text-slate-400 text-center p-4">
                                                <div>
                                                    <ImagePlaceholderIcon />
                                                    <p className="text-sm mt-2">Images not loaded. <br /> Use the 'Regenerate' button.</p>
                                                </div>
                                            </div>}
                                    </div>
                                    <div className="grid grid-cols-3 gap-2">
                                        {generatedContent.images.map((img, index) => (
                                            <button 
                                                key={index}
                                                onClick={() => setSelectedImageIndex(index)}
                                                disabled={isRegeneratingImage}
                                                className={`aspect-video rounded-md overflow-hidden focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-blue-500 transition-all ${selectedImageIndex === index ? 'ring-2 ring-blue-500' : 'ring-1 ring-transparent hover:ring-slate-500'}`}
                                                aria-label={`Select image ${index + 1}`}
                                            >
                                                <img 
                                                    src={`data:image/jpeg;base64,${img}`} 
                                                    alt={`Alternative image ${index + 1}`} 
                                                    className="w-full h-full object-cover"
                                                />
                                            </button>
                                        ))}
                                    </div>
                                </div>
                             )}
                        </div>
                    </div>
                )}
            </main>

            <Chatbot />

            {saveSuccess && (
                <div className="fixed top-5 right-5 bg-green-500 text-white py-2 px-4 rounded-lg shadow-lg animate-fade-in-out z-50 flex items-center gap-2">
                    <CheckIcon />
                    <span>Result saved successfully!</span>
                </div>
            )}

            {scheduleSuccess && (
                <div className="fixed top-5 right-5 bg-purple-500 text-white py-2 px-4 rounded-lg shadow-lg animate-fade-in-out z-50 flex items-center gap-2">
                    <CheckIcon />
                    <span>Post scheduled successfully!</span>
                </div>
            )}

            <Modal
                isOpen={isEditModalOpen}
                onClose={handleCloseEditModal}
                title={getModalTitle()}
            >
                {editingPost && (
                    <>
                        {renderEditModalContent()}
                        <div className="flex justify-end gap-3 pt-4 mt-4 border-t border-slate-700">
                            <button onClick={handleCloseEditModal} className="bg-slate-600 hover:bg-slate-500 text-white font-semibold py-2 px-4 rounded-md transition-colors">Cancel</button>
                            <button onClick={handleSaveEdit} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md transition-colors">Save Changes</button>
                        </div>
                    </>
                )}
            </Modal>

            <SavedPostsModal 
                isOpen={isSavedPostsModalOpen}
                onClose={() => setIsSavedPostsModalOpen(false)}
                savedPosts={savedPosts}
                onLoad={handleLoadPost}
                onDelete={handleDeletePost}
            />
            
            <ScheduledPostsModal
                isOpen={isScheduledPostsModalOpen}
                onClose={() => setIsScheduledPostsModalOpen(false)}
                scheduledPosts={scheduledPosts}
                onUnschedule={handleUnschedule}
            />
            
            <style>{`
                @keyframes fade-in {
                    from { opacity: 0; transform: translateY(1rem); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @keyframes fade-in-out {
                    0% { opacity: 0; transform: translateY(-20px); }
                    15% { opacity: 1; transform: translateY(0); }
                    85% { opacity: 1; transform: translateY(0); }
                    100% { opacity: 0; transform: translateY(-20px); }
                }
                .animate-fade-in {
                    animation: fade-in 0.5s ease-out forwards;
                }
                .animate-fade-in-out {
                    animation: fade-in-out 3s ease-in-out forwards;
                }
                /* Fix for datetime-local icon color in dark mode */
                input[type="datetime-local"]::-webkit-calendar-picker-indicator {
                    filter: invert(0.8);
                }
                .prose {
                    color: #d1d5db; /* text-slate-300 */
                }
                .prose p {
                    margin-top: 1em;
                    margin-bottom: 1em;
                }
                .prose ul, .prose ol {
                    margin-top: 1.25em;
                    margin-bottom: 1.25em;
                    padding-left: 1.625em;
                }
                .prose li p {
                    margin-top: 0.5em;
                    margin-bottom: 0.5em;
                }
                .prose strong {
                    color: #fff;
                    font-weight: 600;
                }
                .prose em {
                    color: #fff;
                }
            `}</style>
        </div>
    );
};

export default App;