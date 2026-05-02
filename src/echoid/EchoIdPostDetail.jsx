import React, { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Copy, Share2, X } from "lucide-react";
import Skeleton from "react-loading-skeleton";

const APP_POST_ORIGIN = "https://app.echoidchat.online";

const getPostShareUrl = (post) => {
  const postId = String(post?._id || post?.id || post?.postId || "").trim();
  return postId ? `${APP_POST_ORIGIN}/app/post/${encodeURIComponent(postId)}` : APP_POST_ORIGIN;
};

const copyTextToClipboard = async (text) => {
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textArea = document.createElement("textarea");
  textArea.value = text;
  textArea.setAttribute("readonly", "");
  textArea.style.position = "fixed";
  textArea.style.opacity = "0";
  document.body.appendChild(textArea);
  textArea.select();
  document.execCommand("copy");
  document.body.removeChild(textArea);
};

const stripInlineMediaTokens = (value = "") =>
  String(value || "")
    .replace(/\[(?:Link|Link_cover):-?\s*https?:\/\/[^\]\s]+(?:\s*\])?/gi, "")
    .replace(/\[\[media:[^[\]]+\]\]/gi, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

const renderPostMedia = (media, altText, index, onPreviewMedia) => {
  if (!media?.url) return null;

  return (
    <div
      key={`${media.url}-${index}`}
      className="echoid-detail-media-frame"
      onClick={() => onPreviewMedia?.(media, altText)}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onPreviewMedia?.(media, altText);
        }
      }}
    >
      {media.kind === "video" ? (
        <video src={media.url} className="echoid-post-media" controls playsInline preload="metadata" />
      ) : (
        <img src={media.url} alt={altText} className="echoid-post-media" loading="lazy" />
      )}
    </div>
  );
};

function EchoIdDetailBodySkeleton() {
  return (
    <div className="echoid-post-detail-flow" aria-hidden="true">
      <Skeleton width="62%" height={28} borderRadius={12} style={{ marginBottom: 14 }} />
      <Skeleton height={220} borderRadius={24} style={{ marginBottom: 14 }} />
      <Skeleton count={4} height={15} borderRadius={8} style={{ marginBottom: 8 }} />
    </div>
  );
}
function EchoIdCommentSkeletonList({ count = 3 }) {
  return (
    <div className="echoid-post-comments-list" aria-hidden="true">
      {Array.from({ length: count }, (_, index) => (
        <article key={`comment-skeleton-${index}`} className="echoid-comment-card">
          <div className="echoid-comment-avatar-shell">
            <Skeleton circle width={42} height={42} />
          </div>
          <div className="echoid-comment-copy">
            <div className="echoid-comment-meta">
              <Skeleton width={120} height={15} borderRadius={8} />
              <div className="echoid-comment-meta-subline">
                <Skeleton width={86} height={12} borderRadius={7} />
                <Skeleton width={58} height={12} borderRadius={7} />
              </div>
            </div>
            <Skeleton count={2} height={13} borderRadius={8} style={{ marginTop: 10 }} />
          </div>
        </article>
      ))}
    </div>
  );
}

function EchoIdShareModal({ post, shareUrl, previewMedia, previewText, onClose }) {
  const [copyStatus, setCopyStatus] = useState("");
  const author = post?.name || "Anonymous";
  const title = post?.title || "EchoId post";

  const handleCopyLink = async () => {
    await copyTextToClipboard(shareUrl);
    setCopyStatus("Link copied");
  };

  const handleShareLink = async () => {
    await copyTextToClipboard(shareUrl);
    setCopyStatus("Link copied. Choose an app to share.");
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title,
          text: previewText || `Open ${author}'s EchoId post`,
          url: shareUrl,
        });
      } catch (error) {
        if (error?.name !== "AbortError") {
          setCopyStatus("Link copied");
        }
      }
    }
  };

  return (
    <div className="echoid-share-modal-overlay" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose?.()}>
      <section className="echoid-share-modal" role="dialog" aria-modal="true" aria-labelledby="echoid-share-title">
        <div className="echoid-share-modal-head">
          <div>
            <span>Share post</span>
            <strong id="echoid-share-title">{title}</strong>
          </div>
          <button type="button" className="echoid-share-close" aria-label="Close share dialog" onClick={onClose}>
            <X size={17} />
          </button>
        </div>

        <div className="echoid-share-preview">
          {previewMedia?.url ? (
            <div className="echoid-share-preview-media">
              {previewMedia.kind === "video" ? (
                <video src={previewMedia.url} muted playsInline preload="metadata" />
              ) : (
                <img src={previewMedia.url} alt={title} />
              )}
            </div>
          ) : null}
          <div className="echoid-share-preview-copy">
            <strong>{author}</strong>
            {previewText ? <p>{previewText}</p> : <p>Open this EchoId post in the app.</p>}
          </div>
        </div>

        <div className="echoid-share-link-box">
          <span>{shareUrl}</span>
        </div>

        <div className="echoid-share-actions">
          <button type="button" onClick={handleCopyLink}>
            <Copy size={17} />
            <span>Copy link</span>
          </button>
          <button type="button" className="is-primary" onClick={handleShareLink}>
            <Share2 size={17} />
            <span>Share link</span>
          </button>
        </div>
        {copyStatus ? <div className="echoid-share-status">{copyStatus}</div> : null}
      </section>
    </div>
  );
}

