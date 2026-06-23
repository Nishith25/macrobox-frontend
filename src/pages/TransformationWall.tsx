// frontend/src/pages/TransformationWall.tsx (FRONTEND)

import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Camera,
  Heart,
  Image,
  Loader2,
  RefreshCw,
  Send,
  Sparkles,
  Trophy,
  UserCircle,
} from "lucide-react";
import toast from "react-hot-toast";

import api from "../api/api";

type TransformationPost = {
  _id: string;
  user?: {
    _id?: string;
    name?: string;
  };
  name?: string;
  goal?: string;
  story: string;
  imageUrl?: string;
  challengeName?: string; // kept for backend compatibility
  planName?: string;
  status?: "pending" | "approved" | "rejected";
  likes?: number;
  createdAt?: string;
};

type StoryForm = {
  story: string;
  goal: string;
  planName: string;
  imageUrl: string;
};

const goalOptions = [
  "Fat Loss",
  "Muscle Gain",
  "Weight Gain",
  "Clean Eating",
  "7-Day Plan",
];

export default function TransformationWall() {
  const [posts, setPosts] = useState<TransformationPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [likingId, setLikingId] = useState<string | null>(null);

  const [form, setForm] = useState<StoryForm>({
    story: "",
    goal: "7-Day Plan",
    planName: "",
    imageUrl: "",
  });

  const totalLikes = useMemo(
    () => posts.reduce((sum, post) => sum + Number(post.likes || 0), 0),
    [posts]
  );

  const loadPosts = async () => {
    try {
      setLoading(true);

      const res = await api.get("/transformation-wall");

      setPosts(Array.isArray(res.data) ? res.data : []);
    } catch (error: any) {
      console.error(error);
      toast.error(
        error?.response?.data?.message || "Failed to load transformation wall"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPosts();
  }, []);

  const updateForm = (field: keyof StoryForm, value: string) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const submitStory = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.story.trim()) {
      toast.error("Please write your transformation story");
      return;
    }

    try {
      setPosting(true);

      const cleanPlanName = form.planName.trim();

      const res = await api.post("/transformation-wall", {
        story: form.story.trim(),
        goal: form.goal,
        planName: cleanPlanName,
        challengeName: cleanPlanName, // backend compatibility
        imageUrl: form.imageUrl.trim(),
      });

      const newPost = res.data?.post;

      if (newPost) {
        setPosts((prev) => [newPost, ...prev]);
      } else {
        await loadPosts();
      }

      setForm({
        story: "",
        goal: "7-Day Plan",
        planName: "",
        imageUrl: "",
      });

      toast.success("Story posted successfully");
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to post story");
    } finally {
      setPosting(false);
    }
  };

  const likePost = async (postId: string) => {
    try {
      setLikingId(postId);

      const res = await api.patch(`/transformation-wall/${postId}/like`);

      const updatedPost = res.data?.post;

      setPosts((prev) =>
        prev.map((post) =>
          post._id === postId
            ? updatedPost || {
                ...post,
                likes: Number(post.likes || 0) + 1,
              }
            : post
        )
      );
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to like story");
    } finally {
      setLikingId(null);
    }
  };

  const getPostPlanName = (post: TransformationPost) => {
    return post.planName || post.challengeName || "";
  };

  return (
    <main className="min-h-screen bg-[#f6f7f8] px-4 py-8 text-slate-950 sm:px-6">
      <div className="mx-auto max-w-[1120px]">
        <section className="rounded-[30px] border border-slate-200 bg-gradient-to-br from-green-50 via-white to-green-50 p-6 shadow-[0_18px_55px_rgba(15,23,42,0.06)] sm:p-10">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full border border-green-200 bg-green-50 px-4 py-2 text-xs font-black uppercase tracking-wide text-green-700">
                <Camera size={15} />
                Transformation Wall
              </p>

              <h1 className="mt-5 text-[42px] font-black leading-[0.98] tracking-[-0.07em] text-slate-950 sm:text-[64px]">
                Real stories.
                <br />
                <span className="text-green-600">Real progress.</span>
              </h1>

              <p className="mt-5 max-w-2xl text-base font-medium leading-8 text-slate-600 sm:text-lg">
                Share your MacroBox plan journey, progress, protein goals and
                healthy routine story with the community.
              </p>
            </div>

            <button
              type="button"
              onClick={loadPosts}
              disabled={loading}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-[16px] border border-green-200 bg-white px-5 text-sm font-black text-green-700 shadow-sm transition hover:bg-green-50 disabled:opacity-60"
            >
              {loading ? (
                <Loader2 className="animate-spin" size={17} />
              ) : (
                <RefreshCw size={17} />
              )}
              Refresh
            </button>
          </div>

          <div className="mt-7 grid gap-3 sm:grid-cols-3">
            <HeroStat label="Stories Posted" value={`${posts.length}`} />
            <HeroStat label="Total Likes" value={`${totalLikes}`} />
            <HeroStat label="Status" value="Live" />
          </div>
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          {/* POST STORY FORM */}
          <aside className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_14px_35px_rgba(15,23,42,0.05)]">
            <h2 className="flex items-center gap-2 text-2xl font-black tracking-[-0.04em] text-slate-950">
              <Sparkles className="text-green-600" />
              Post your story
            </h2>

            <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
              Add your plan name, goal and progress story. Image URL is optional
              for now.
            </p>

            <form onSubmit={submitStory} className="mt-6 space-y-4">
              <div>
                <label className="mb-2 block text-xs font-black uppercase tracking-wide text-slate-400">
                  Goal
                </label>

                <select
                  value={form.goal}
                  onChange={(e) => updateForm("goal", e.target.value)}
                  className="h-12 w-full rounded-[16px] border border-slate-200 bg-white px-4 text-sm font-bold text-slate-800 outline-none transition focus:border-green-500 focus:ring-4 focus:ring-green-100"
                >
                  {goalOptions.map((goal) => (
                    <option key={goal} value={goal}>
                      {goal}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-xs font-black uppercase tracking-wide text-slate-400">
                  Plan Name
                </label>

                <input
                  value={form.planName}
                  onChange={(e) => updateForm("planName", e.target.value)}
                  placeholder="Example: 7-Day Lean Box"
                  className="h-12 w-full rounded-[16px] border border-slate-200 bg-white px-4 text-sm font-bold text-slate-800 outline-none transition focus:border-green-500 focus:ring-4 focus:ring-green-100"
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-black uppercase tracking-wide text-slate-400">
                  Image URL Optional
                </label>

                <div className="relative">
                  <Image
                    size={18}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                  />

                  <input
                    value={form.imageUrl}
                    onChange={(e) => updateForm("imageUrl", e.target.value)}
                    placeholder="Paste image URL"
                    className="h-12 w-full rounded-[16px] border border-slate-200 bg-white pl-11 pr-4 text-sm font-bold text-slate-800 outline-none transition focus:border-green-500 focus:ring-4 focus:ring-green-100"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-xs font-black uppercase tracking-wide text-slate-400">
                  Your Story
                </label>

                <textarea
                  value={form.story}
                  onChange={(e) => updateForm("story", e.target.value)}
                  placeholder="Write your MacroBox journey..."
                  rows={6}
                  className="w-full resize-none rounded-[18px] border border-slate-200 bg-white p-4 text-sm font-semibold leading-6 text-slate-800 outline-none transition focus:border-green-500 focus:ring-4 focus:ring-green-100"
                />
              </div>

              <button
                type="submit"
                disabled={posting}
                className="inline-flex h-[52px] w-full items-center justify-center gap-2 rounded-[18px] bg-green-600 px-6 py-4 text-sm font-black text-white shadow-[0_16px_32px_rgba(22,163,74,0.25)] transition hover:bg-green-700 disabled:opacity-60"
              >
                {posting ? (
                  <Loader2 className="animate-spin" size={18} />
                ) : (
                  <Send size={18} />
                )}
                Post Story
              </button>
            </form>
          </aside>

          {/* STORIES */}
          <section>
            {loading ? (
              <div className="flex min-h-[420px] items-center justify-center rounded-[28px] border border-slate-200 bg-white shadow-sm">
                <div className="flex items-center gap-3 text-sm font-black text-slate-600">
                  <Loader2 className="animate-spin text-green-600" size={22} />
                  Loading stories...
                </div>
              </div>
            ) : posts.length === 0 ? (
              <div className="rounded-[28px] border border-slate-200 bg-white p-8 text-center shadow-sm">
                <AlertCircle className="mx-auto text-slate-400" size={42} />

                <h2 className="mt-4 text-2xl font-black tracking-[-0.04em] text-slate-950">
                  No stories yet
                </h2>

                <p className="mx-auto mt-2 max-w-md text-sm font-semibold leading-6 text-slate-500">
                  Be the first to post your MacroBox progress story.
                </p>
              </div>
            ) : (
              <div className="grid gap-5">
                {posts.map((post) => {
                  const postPlanName = getPostPlanName(post);

                  return (
                    <article
                      key={post._id}
                      className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-[0_14px_35px_rgba(15,23,42,0.05)]"
                    >
                      {post.imageUrl ? (
                        <img
                          src={post.imageUrl}
                          alt={postPlanName || "Transformation story"}
                          className="h-64 w-full rounded-[22px] object-cover"
                          onError={(e) => {
                            e.currentTarget.style.display = "none";
                          }}
                        />
                      ) : (
                        <div className="flex h-52 items-center justify-center rounded-[22px] bg-slate-100">
                          <Camera size={42} className="text-slate-300" />
                        </div>
                      )}

                      <div className="mt-4 flex flex-wrap items-center gap-2">
                        <span className="inline-flex rounded-full bg-green-50 px-3 py-1 text-xs font-black text-green-700">
                          {post.goal || "MacroBox Journey"}
                        </span>

                        {postPlanName && (
                          <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">
                            {postPlanName}
                          </span>
                        )}
                      </div>

                      <div className="mt-4 flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-green-600 text-white">
                          <UserCircle size={24} />
                        </div>

                        <div className="min-w-0">
                          <h2 className="truncate text-lg font-black text-slate-950">
                            {post.name || post.user?.name || "MacroBox User"}
                          </h2>

                          <p className="text-xs font-bold text-slate-400">
                            {post.createdAt
                              ? new Date(post.createdAt).toLocaleDateString()
                              : "Today"}
                          </p>
                        </div>
                      </div>

                      <p className="mt-4 text-sm font-medium leading-7 text-slate-600">
                        {post.story}
                      </p>

                      <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4">
                        <button
                          type="button"
                          disabled={likingId === post._id}
                          onClick={() => likePost(post._id)}
                          className="inline-flex h-11 items-center justify-center gap-2 rounded-[16px] bg-green-50 px-4 text-sm font-black text-green-700 transition hover:bg-green-100 disabled:opacity-60"
                        >
                          {likingId === post._id ? (
                            <Loader2 className="animate-spin" size={17} />
                          ) : (
                            <Heart size={17} />
                          )}
                          Like
                        </button>

                        <p className="text-sm font-black text-slate-500">
                          {Number(post.likes || 0)} likes
                        </p>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        </section>

        <section className="mt-8 rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="flex items-center gap-2 text-2xl font-black tracking-[-0.04em] text-slate-950">
            <Trophy className="text-green-600" />
            How it works
          </h2>

          <p className="mt-2 text-sm font-medium leading-6 text-slate-500">
            Stories are now saved in MongoDB using the backend transformation
            wall API. Later we can add image upload, admin approval and weekly
            leaderboard.
          </p>

          <p className="mt-4 inline-flex items-center gap-2 rounded-full bg-green-50 px-4 py-2 text-sm font-black text-green-700">
            <Sparkles size={16} />
            Live: customer posts and likes
          </p>
        </section>
      </div>
    </main>
  );
}

function HeroStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[18px] border border-green-100 bg-white p-4 shadow-sm">
      <p className="text-xs font-black uppercase tracking-wide text-slate-400">
        {label}
      </p>

      <p className="mt-1 text-2xl font-black tracking-[-0.05em] text-green-700">
        {value}
      </p>
    </div>
  );
}