/** A YouTube video that goes deeper on one lesson's topic. Third-party content. */
export type LessonVideo = {
  creator: string;
  /** The title exactly as YouTube's oEmbed endpoint returns it. */
  title: string;
  url: string;
  /** Rounded length in minutes, when known. */
  minutes?: number;
  /** Simple enough for a beginner or a school student. */
  easy?: boolean;
};

export type LessonVideos = Record<string, LessonVideo[]>;
