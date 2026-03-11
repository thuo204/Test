'use client';

import { useState } from 'react';
import { MessageSquare, Reply, ThumbsUp } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { commentApi } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import toast from 'react-hot-toast';

interface CommentSectionProps {
  articleId: string;
  commentCount: number;
}

export function CommentSection({ articleId, commentCount }: CommentSectionProps) {
  const { isAuthenticated, user } = useAuthStore();
  const [form, setForm] = useState({ content: '', author_name: '', author_email: '' });
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: comments = [] } = useQuery({
    queryKey: ['comments', articleId],
    queryFn: () => commentApi.getArticleComments(articleId).then(r => r.data.data),
  });

  const postComment = useMutation({
    mutationFn: (data: any) => commentApi.postComment(articleId, data),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['comments', articleId] });
      setForm({ content: '', author_name: '', author_email: '' });
      setReplyTo(null);
      toast.success(isAuthenticated ? 'Comment posted!' : 'Comment submitted for moderation.');
    },
    onError: () => toast.error('Failed to post comment.'),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.content.trim()) return;
    postComment.mutate({
      content: form.content,
      author_name: form.author_name,
      author_email: form.author_email,
      parent_id: replyTo,
    });
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-8 flex items-center gap-2">
        <MessageSquare className="w-6 h-6 text-primary-600" />
        Comments ({commentCount})
      </h2>

      {/* Comment form */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-8">
        <h3 className="font-semibold text-gray-900 mb-4">
          {replyTo ? 'Write a reply' : 'Leave a comment'}
        </h3>
        {replyTo && (
          <button onClick={() => setReplyTo(null)} className="text-sm text-gray-500 hover:text-gray-700 mb-3 flex items-center gap-1">
            ✕ Cancel reply
          </button>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          {!isAuthenticated && (
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="label">Name *</label>
                <input
                  type="text"
                  value={form.author_name}
                  onChange={(e) => setForm(f => ({ ...f, author_name: e.target.value }))}
                  className="input"
                  placeholder="Your name"
                  required
                />
              </div>
              <div>
                <label className="label">Email *</label>
                <input
                  type="email"
                  value={form.author_email}
                  onChange={(e) => setForm(f => ({ ...f, author_email: e.target.value }))}
                  className="input"
                  placeholder="your@email.com"
                  required
                />
              </div>
            </div>
          )}
          {isAuthenticated && (
            <div className="flex items-center gap-3 text-sm text-gray-600 bg-gray-50 rounded-lg p-3">
              <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                <span className="text-primary-700 font-semibold text-xs">{user?.full_name?.charAt(0)}</span>
              </div>
              Commenting as <span className="font-medium text-gray-900">{user?.full_name}</span>
            </div>
          )}
          <div>
            <label className="label">Comment *</label>
            <textarea
              value={form.content}
              onChange={(e) => setForm(f => ({ ...f, content: e.target.value }))}
              className="input h-32 resize-none"
              placeholder="Share your thoughts..."
              required
              maxLength={2000}
            />
            <p className="text-xs text-gray-400 mt-1">{form.content.length}/2000</p>
          </div>
          <button
            type="submit"
            disabled={postComment.isPending || !form.content.trim()}
            className="btn-primary"
          >
            {postComment.isPending ? 'Posting...' : 'Post Comment'}
          </button>
        </form>
      </div>

      {/* Comments list */}
      <div className="space-y-6">
        {comments.map((comment: any) => (
          <CommentItem
            key={comment.id}
            comment={comment}
            onReply={(id) => setReplyTo(id)}
            isAuthenticated={isAuthenticated}
          />
        ))}
        {comments.length === 0 && (
          <div className="text-center py-10 text-gray-400">
            <MessageSquare className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>No comments yet. Be the first to comment!</p>
          </div>
        )}
      </div>
    </div>
  );
}

function CommentItem({ comment, onReply, isAuthenticated }: { comment: any; onReply: (id: string) => void; isAuthenticated: boolean }) {
  return (
    <div className="flex gap-4">
      <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center shrink-0">
        {comment.author_avatar ? (
          <img src={comment.author_avatar} alt={comment.author_name} className="w-10 h-10 rounded-full object-cover" />
        ) : (
          <span className="text-gray-600 font-semibold text-sm">
            {comment.author_name?.charAt(0)?.toUpperCase()}
          </span>
        )}
      </div>
      <div className="flex-1">
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="font-semibold text-gray-900 text-sm">{comment.author_name}</span>
            <span className="text-xs text-gray-400">
              {new Date(comment.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
          </div>
          <p className="text-sm text-gray-700 leading-relaxed">{comment.content}</p>
          <div className="flex items-center gap-4 mt-3">
            <button className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-primary-600 transition-colors">
              <ThumbsUp className="w-3.5 h-3.5" /> {comment.like_count || 0}
            </button>
            {isAuthenticated && (
              <button
                onClick={() => onReply(comment.id)}
                className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-primary-600 transition-colors"
              >
                <Reply className="w-3.5 h-3.5" /> Reply
              </button>
            )}
          </div>
        </div>
        {/* Replies */}
        {comment.replies?.length > 0 && (
          <div className="ml-6 mt-3 space-y-3">
            {comment.replies.map((reply: any) => (
              <div key={reply.id} className="flex gap-3">
                <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center shrink-0">
                  <span className="text-gray-600 font-semibold text-xs">{reply.author_name?.charAt(0)?.toUpperCase()}</span>
                </div>
                <div className="flex-1 bg-gray-50 rounded-xl border border-gray-100 p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-gray-900 text-xs">{reply.author_name}</span>
                    <span className="text-xs text-gray-400">{new Date(reply.created_at).toLocaleDateString()}</span>
                  </div>
                  <p className="text-sm text-gray-700">{reply.content}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
