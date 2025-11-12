export interface LinkedInPost {
  title: string;
  body: string;
  hashtags: string[];
}

export interface XPost {
  body: string;
  hashtags: string[];
}

export interface BlogArticle {
    title: string;
    body: string; // Markdown/HTML content
}

export interface LinkedInPoll {
    question: string;
    options: string[];
}

export interface CarouselSlide {
    title: string;
    body: string;
}

export interface CarouselPresentation {
    title: string;
    slides: CarouselSlide[];
}

export interface ResearchReport {
    title: string;
    body: string; // Markdown/HTML with facts
}

export interface PodcastScript {
    title: string;
    script: string; // Markdown/HTML content
}


export interface GeneratedPosts {
  linkedinPost: LinkedInPost;
  xPost: XPost;
  imagePrompt: string;
  blogArticle: BlogArticle;
  linkedinPoll: LinkedInPoll;
  carouselPresentation: CarouselPresentation;
  researchReport: ResearchReport;
  podcastScript: PodcastScript;
}

export interface ScheduleItem {
    day: string;
    topic: string;
    platform: 'LinkedIn' | 'X';
    time: string;
}

export interface SavedContent {
    id: string;
    savedAt: string;
    topic: string;
    posts: GeneratedPosts;
}

export interface ScheduledPost {
    id: string;
    platform: 'LinkedIn' | 'X';
    scheduledAt: string; // ISO date string
    content: LinkedInPost | XPost;
    topic: string;
}