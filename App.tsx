

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
} from './services/geminiService';
import { GeneratedPosts, SavedContent, ScheduledPost, TopicSuggestion } from './types';
import {
    SparklesIcon, LinkedInIcon, XIcon, ImagePlaceholderIcon, LoadingSpinner,
    CopyIcon, CheckIcon, ResetIcon, RegenerateIcon, EditIcon, SaveIcon, BookOpenIcon, ClockIcon,
    PlusCircleIcon, TrashIcon, MicrophoneIcon, DownloadIcon, DocumentTextIcon, ChartBarIcon, CollectionIcon,
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
            let inUl = false;
            let inOl = false;
    
            for (const line of lines) {
                const trimmedLine = line.trim();
                const isOlItem = /^\d+\.\s/.test(trimmedLine);
                const isUlItem = trimmedLine.startsWith('* ') || trimmedLine.startsWith('- ');
                
                if (inUl && !isUlItem) { html += '</ul>'; inUl = false; }
                if (inOl && !isOlItem) { html += '</ol>'; inOl = false; }

                if (isUlItem) {
                    if (!inUl) { html += '<ul>'; inUl = true; }
                    html += `<li>${trimmedLine.substring(2)}</li>`;
                } else if (isOlItem) {
                    if (!inOl) { html += '<ol>'; inOl = true; }
                    html += `<li>${trimmedLine.replace(/^\d+\.\s/, '')}</li>`;
                } else {
                    if (trimmedLine) {
                        html += `<p>${trimmedLine}</p>`;
                    }
                }
            }
    
            if (inUl) html += '</ul>';
            if (inOl) html += '</ol>';
            
            return html;
        };

        const formattedPosts: GeneratedPosts = {
            ...({} as GeneratedPosts), // Base empty object
            ...posts,
        };
        
        if (posts.linkedinPost) formattedPosts.linkedinPost = { ...posts.linkedinPost, body: convertToHtml(posts.linkedinPost.body) };
        if (posts.xPost) formattedPosts.xPost = { ...posts.xPost, body: convertToHtml(posts.xPost.body) };
        if (posts.podcastScript) formattedPosts.podcastScript = { ...posts.podcastScript, script: convertToHtml(posts.podcastScript.script) };
        if (posts.blogArticle) formattedPosts.blogArticle = { ...posts.blogArticle, body: convertToHtml(posts.blogArticle.body) };
        if (posts.researchReport) formattedPosts.researchReport = { ...posts.researchReport, report: convertToHtml(posts.researchReport.report) };
        if (posts.carouselPresentation) {
            formattedPosts.carouselPresentation = { 
                ...posts.carouselPresentation, 
                slides: posts.carouselPresentation.slides.map(slide => ({ ...slide, content: convertToHtml(slide.content) }))
            };
        }
    
        return formattedPosts;
    };

    const handleGeneratePrimaryContent = async (e: React.FormEvent) => {
        e.preventDefault();
        const currentTopic = topic.trim();
        if (!currentTopic) {
            setError('Please enter a topic to generate content.');
            return;
        }
        handleReset();
        setIsLoading(true);
        setActiveTopic(currentTopic);
        try {
            const postsResult = await generateCorePosts(currentTopic);
            setGeneratedContent({ 
                posts: formatPostContent(postsResult),
                images: [] // Start with no images
            });
        } catch (err) {
            console.error("Generation failed:", err);
            setError(err instanceof Error ? err.message : 'An unexpected error occurred during content generation.');
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleSuggestTopics = async (e: React.FormEvent) => {
        e.preventDefault();
        const currentTopic = topic.trim();
        if (!currentTopic) {
            setError('Please enter a topic to get suggestions.');
            return;
        }
        setIsSuggesting(true);
        setError(null);
        setTopicSuggestions(null);
        setGeneratedContent(null);
        try {
            const result = await generateTopicSuggestions(currentTopic);
            setTopicSuggestions(result);
        } catch (err) {
            console.error("Suggestion generation failed:", err);
            setError(err instanceof Error ? err.message : 'An unexpected error occurred during suggestion generation.');
        } finally {
            setIsSuggesting(false);
        }
    };

    const handleSuggestionClick = (suggestionTopic: string) => {
        setTopic(suggestionTopic);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const createOnDemandHandler = <T,>(
        generator: (topic: string) => Promise<T>,
        stateSetter: React.Dispatch<React.SetStateAction<boolean>>,
        contentKey: keyof GeneratedPosts,
        typeName: string
    ) => async () => {
        if (!activeTopic) return;
        stateSetter(true);
        setError(null);
        try {
            const result = await generator(activeTopic);
            setGeneratedContent(prev => {
                if (!prev) return null;
                const updatedContent = { [contentKey]: result };
                const formattedContent = formatPostContent(updatedContent);
                return {
                    ...prev,
                    posts: { ...prev.posts, [contentKey]: formattedContent[contentKey] },
                };
            });
        } catch (err) {
            console.error(`Failed to generate ${typeName}:`, err);
            setError(err instanceof Error ? err.message : `Failed to generate ${typeName}.`);
        } finally {
            stateSetter(false);
        }
    };

    const handleGeneratePodcast = createOnDemandHandler(generatePodcastScript, setIsGeneratingPodcast, 'podcastScript', 'Podcast Script');
    const handleGenerateBlog = createOnDemandHandler(generateBlogArticle, setIsGeneratingBlog, 'blogArticle', 'Blog Article');
    const handleGeneratePoll = createOnDemandHandler(generateLinkedInPoll, setIsGeneratingPoll, 'linkedinPoll', 'LinkedIn Poll');
    const handleGenerateCarousel = createOnDemandHandler(generateCarousel, setIsGeneratingCarousel, 'carouselPresentation', 'Carousel');
    const handleGenerateReport = createOnDemandHandler(generateResearchReport, setIsGeneratingReport, 'researchReport', 'Research Report');

    const handleGenerateImages = async () => {
        if (!generatedContent || isRegeneratingImage) return;

        const promptToUse = isEditingPrompt && editedPrompt.trim() ? editedPrompt.trim() : generatedContent.posts.imagePrompt;
        if (!promptToUse) {
            setError("Image prompt is missing.");
            return;
        }

        setIsRegeneratingImage(true);
        setError(null);
        try {
            const newImages = await generateImages(promptToUse, artisticStyle, colorPalette, composition, mood, aspectRatio);
            
            setGeneratedContent(prev => {
                if (!prev) return null;
                const updatedPosts = isEditingPrompt ? { ...prev.posts, imagePrompt: promptToUse } : prev.posts;
                return {
                    posts: updatedPosts,
                    images: newImages,
                };
            });
            setSelectedImageIndex(0);
            if (isEditingPrompt) setIsEditingPrompt(false);
        } catch (err) {
            console.error("Image generation failed:", err);
            let errorMessage = 'An unexpected error occurred during image generation.';
            if (err instanceof Error) {
                // Check for specific keywords related to quota exhaustion
                if (err.message.includes('quota') || err.message.includes('RESOURCE_EXHAUSTED')) {
                    errorMessage = "Image generation failed: You've exceeded your API quota. Please check your plan and billing details in your Google AI Studio account.";
                } else {
                    errorMessage = err.message;
                }
            }
            setError(errorMessage);
        } finally {
            setIsRegeneratingImage(false);
        }
    };

    const handleReset = () => {
        setTopic('');
        setActiveTopic('');
        setIsLoading(false);
        setError(null);
        setGeneratedContent(null);
        setTopicSuggestions(null);
        setSelectedImageIndex(0);
        setIsEditingPrompt(false);
        setEditedPrompt('');
        setSchedulingPost(null);
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
            case 'podcast': contentToEdit = generatedContent.posts.podcastScript; break;
            case 'blog': contentToEdit = generatedContent.posts.blogArticle; break;
            case 'poll': contentToEdit = generatedContent.posts.linkedinPoll; break;
            case 'carousel': contentToEdit = generatedContent.posts.carouselPresentation; break;
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
                case 'podcast': 
                    newPosts.podcastScript = editingPost.content;
                    // If script is edited, invalidate the old audio
                    if (audioUrl) URL.revokeObjectURL(audioUrl);
                    setAudioUrl(null);
                    setAudioError(null);
                    break;
                case 'blog': newPosts.blogArticle = editingPost.content; break;
                case 'poll': newPosts.linkedinPoll = editingPost.content; break;
                case 'carousel': newPosts.carouselPresentation = editingPost.content; break;
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
            topic: activeTopic,
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
        setActiveTopic(contentToLoad.topic);
        setGeneratedContent({
            posts: formatPostContent(contentToLoad.posts),
            images: [], // Images are not saved, require regeneration
        });
        setIsSavedPostsModalOpen(false);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const convertHtmlToPlainTextForCopy = (html: string) => {
        const tempDiv = document.createElement('div');
        const htmlWithBreaks = html.replace(/<\/p>/g, '</p>\n').replace(/<br\s*\/?>/gi, '\n').replace(/<\/li>/g, '</li>\n').replace(/<\/ol>/g, '</ol>\n').replace(/<\/ul>/g, '</ul>\n');
        tempDiv.innerHTML = htmlWithBreaks;
        
        tempDiv.querySelectorAll('li').forEach((li, index) => {
            const parent = li.parentElement;
            if (parent?.tagName === 'OL') {
                li.textContent = `${index + 1}. ${li.textContent}`;
            } else {
                li.textContent = `* ${li.textContent}`;
            }
        });

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
            topic: activeTopic,
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
        if (!generatedContent?.posts.podcastScript || isGeneratingAudio) return;
        
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
            p.topic === activeTopic &&
            (p.content as any).title === generatedContent.posts.linkedinPost.title
        ) || null;
    }, [scheduledPosts, generatedContent, activeTopic]);

    const scheduledXPost = useMemo(() => {
        if(!generatedContent) return null;
        return scheduledPosts.find(p => 
            p.platform === 'X' &&
            p.topic === activeTopic &&
            p.content.body === generatedContent.posts.xPost.body
        ) || null;
    }, [scheduledPosts, generatedContent, activeTopic]);

    const getModalTitle = () => {
        if (!editingPost) return '';
        switch (editingPost.type) {
            case 'linkedin': return 'Edit LinkedIn Post';
            case 'x': return 'Edit X Post';
            case 'podcast': return 'Edit Podcast Script';
            case 'blog': return 'Edit Blog Article';
            case 'poll': return 'Edit LinkedIn Poll';
            case 'carousel': return 'Edit Carousel';
            default: return 'Edit Content';
        }
    };

    const renderEditModalContent = () => {
        if (!editingPost) return null;

        const { type, content } = editingPost;
        
        const updateField = (field: string, value: any) => {
            setEditingPost(prev => prev ? { ...prev, content: { ...prev.content, [field]: value } } : null);
        };

        switch (type) {
            case 'linkedin':
            case 'podcast':
            case 'blog':
                const bodyLabel = type === 'podcast' ? 'Script' : 'Body';
                const bodyContent = type === 'podcast' ? content.script : content.body;
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
                                initialContent={bodyContent}
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
                return (
                    <div className="space-y-4">
                        <div>
                            <label htmlFor="poll-question" className="block text-sm font-medium text-slate-300 mb-1">Question</label>
                            <input
                                id="poll-question" type="text" value={content.question}
                                onChange={(e) => updateField('question', e.target.value)}
                                className="w-full bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1">Options</label>
                            {content.options.map((option: string, index: number) => (
                                <input
                                    key={index} type="text" value={option}
                                    onChange={(e) => {
                                        const newOptions = [...content.options];
                                        newOptions[index] = e.target.value;
                                        updateField('options', newOptions);
                                    }}
                                    className="w-full bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition mt-2"
                                />
                            ))}
                        </div>
                    </div>
                );
             case 'carousel':
                return (
                    <div className="space-y-4">
                        <div>
                            <label htmlFor="carousel-title" className="block text-sm font-medium text-slate-300 mb-1">Title</label>
                            <input
                                id="carousel-title" type="text" value={content.title}
                                onChange={(e) => updateField('title', e.target.value)}
                                className="w-full bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-sm"
                            />
                        </div>
                        {content.slides.map((slide: any, index: number) => (
                            <div key={index} className="p-3 border border-slate-700 rounded-md">
                                <label className="block text-sm font-medium text-slate-300 mb-1">Slide {index + 1} Title</label>
                                <input
                                    type="text" value={slide.title}
                                    onChange={(e) => {
                                        const newSlides = [...content.slides];
                                        newSlides[index].title = e.target.value;
                                        updateField('slides', newSlides);
                                    }}
                                    className="w-full bg-slate-900 border border-slate-600 rounded-md px-3 py-2 text-sm mb-2"
                                />
                                <label className="block text-sm font-medium text-slate-300 mb-1">Slide {index + 1} Content</label>
                                <textarea
                                    value={convertHtmlToPlainTextForCopy(slide.content)}
                                    onChange={(e) => {
                                        const newSlides = [...content.slides];
                                        newSlides[index].content = `<p>${e.target.value.replace(/\n/g, '</p><p>')}</p>`;
                                        updateField('slides', newSlides);
                                    }}
                                    className="w-full bg-slate-900 border border-slate-600 rounded-md px-3 py-2 text-sm"
                                    rows={3}
                                />
                            </div>
                        ))}
                    </div>
                );
            default: return null;
        }
    };


    return (
        <div className="bg-slate-900 text-white min-h-screen font-sans">
            <main className="container mx-auto px-4 py-8 md:py-16">
                <header className="text-center mb-12">
                    <h1 className="text-4xl md:text-5xl font-extrabold bg-gradient-to-r from-blue-500 to-purple-500 text-transparent bg-clip-text">
                        Kenya Data & AI Society Content Hub
                    </h1>
                    <p className="text-lg text-slate-400 mt-4 max-w-3xl mx-auto">
                        Welcome! Let's create inspiring content for our community, exploring data and AI through a Kenyan lens.
                    </p>
                    <div className="flex justify-center gap-4 mt-6">
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
                </header>

                <div className="max-w-4xl mx-auto mb-12">
                    <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl shadow-lg p-6">
                        <div className="flex flex-col md:flex-row gap-3">
                            <input
                                type="text"
                                value={topic}
                                onChange={(e) => setTopic(e.target.value)}
                                placeholder="Enter your content topic... (e.g., 'The future of AI in Africa')"
                                className="flex-grow bg-slate-800 border border-slate-700 rounded-md px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                                disabled={isLoading || isSuggesting}
                            />
                            <div className="flex gap-3">
                                <button
                                    onClick={handleGeneratePrimaryContent}
                                    className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-md flex items-center justify-center transition-colors"
                                    disabled={isLoading || isSuggesting || !topic.trim()}
                                >
                                    {isLoading ? <><LoadingSpinner /><span>Generating...</span></> : <><SparklesIcon /><span className="ml-2 whitespace-nowrap">Generate Content</span></>}
                                </button>
                                <button
                                    type="button"
                                    onClick={handleSuggestTopics}
                                    className="flex-1 bg-purple-600 hover:bg-purple-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-md flex items-center justify-center transition-colors"
                                    disabled={isSuggesting || isLoading || !topic.trim()}
                                >
                                    {isSuggesting ? <><LoadingSpinner /><span>Suggesting...</span></> : <><PlusCircleIcon /><span className="ml-2 whitespace-nowrap">Suggest Plan</span></>}
                                </button>
                                <button
                                    type="button"
                                    onClick={handleReset}
                                    className="bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed text-slate-300 hover:text-white p-3 rounded-md flex items-center justify-center transition-colors"
                                    disabled={isLoading || isSuggesting || (!hasResults && !topic.trim() && !topicSuggestions)}
                                    aria-label="Reset form and results"
                                >
                                    <ResetIcon />
                                </button>
                            </div>
                        </div>
                        {error && <p className="text-red-400 mt-4 text-center">{error}</p>}
                    </div>
                </div>

                {topicSuggestions && !isLoading && (
                    <div className="max-w-4xl mx-auto mb-12 animate-fade-in">
                        <h2 className="text-2xl font-bold text-center mb-6 text-slate-300">Weekly Content Suggestions</h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-7 gap-4">
                            {topicSuggestions.map((suggestion, index) => (
                                <div 
                                    key={index} 
                                    onClick={() => handleSuggestionClick(suggestion.topic)}
                                    className="p-4 bg-slate-800 rounded-lg border border-slate-700 hover:bg-slate-700/80 hover:border-blue-500 cursor-pointer transition-all transform hover:-translate-y-1"
                                >
                                    <p className="font-bold text-blue-400 text-sm mb-1">{suggestion.day}</p>
                                    <p className="text-slate-300 text-sm">{suggestion.topic}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}


                {isLoading && !generatedContent && (
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
                
                {(generatedContent || isLoading) && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fade-in">
                        {/* Generated Posts Column */}
                        <div className="lg:col-span-2 space-y-8">
                            {generatedContent && (
                                <>
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

                                    {/* On Demand Content Section */}
                                    <div className="space-y-4">
                                        <h2 className="text-2xl font-bold text-center text-slate-300">On-Demand Content Suite</h2>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                             {/* Podcast */}
                                            <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl shadow-lg p-6 flex flex-col min-h-[20rem]">
                                                <h3 className="text-xl font-bold flex items-center mb-4"><MicrophoneIcon/><span className="ml-2">Podcast Episode</span></h3>
                                                <div className="flex-grow flex flex-col justify-center">
                                                    {isGeneratingPodcast ? (
                                                        <div className="flex items-center justify-center gap-2 text-slate-300"><LoadingSpinner/><span>Writing script...</span></div>
                                                    ) : generatedContent.posts.podcastScript ? (
                                                         <>
                                                            <button onClick={() => handleOpenEditModal('podcast')} className="self-end flex items-center gap-2 text-xs text-slate-300 hover:text-white bg-slate-700 hover:bg-slate-600 px-2 py-1 rounded-md transition-colors mb-2"><EditIcon/> Edit Script</button>
                                                            <h4 className="font-semibold text-lg text-purple-400 truncate" title={generatedContent.posts.podcastScript.title}>{generatedContent.posts.podcastScript.title}</h4>
                                                            <div className="my-2 text-center">
                                                                {audioError && <p className="text-red-400 text-xs mb-2">{audioError}</p>}
                                                                {isGeneratingAudio ? (
                                                                    <div className="flex items-center justify-center gap-2 text-slate-300 text-sm"><LoadingSpinner/><span>Generating audio...</span></div>
                                                                ) : audioUrl ? (
                                                                    <div className="flex flex-col items-center gap-2">
                                                                        <audio controls src={audioUrl} className="w-full">Your browser does not support the audio element.</audio>
                                                                        <a href={audioUrl} download={`${generatedContent.posts.podcastScript.title.replace(/ /g, '_')}.mp3`} className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-3 rounded-md transition-colors text-sm">
                                                                            <DownloadIcon/> Download MP3
                                                                        </a>
                                                                    </div>
                                                                ) : (
                                                                    <button onClick={handleGenerateAudio} disabled={isGeneratingAudio} className="w-full flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 disabled:bg-slate-600 text-white font-bold py-2 px-3 rounded-md transition-colors">
                                                                        <MicrophoneIcon/> Generate Audio
                                                                    </button>
                                                                )}
                                                            </div>
                                                         </>
                                                    ) : (
                                                        <button onClick={handleGeneratePodcast} className="w-full bg-purple-600/50 hover:bg-purple-600 border border-purple-500 disabled:bg-slate-600 text-white font-bold py-3 px-4 rounded-md flex items-center justify-center transition-colors" disabled={isGeneratingPodcast}>
                                                            <SparklesIcon/><span className="ml-2">Generate Podcast</span>
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                            
                                            {/* Blog Article */}
                                            <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl shadow-lg p-6 flex flex-col min-h-[20rem]">
                                                <h3 className="text-xl font-bold flex items-center mb-4"><DocumentTextIcon/><span className="ml-2">Blog Article</span></h3>
                                                <div className="flex-grow flex flex-col justify-center">
                                                    {isGeneratingBlog ? (
                                                        <div className="flex items-center justify-center gap-2 text-slate-300"><LoadingSpinner/><span>Writing article...</span></div>
                                                    ) : generatedContent.posts.blogArticle ? (
                                                         <>
                                                            <button onClick={() => handleOpenEditModal('blog')} className="self-end flex items-center gap-2 text-xs text-slate-300 hover:text-white bg-slate-700 hover:bg-slate-600 px-2 py-1 rounded-md transition-colors mb-2"><EditIcon/> Edit</button>
                                                            <h4 className="font-semibold text-lg text-blue-400 truncate" title={generatedContent.posts.blogArticle.title}>{generatedContent.posts.blogArticle.title}</h4>
                                                            <div className="text-sm text-slate-400 my-2 prose prose-invert max-w-none max-h-40 overflow-y-auto p-1" dangerouslySetInnerHTML={{__html: generatedContent.posts.blogArticle.body}} />
                                                            <div className="flex flex-wrap gap-1 mt-auto">
                                                                {generatedContent.posts.blogArticle.hashtags.map((tag, i) => <span key={i} className="bg-slate-700 text-slate-300 px-2 py-0.5 rounded-full text-xs">#{tag}</span>)}
                                                            </div>
                                                         </>
                                                    ) : (
                                                        <button onClick={handleGenerateBlog} className="w-full bg-blue-600/50 hover:bg-blue-600 border border-blue-500 disabled:bg-slate-600 text-white font-bold py-3 px-4 rounded-md flex items-center justify-center transition-colors" disabled={isGeneratingBlog}>
                                                            <SparklesIcon/><span className="ml-2">Generate Article</span>
                                                        </button>
                                                    )}
                                                </div>
                                            </div>

                                             {/* LinkedIn Poll */}
                                            <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl shadow-lg p-6 flex flex-col min-h-[20rem]">
                                                <h3 className="text-xl font-bold flex items-center mb-4"><ChartBarIcon/><span className="ml-2">LinkedIn Poll</span></h3>
                                                <div className="flex-grow flex flex-col justify-center">
                                                    {isGeneratingPoll ? (
                                                        <div className="flex items-center justify-center gap-2 text-slate-300"><LoadingSpinner/><span>Creating poll...</span></div>
                                                    ) : generatedContent.posts.linkedinPoll ? (
                                                         <>
                                                            <button onClick={() => handleOpenEditModal('poll')} className="self-end flex items-center gap-2 text-xs text-slate-300 hover:text-white bg-slate-700 hover:bg-slate-600 px-2 py-1 rounded-md transition-colors mb-2"><EditIcon/> Edit</button>
                                                            <p className="font-semibold text-slate-300 mb-3">{generatedContent.posts.linkedinPoll.question}</p>
                                                            <div className="space-y-2">
                                                                {generatedContent.posts.linkedinPoll.options.map((opt, i) => (
                                                                    <div key={i} className="bg-slate-700/50 text-slate-300 text-sm p-3 rounded-md border border-slate-700">{opt}</div>
                                                                ))}
                                                            </div>
                                                         </>
                                                    ) : (
                                                        <button onClick={handleGeneratePoll} className="w-full bg-green-600/50 hover:bg-green-600 border border-green-500 disabled:bg-slate-600 text-white font-bold py-3 px-4 rounded-md flex items-center justify-center transition-colors" disabled={isGeneratingPoll}>
                                                            <SparklesIcon/><span className="ml-2">Generate Poll</span>
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                            
                                            {/* Carousel */}
                                            <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl shadow-lg p-6 flex flex-col min-h-[20rem]">
                                                <h3 className="text-xl font-bold flex items-center mb-4"><CollectionIcon/><span className="ml-2">Carousel</span></h3>
                                                <div className="flex-grow flex flex-col justify-center">
                                                    {isGeneratingCarousel ? (
                                                        <div className="flex items-center justify-center gap-2 text-slate-300"><LoadingSpinner/><span>Designing carousel...</span></div>
                                                    ) : generatedContent.posts.carouselPresentation ? (
                                                         <>
                                                            <button onClick={() => handleOpenEditModal('carousel')} className="self-end flex items-center gap-2 text-xs text-slate-300 hover:text-white bg-slate-700 hover:bg-slate-600 px-2 py-1 rounded-md transition-colors mb-2"><EditIcon/> Edit</button>
                                                            <div className="bg-slate-700/50 p-4 rounded-lg flex-grow flex flex-col justify-between">
                                                                <div>
                                                                    <h4 className="font-bold text-orange-400">{generatedContent.posts.carouselPresentation.slides[currentSlide].title}</h4>
                                                                    <div className="text-sm mt-2 text-slate-300" dangerouslySetInnerHTML={{ __html: generatedContent.posts.carouselPresentation.slides[currentSlide].content }}/>
                                                                </div>
                                                                <div className="flex justify-between items-center mt-4">
                                                                    <button onClick={() => setCurrentSlide(s => Math.max(0, s-1))} disabled={currentSlide === 0} className="text-xs disabled:opacity-50">Prev</button>
                                                                    <span className="text-xs text-slate-400">{currentSlide + 1} / {generatedContent.posts.carouselPresentation.slides.length}</span>
                                                                    <button onClick={() => setCurrentSlide(s => Math.min(generatedContent.posts.carouselPresentation!.slides.length - 1, s+1))} disabled={currentSlide === generatedContent.posts.carouselPresentation.slides.length - 1} className="text-xs disabled:opacity-50">Next</button>
                                                                </div>
                                                            </div>
                                                         </>
                                                    ) : (
                                                        <button onClick={handleGenerateCarousel} className="w-full bg-orange-600/50 hover:bg-orange-600 border border-orange-500 disabled:bg-slate-600 text-white font-bold py-3 px-4 rounded-md flex items-center justify-center transition-colors" disabled={isGeneratingCarousel}>
                                                            <SparklesIcon/><span className="ml-2">Generate Carousel</span>
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Report Section */}
                                    <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl shadow-lg p-6">
                                        <h2 className="text-2xl font-bold flex items-center mb-4"><DocumentTextIcon/><span className="ml-2">In-depth Report</span></h2>
                                        {isGeneratingReport ? (
                                            <div className="flex items-center justify-center gap-2 text-slate-300 bg-slate-700/50 p-4 rounded-lg min-h-[10rem]"><LoadingSpinner/><span>Conducting research... This might take a moment.</span></div>
                                        ) : generatedContent.posts.researchReport ? (
                                            <div>
                                                <h3 className="font-semibold text-xl text-teal-400">{generatedContent.posts.researchReport.title}</h3>
                                                <div className="text-slate-300 my-4 prose prose-invert max-w-none max-h-96 overflow-y-auto p-2 border border-slate-700 rounded-md" dangerouslySetInnerHTML={{__html: generatedContent.posts.researchReport.report }} />
                                                <div className="mt-4">
                                                    <h4 className="font-semibold text-slate-300 mb-2">Sources:</h4>
                                                    <ul className="list-disc list-inside space-y-1 text-sm max-h-40 overflow-y-auto">
                                                        {generatedContent.posts.researchReport.sources.map((source, i) => (
                                                            <li key={i}>
                                                                <a href={source.uri} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">{source.title}</a>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            </div>
                                        ) : (
                                            <button onClick={handleGenerateReport} className="w-full bg-teal-600/50 hover:bg-teal-600 border border-teal-500 disabled:bg-slate-600 text-white font-bold py-3 px-4 rounded-md flex items-center justify-center transition-colors" disabled={isGeneratingReport}>
                                                <SparklesIcon/><span className="ml-2">Generate Factual Report</span>
                                            </button>
                                        )}
                                    </div>
                                </>
                            )}
                            {isLoading && !generatedContent && <div className="lg:col-span-2" />}
                        </div>

                        {/* Side Column for Image */}
                        <div className="lg:sticky top-8 space-y-8 self-start">
                           {generatedContent && (
                             <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl shadow-lg p-6">
                                <h2 className="text-2xl font-bold mb-4">Generated Image</h2>
                                <div className="aspect-video bg-slate-700/50 rounded-lg mb-4 flex items-center justify-center border border-slate-700 overflow-hidden">
                                    {isRegeneratingImage ? (
                                        <div className="flex flex-col items-center justify-center text-slate-400">
                                            <LoadingSpinner/>
                                            <p className="mt-2 text-sm">Generating new images...</p>
                                        </div>
                                    ) : generatedContent.images.length > 0 ? (
                                        <img
                                            src={`data:image/jpeg;base64,${generatedContent.images[selectedImageIndex]}`}
                                            alt={generatedContent.posts.imagePrompt}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <div className="flex flex-col items-center justify-center text-slate-400 h-full p-4">
                                            <ImagePlaceholderIcon />
                                            <p className="mt-2 text-sm text-center mb-4">Content is ready. Generate visuals to accompany your posts.</p>
                                            <button
                                                onClick={handleGenerateImages}
                                                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md flex items-center justify-center transition-colors"
                                                disabled={isRegeneratingImage}
                                            >
                                                <SparklesIcon /> <span className="ml-2">Generate Images</span>
                                            </button>
                                        </div>
                                    )}
                                </div>
                                
                                {generatedContent.images.length > 1 && (
                                    <div className="flex justify-center gap-2 mb-4">
                                        {generatedContent.images.map((_, index) => (
                                            <button key={index} onClick={() => setSelectedImageIndex(index)} className={`h-2 w-8 rounded-full transition-colors ${selectedImageIndex === index ? 'bg-blue-500' : 'bg-slate-600 hover:bg-slate-500'}`}></button>
                                        ))}
                                    </div>
                                )}
                                
                                <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
                                    <div>
                                        <label htmlFor="style" className="block mb-1 text-slate-400">Style</label>
                                        <select id="style" value={artisticStyle} onChange={e => setArtisticStyle(e.target.value)} className="w-full bg-slate-700 border-slate-600 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
                                            <option>Default</option><option>Photorealistic</option><option>Minimalist</option><option>Abstract</option><option>3D Render</option><option>Cartoonish</option><option>Watercolor</option><option>Synthwave</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label htmlFor="color" className="block mb-1 text-slate-400">Color Palette</label>
                                        <select id="color" value={colorPalette} onChange={e => setColorPalette(e.target.value)} className="w-full bg-slate-700 border-slate-600 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
                                            <option>Default</option><option>Vibrant</option><option>Monochromatic</option><option>Pastel</option><option>Earthy Tones</option><option>Neon</option><option>Warm</option><option>Cool</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label htmlFor="composition" className="block mb-1 text-slate-400">Composition</label>
                                        <select id="composition" value={composition} onChange={e => setComposition(e.target.value)} className="w-full bg-slate-700 border-slate-600 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
                                            <option>Default</option><option>Close-up</option><option>Wide shot</option><option>Symmetrical</option><option>Asymmetrical</option><option>Top-down</option><option>Low angle</option><option>Dutch angle</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label htmlFor="mood" className="block mb-1 text-slate-400">Mood</label>
                                        <select id="mood" value={mood} onChange={e => setMood(e.target.value)} className="w-full bg-slate-700 border-slate-600 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
                                            <option>Default</option><option>Inspirational</option><option>Corporate</option><option>Futuristic</option><option>Nostalgic</option><option>Joyful</option><option>Serene</option><option>Dramatic</option>
                                        </select>
                                    </div>
                                     <div className="col-span-2">
                                        <label htmlFor="aspectRatio" className="block mb-1 text-slate-400">Aspect Ratio</label>
                                        <select id="aspectRatio" value={aspectRatio} onChange={e => setAspectRatio(e.target.value)} className="w-full bg-slate-700 border-slate-600 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
                                            <option value="16:9">16:9 (Landscape)</option>
                                            <option value="1:1">1:1 (Square)</option>
                                            <option value="9:16">9:16 (Portrait)</option>
                                            <option value="4:3">4:3 (Traditional)</option>
                                            <option value="3:4">3:4 (Tall)</option>
                                        </select>
                                    </div>
                                </div>
                                {generatedContent.images.length > 0 && (
                                <div className="space-y-2">
                                    <button
                                        onClick={handleGenerateImages}
                                        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 text-white font-bold py-2 px-4 rounded-md flex items-center justify-center transition-colors"
                                        disabled={isRegeneratingImage || !generatedContent?.posts.imagePrompt}
                                    >
                                        <RegenerateIcon /> <span className="ml-2">Regenerate</span>
                                    </button>

                                    {isEditingPrompt ? (
                                        <div className="space-y-2">
                                            <textarea
                                                value={editedPrompt}
                                                onChange={(e) => setEditedPrompt(e.target.value)}
                                                className="w-full bg-slate-900 border border-slate-600 rounded-md px-3 py-2 text-sm"
                                                rows={3}
                                            />
                                            <div className="flex gap-2">
                                                <button onClick={handleGenerateImages} className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-3 rounded-md text-sm">Save & Regenerate</button>
                                                <button onClick={() => setIsEditingPrompt(false)} className="bg-slate-600 hover:bg-slate-500 text-white font-semibold py-2 px-3 rounded-md text-sm">Cancel</button>
                                            </div>
                                        </div>
                                    ) : (
                                         <button
                                            onClick={() => {
                                                setEditedPrompt(generatedContent.posts.imagePrompt);
                                                setIsEditingPrompt(true);
                                            }}
                                            className="w-full bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white font-bold py-2 px-4 rounded-md flex items-center justify-center transition-colors"
                                            disabled={isRegeneratingImage || !generatedContent?.posts.imagePrompt}
                                        >
                                            <EditIcon /> <span className="ml-2">Edit Prompt</span>
                                        </button>
                                    )}
                                </div>
                                )}
                            </div>
                           )}
                        </div>
                    </div>
                )}

                <Chatbot />
            </main>

            <Modal isOpen={isEditModalOpen} onClose={handleCloseEditModal} title={getModalTitle()}>
                <div className="space-y-4">{renderEditModalContent()}</div>
                <div className="mt-6 flex justify-end gap-3">
                    <button onClick={handleCloseEditModal} className="bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white font-bold py-2 px-4 rounded-md transition-colors">Cancel</button>
                    <button onClick={handleSaveEdit} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md transition-colors">Save Changes</button>
                </div>
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

            {saveSuccess && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-green-600 text-white px-6 py-3 rounded-full shadow-lg animate-fade-in-out">
                    Content saved successfully!
                </div>
            )}
             {scheduleSuccess && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-purple-600 text-white px-6 py-3 rounded-full shadow-lg animate-fade-in-out">
                    Post scheduled successfully!
                </div>
            )}

            <style>{`
                @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
                .animate-fade-in { animation: fade-in 0.5s ease-out forwards; }

                @keyframes fade-in-out {
                    0% { opacity: 0; transform: translateY(1rem) translateX(-50%); }
                    10% { opacity: 1; transform: translateY(0) translateX(-50%); }
                    90% { opacity: 1; transform: translateY(0) translateX(-50%); }
                    100% { opacity: 0; transform: translateY(1rem) translateX(-50%); }
                }
                .animate-fade-in-out { animation: fade-in-out 3s ease-out forwards; }
                
                .prose ul { list-style-position: inside; }
                .prose ul > li::marker { content: '• '; color: #60a5fa; }
                .prose ol { list-style-position: inside; }
                .prose ol > li { padding-left: 0.5rem; }
                .prose ol > li::marker { font-weight: bold; color: #60a5fa; }
            `}</style>
        </div>
    );
};

export default App;