export default function EchoIdPostDetail({
  post,
  fullBodyText,
  mediaItems,
  leadMedia,
  bodyBlocks,
  relativeTimeLabel,
  reactionValue,
  witnessValue,
  isWitnessPending,
  canShowWitness,
  canManageWitnesses,
  isReactionPending,
  onBack,
  onLike,
  onDislike,
  onWitness,
  onOpenWitnesses,
  commentsVisible,
  commentsLoading,
  commentsLoadingMore,
  commentsHasMore,
  comments,
  commentsError,
  onShowComments,
  onLoadMoreComments,
  repliesByCommentId,
  replyLoadingByCommentId,
  replyErrorByCommentId,
  replyVisibleByCommentId,
  onToggleReplies,
  commentDraft,
  onCommentDraftChange,
  onSubmitComment,
  replyTarget,
  onReplyToComment,
  onCancelReplyToComment,
  isCommentSubmitting,
  commentSubmitError,
  viewerAvatarUrl,
  viewerName,
  isPostLoading,
  postError,
  witnessPanelOpen,
  witnessEntries,
  witnessEntriesLoading,
  witnessEntriesError,
  onCloseWitnessPanel,
  onRemoveWitnessEntry,
  onOpenAuthor,
  onPreviewMedia,
  onPreviewImage,
  authorAvatarUrl,
  onReport,
  onDelete,
  isReported,
  isReportPending,
  isDeletePending,
}) {
  if (!post) return null;

  const commentNodeMapRef = useRef(new Map());
  const detailBodyRef = useRef(null);
  const loadMoreSentinelRef = useRef(null);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const author = post.name || "Anonymous";
  const handle = post.username ? `@${post.username}` : "@anonymous";
  const title = post.title || "";
  const hasComments = Number(post.comments || 0) > 0;
  const replyTargetId = String(replyTarget?.id || "").trim();
  const inlineMediaUrls = new Set(
    Array.isArray(bodyBlocks)
      ? bodyBlocks.filter((block) => block?.type === "media" && block?.value?.url).map((block) => block.value.url)
      : []
  );
  const extraMedia = Array.isArray(mediaItems)
    ? mediaItems.filter((item) => item?.url && item.url !== leadMedia?.url && !inlineMediaUrls.has(item.url))
    : [];
  const topLevelComments = Array.isArray(comments) ? comments : [];
  const handleOpenCommentAuthor = (entry) => {
    if (!entry?.clientId) return;
    onOpenAuthor?.(entry);
  };

  useEffect(() => {
    if (!replyTargetId) return;
    const targetNode = commentNodeMapRef.current.get(replyTargetId);
    if (!targetNode?.scrollIntoView) return;
    targetNode.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [replyTargetId]);

  useEffect(() => {
    if (!commentsVisible || !commentsHasMore || commentsLoading || commentsLoadingMore || !loadMoreSentinelRef.current) {
      return undefined;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry?.isIntersecting) {
          onLoadMoreComments?.(post);
        }
      },
      {
        root: detailBodyRef.current,
        rootMargin: "0px 0px 160px 0px",
        threshold: 0.1,
      }
    );

    observer.observe(loadMoreSentinelRef.current);
    return () => observer.disconnect();
  }, [commentsVisible, commentsHasMore, commentsLoading, commentsLoadingMore, onLoadMoreComments, post]);

  const registerCommentNode = (commentId, node) => {
    const normalizedCommentId = String(commentId || "").trim();
    if (!normalizedCommentId) return;
    if (node) {
      commentNodeMapRef.current.set(normalizedCommentId, node);
      return;
    }
    commentNodeMapRef.current.delete(normalizedCommentId);
  };
  const shouldRenderWitnessAction = canShowWitness && !canManageWitnesses;
  const shareUrl = useMemo(() => getPostShareUrl(post), [post]);
  const previewText = useMemo(() => {
    const value = stripInlineMediaTokens(title || fullBodyText || "");
    return value.length > 160 ? `${value.slice(0, 157)}...` : value;
  }, [fullBodyText, title]);

  return (
    <div className="echoid-post-detail-screen">
      <header className="echoid-post-detail-header">
        <button type="button" className="echoid-icon-button" aria-label="Back to feed" onClick={onBack}>
          <ArrowLeft size={18} />
        </button>
        <span className="echoid-post-detail-brand">Echo</span>
      </header>

      <main className="echoid-post-detail-body" ref={detailBodyRef}>
        <article className="echoid-post-detail-card">
          {leadMedia ? <div className="echoid-post-detail-hero">{renderPostMedia(leadMedia, title || author, 0, onPreviewMedia)}</div> : null}

          <div className={`echoid-post-detail-sheet ${leadMedia ? "" : "no-hero"}`}>
            {extraMedia.length > 0 ? (
              <div className="echoid-detail-media-stack">
                {extraMedia.map((media, index) => renderPostMedia(media, title || author, index + 1, onPreviewMedia))}
              </div>
            ) : null}

            <section className="echoid-post-detail-copy">
              <div className="echoid-post-detail-author-row">
                <div className="echoid-post-detail-author-main">
                  <button
                    type="button"
                    className="echoid-post-detail-avatar-button"
                    onClick={() => (authorAvatarUrl ? onPreviewImage?.(authorAvatarUrl, author) : onOpenAuthor?.(post))}
                  >
                    {authorAvatarUrl ? (
                      <img src={authorAvatarUrl} alt={author} className="echoid-post-detail-avatar" />
                    ) : (
                      <div className="echoid-post-detail-avatar" aria-hidden="true">
                        {(author || "A").charAt(0).toUpperCase()}
                      </div>
                    )}
                  </button>
                  <div className="echoid-post-detail-author-copy">
                    <strong>
                      <button type="button" className="echoid-inline-identity-button" onClick={() => onOpenAuthor?.(post)}>
                        {author}
                      </button>
                    </strong>
                    <span>
                      <button type="button" className="echoid-inline-identity-button" onClick={() => onOpenAuthor?.(post)}>
                        {handle}
                      </button>
                    </span>
                  </div>
                </div>
              </div>
              <div className="echoid-post-detail-meta-row">
                <div className="echoid-post-detail-author-side">
                  <span className="echoid-post-detail-meta-pill">{relativeTimeLabel}</span>
                  {canShowWitness ? (
                    <button
                      type="button"
                      className={`echoid-post-detail-meta-pill echoid-post-detail-meta-pill-button ${
                        witnessValue ? "is-active" : ""
                      } ${canManageWitnesses ? "is-manageable" : ""}`}
                      onClick={canManageWitnesses ? () => onOpenWitnesses?.(post) : () => onWitness?.(post)}
                      disabled={isWitnessPending}
                      aria-pressed={canManageWitnesses ? undefined : Boolean(witnessValue)}
                    >
                      {canManageWitnesses ? `Witnesses ${Number(post.witness || 0)}` : `Witness ${Number(post.witness || 0)}`}
                    </button>
                  ) : null}
                </div>
              </div>

              {title ? <h2 className="echoid-post-detail-title">{title}</h2> : null}
              {isPostLoading ? <EchoIdDetailBodySkeleton /> : null}
              {postError ? <div className="echoid-post-detail-status is-error">{postError}</div> : null}
              {!isPostLoading && Array.isArray(bodyBlocks) && bodyBlocks.length > 0 ? (
                <div className="echoid-post-detail-flow">
                  {bodyBlocks.map((block) => {
                    if (block.type === "media") {
                      return (
                        <div key={block.key} className="echoid-post-detail-inline-media">
                          {renderPostMedia(block.value, title || author, block.key, onPreviewMedia)}
                        </div>
                      );
                    }

                    const textValue = stripInlineMediaTokens(block.value);
                    return textValue ? (
                      <p key={block.key} className="echoid-post-detail-text">
                        {textValue}
                      </p>
                    ) : null;
                  })}
                </div>
              ) : stripInlineMediaTokens(fullBodyText) ? (
                <p className="echoid-post-detail-text">{stripInlineMediaTokens(fullBodyText)}</p>
              ) : (
                <p className="echoid-post-muted">Media-only post</p>
              )}

              <div className="echoid-post-detail-actions">
                <button
                  type="button"
                  className="echoid-post-action-button"
                  onClick={() => setIsShareModalOpen(true)}
                  aria-haspopup="dialog"
                >
                  Share
                </button>
                <button
                  type="button"
                  className={`echoid-post-action-button ${reactionValue === 1 ? "is-selected is-like" : ""}`}
                  onClick={() => onLike?.(post)}
                  disabled={isReactionPending}
                  aria-pressed={reactionValue === 1}
                >
                  Likes {Number(post.likes || 0)}
                </button>
                <button type="button" onClick={() => onShowComments?.(post)}>
                  Comments {Number(post.comments || 0)}
                </button>
                <button
                  type="button"
                  className={`echoid-post-action-button ${reactionValue === -1 ? "is-selected is-dislike" : ""}`}
                  onClick={() => onDislike?.(post)}
                  disabled={isReactionPending}
                  aria-pressed={reactionValue === -1}
                >
                  Dislikes {Number(post.dislike || 0)}
                </button>
                {shouldRenderWitnessAction ? (
                  <button
                    type="button"
                    className={`echoid-post-action-button ${witnessValue ? "is-selected is-witness" : ""}`}
                    onClick={() => onWitness?.(post)}
                    disabled={isWitnessPending}
                    aria-pressed={Boolean(witnessValue)}
                  >
                    Witness {Number(post.witness || 0)}
                  </button>
                ) : null}
                {!canManageWitnesses ? (
                  <button
                    type="button"
                    className={`echoid-post-action-button ${isReported ? "is-selected is-report" : ""}`}
                    onClick={() => onReport?.(post)}
                    disabled={isReportPending || isReported}
                    aria-pressed={Boolean(isReported)}
                  >
                    {isReported ? "Reported" : "Report"}
                  </button>
                ) : null}
                {canManageWitnesses ? (
                  <button
                    type="button"
                    className="echoid-post-action-button is-delete"
                    onClick={() => onDelete?.(post)}
                    disabled={isDeletePending}
                  >
                    {isDeletePending ? "Deleting..." : "Delete"}
                  </button>
                ) : null}
              </div>

              {canManageWitnesses && witnessPanelOpen ? (
                <div className="echoid-inline-witness-panel">
                  <div className="echoid-inline-witness-panel-head">
                    <strong>Witnesses</strong>
                    <button type="button" onClick={onCloseWitnessPanel}>
                      Close
                    </button>
                  </div>
                  {witnessEntriesLoading ? <div className="echoid-post-comments-empty">Loading witnesses...</div> : null}
                  {!witnessEntriesLoading && witnessEntriesError ? (
                    <div className="echoid-post-comments-empty">{witnessEntriesError}</div>
                  ) : null}
                  {!witnessEntriesLoading && !witnessEntriesError && witnessEntries.length === 0 ? (
                    <div className="echoid-post-comments-empty">No witnesses yet.</div>
                  ) : null}
                  {!witnessEntriesLoading && !witnessEntriesError && witnessEntries.length > 0 ? (
                    <div className="echoid-floating-list">
                      {witnessEntries.map((entry) => (
                        <article key={`${entry.clientId}-${entry.createdAt || ""}`} className="echoid-floating-row">
                          <div className="echoid-comment-avatar-shell">
                            {entry.profilePic ? (
                              <button
                                type="button"
                                className="echoid-avatar-preview-button"
                                onClick={() => onPreviewImage?.(entry.profilePic, entry.name || entry.username || "Witness")}
                              >
                                <img src={entry.profilePic} alt={entry.name || entry.username || "Witness"} className="echoid-comment-avatar" />
                              </button>
                            ) : (
                              <div className="echoid-comment-avatar echoid-comment-avatar-fallback">
                                {(entry.name || entry.username || "W").charAt(0).toUpperCase()}
                              </div>
                            )}
                          </div>
                          <div className="echoid-floating-copy">
                            <strong>{entry.name || "Anonymous"}</strong>
                            <span>{entry.username ? `@${entry.username}` : "No username"}</span>
                          </div>
                          <button type="button" className="echoid-floating-danger" onClick={() => onRemoveWitnessEntry?.(entry)}>
                            Delete
                          </button>
                        </article>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : null}
            </section>
          </div>
        </article>

        {isShareModalOpen ? (
          <EchoIdShareModal
            post={post}
            shareUrl={shareUrl}
            previewMedia={leadMedia}
            previewText={previewText}
            onClose={() => setIsShareModalOpen(false)}
          />
        ) : null}

        <section className="echoid-post-comments-panel">
          <div className="echoid-post-comments-head">
            <strong>Comments</strong>
            <span>Recent</span>
          </div>

          <div className="echoid-post-comment-composer">
            <div className="echoid-comment-avatar-shell">
              {viewerAvatarUrl ? (
                <button
                  type="button"
                  className="echoid-avatar-preview-button"
                  onClick={() => onPreviewImage?.(viewerAvatarUrl, viewerName || "Your profile")}
                >
                  <img src={viewerAvatarUrl} alt={viewerName || "Your profile"} className="echoid-comment-avatar" />
                </button>
              ) : (
                <div className="echoid-comment-avatar echoid-comment-avatar-fallback">
                  {(viewerName || "Y").charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <div className="echoid-post-comment-composer-box">
              {replyTarget ? (
                <div className="echoid-post-comment-reply-pill">
                  <div className="echoid-post-comment-reply-pill-copy">
                    <strong>{`Replying to ${replyTarget.name || replyTarget.author}`}</strong>
                    {replyTarget.usernameLabel ? <span>{replyTarget.usernameLabel}</span> : null}
                    {replyTarget.body ? <p>{replyTarget.body}</p> : null}
                  </div>
                  <button type="button" onClick={onCancelReplyToComment}>
                    Cancel
                  </button>
                </div>
              ) : null}
              <input
                type="text"
                value={commentDraft}
                onChange={(event) => onCommentDraftChange?.(event.target.value)}
                placeholder="Add a comment..."
                className="echoid-post-comment-input"
                disabled={isCommentSubmitting}
              />
              <button
                type="button"
                className="echoid-post-comment-send"
                onClick={() => onSubmitComment?.(post)}
                disabled={isCommentSubmitting || !String(commentDraft || "").trim()}
              >
                {isCommentSubmitting ? "Sending..." : "Send"}
              </button>
            </div>
          </div>

          {commentSubmitError ? <div className="echoid-post-comment-error">{commentSubmitError}</div> : null}

          {!commentsVisible ? (
            <div className="echoid-post-comments-hidden-shell">
              <div className="echoid-post-comments-empty">Comments stay hidden until you open them.</div>
              <button type="button" onClick={() => onShowComments?.(post)} className="echoid-post-comments-reveal">
                {hasComments ? "Show comments" : "Check comments"}
              </button>
            </div>
          ) : commentsLoading ? (
            <EchoIdCommentSkeletonList count={3} />
          ) : commentsError ? (
            <div className="echoid-post-comments-empty">{commentsError}</div>
          ) : Array.isArray(comments) && comments.length > 0 ? (
            <>
              <div className="echoid-post-comments-list">
                {topLevelComments.map((comment) => (
                  <div key={comment.id} className={`echoid-comment-thread ${replyTargetId === comment.id ? "is-reply-target" : ""}`}>
                    <article
                      ref={(node) => registerCommentNode(comment.id, node)}
                      className={`echoid-comment-card ${replyTargetId === comment.id ? "is-reply-target" : ""}`}
                    >
                      <div className="echoid-comment-avatar-shell">
                        {comment.avatarUrl ? (
                          <button
                            type="button"
                            className="echoid-avatar-preview-button"
                            onClick={() => handleOpenCommentAuthor(comment)}
                            disabled={!comment.clientId}
                          >
                            <img src={comment.avatarUrl} alt={comment.name || comment.author} className="echoid-comment-avatar" />
                          </button>
                        ) : (
                          <div className="echoid-comment-avatar echoid-comment-avatar-fallback">
                            {(comment.name || comment.author || "C").charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>
                      <div className="echoid-comment-copy">
                        <div className="echoid-comment-meta">
                          <strong>{comment.clientId ? <button type="button" className="echoid-inline-identity-button" onClick={() => handleOpenCommentAuthor(comment)}>{comment.name || comment.author}</button> : comment.name || comment.author}</strong>
                          <div className="echoid-comment-meta-subline">
                            {comment.usernameLabel ? (comment.clientId ? <button type="button" className="echoid-inline-identity-button" onClick={() => handleOpenCommentAuthor(comment)}>{comment.usernameLabel}</button> : <span>{comment.usernameLabel}</span>) : null}
                            <span>{comment.relativeTimeLabel}</span>
                          </div>
                        </div>
                        <p>{comment.body}</p>
                        <div className="echoid-comment-actions">
                          <button type="button" onClick={() => onReplyToComment?.(comment)}>
                            Reply
                          </button>
                          {Number(comment.replyCount || 0) > 0 ? (
                            <button type="button" onClick={() => onToggleReplies?.(comment)}>
                              {replyVisibleByCommentId?.[comment.id]
                                ? "Hide replies"
                                : `${Number(comment.replyCount || 0)} ${Number(comment.replyCount || 0) === 1 ? "reply" : "replies"}`}
                            </button>
                          ) : null}
                        </div>
                      </div>
                    </article>
                    {replyVisibleByCommentId?.[comment.id] && replyLoadingByCommentId?.[comment.id] ? (
                      <div className="echoid-comment-replies-status">Loading replies...</div>
                    ) : null}
                    {replyVisibleByCommentId?.[comment.id] && replyErrorByCommentId?.[comment.id] ? (
                      <div className="echoid-comment-replies-status is-error">{replyErrorByCommentId[comment.id]}</div>
                    ) : null}
                    {replyVisibleByCommentId?.[comment.id] && (repliesByCommentId?.[comment.id] || []).length > 0 ? (
                      <div className="echoid-comment-replies">
                        {(repliesByCommentId?.[comment.id] || []).map((reply) => (
                          <article key={reply.id} className="echoid-comment-card is-reply">
                            <div className="echoid-comment-avatar-shell">
                              {reply.avatarUrl ? (
                                <button
                                  type="button"
                                  className="echoid-avatar-preview-button"
                                  onClick={() => handleOpenCommentAuthor(reply)}
                                  disabled={!reply.clientId}
                                >
                                  <img src={reply.avatarUrl} alt={reply.name || reply.author} className="echoid-comment-avatar" />
                                </button>
                              ) : (
                                <div className="echoid-comment-avatar echoid-comment-avatar-fallback">
                                  {(reply.name || reply.author || "R").charAt(0).toUpperCase()}
                                </div>
                              )}
                            </div>
                            <div className="echoid-comment-copy">
                              <div className="echoid-comment-meta">
                                <strong>{reply.clientId ? <button type="button" className="echoid-inline-identity-button" onClick={() => handleOpenCommentAuthor(reply)}>{reply.name || reply.author}</button> : reply.name || reply.author}</strong>
                                <div className="echoid-comment-meta-subline">
                                  {reply.usernameLabel ? (reply.clientId ? <button type="button" className="echoid-inline-identity-button" onClick={() => handleOpenCommentAuthor(reply)}>{reply.usernameLabel}</button> : <span>{reply.usernameLabel}</span>) : null}
                                  <span>{reply.relativeTimeLabel}</span>
                                </div>
                              </div>
                              <p>{reply.body}</p>
                              <div className="echoid-comment-actions">
                                <button type="button" onClick={() => onReplyToComment?.(comment)}>
                                  Reply
                                </button>
                              </div>
                            </div>
                          </article>
                        ))}
                      </div>
                    ) : replyVisibleByCommentId?.[comment.id] ? (
                      <div className="echoid-comment-replies-status">No replies yet.</div>
                    ) : null}
                  </div>
                ))}
              </div>
              {commentsHasMore || commentsLoadingMore ? <div ref={loadMoreSentinelRef} className="echoid-post-comments-load-sentinel" aria-hidden="true" /> : null}
              {commentsLoadingMore ? <div className="echoid-post-comments-empty">Loading more comments...</div> : null}
            </>
          ) : (
            <div className="echoid-post-comments-empty">No comments yet.</div>
          )}
        </section>
      </main>
    </div>
  );
}



