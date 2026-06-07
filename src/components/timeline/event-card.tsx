"use client";

import * as React from "react";
import {
  ChevronDown,
  ChevronUp,
  MessageCircle,
  Heart,
  Send,
  Users,
  Lock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { eventTypeConfig } from "./data";
import { formatTime } from "./utils";
import type { TimelineEvent } from "./types";

export function EventCard({
  event,
  onReact,
  onComment,
}: {
  event: TimelineEvent;
  onReact: (eventId: string) => void;
  onComment: (eventId: string, text: string) => void;
}) {
  const [isExpanded, setIsExpanded] = React.useState(false);
  const [showLightbox, setShowLightbox] = React.useState(false);
  const [commentText, setCommentText] = React.useState("");
  const [isTextClamped, setIsTextClamped] = React.useState(false);
  const textRef = React.useRef<HTMLParagraphElement>(null);

  const config = eventTypeConfig[event.type];
  const Icon = config.icon;
  const hasReacted = event.reactions.some((r) => r.userId === "maria");
  const reactionCount = event.reactions.length;

  // Check if text is clamped
  React.useEffect(() => {
    if (textRef.current && event.details) {
      setIsTextClamped(textRef.current.scrollHeight > textRef.current.clientHeight);
    }
  }, [event.details]);

  const handleSubmitComment = () => {
    if (commentText.trim()) {
      onComment(event.id, commentText);
      setCommentText("");
    }
  };

  return (
    <>
      <div
        className={cn(
          "group relative rounded-xl border bg-card transition-all motion-safe:duration-200",
          event.isUrgent && "border-l-4 border-l-destructive",
          isExpanded && "ring-1 ring-border"
        )}
      >
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full text-left p-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-xl"
          aria-expanded={isExpanded}
        >
          <div className="flex gap-3">
            {/* Avatar */}
            <Avatar className="h-9 w-9 shrink-0">
              <AvatarFallback className={cn("text-xs font-semibold", event.authorColor)}>
                {event.authorInitials}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0">
              {/* Header row */}
              <div className="flex items-start gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Type badge */}
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium",
                        config.color
                      )}
                    >
                      <Icon className="h-3 w-3" />
                      {config.label}
                    </span>

                    {/* Visibility badge for non-public */}
                    {event.visibility !== "everyone" && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs bg-muted text-muted-foreground">
                        {event.visibility === "family" ? (
                          <Users className="h-3 w-3" />
                        ) : (
                          <Lock className="h-3 w-3" />
                        )}
                        {event.visibility === "family" ? "Family" : "Private"}
                      </span>
                    )}

                    {event.isUrgent && (
                      <Badge variant="destructive" className="text-xs">
                        Urgent
                      </Badge>
                    )}
                  </div>

                  {/* Summary */}
                  <p className="text-sm font-medium mt-1 line-clamp-2">{event.summary}</p>
                </div>

                {/* Photo thumbnail */}
                {event.photoUrl && (
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowLightbox(true);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        e.stopPropagation();
                        setShowLightbox(true);
                      }
                    }}
                    className="shrink-0 w-14 h-14 rounded-lg overflow-hidden bg-muted cursor-pointer hover:opacity-90 transition-opacity"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={event.photoUrl} alt="Event attachment" className="w-full h-full object-cover" />
                  </div>
                )}
              </div>

              {/* Details (clamped) */}
              {event.details && !isExpanded && (
                <p ref={textRef} className="text-sm text-muted-foreground mt-2 line-clamp-2">
                  {event.details}
                </p>
              )}

              {/* Footer */}
              <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                <span>{event.authorName}</span>
                <span>·</span>
                <span>{formatTime(event.timestamp)}</span>

                {event.comments.length > 0 && (
                  <>
                    <span>·</span>
                    <span className="inline-flex items-center gap-1">
                      <MessageCircle className="h-3 w-3" />
                      {event.comments.length} {event.comments.length === 1 ? "comment" : "comments"}
                    </span>
                  </>
                )}

                {isTextClamped && !isExpanded && (
                  <span className="text-primary font-medium">Read more</span>
                )}
              </div>
            </div>

            {/* Expand indicator */}
            <div className="shrink-0 self-center">
              {isExpanded ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
          </div>
        </button>

        {/* Reaction button - always visible */}
        <div className="absolute bottom-3 right-14 flex items-center gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onReact(event.id);
            }}
            className={cn(
              "inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs transition-colors",
              hasReacted
                ? "bg-destructive/10 text-destructive"
                : "bg-muted hover:bg-muted/80 text-muted-foreground"
            )}
            aria-label={hasReacted ? "Remove reaction" : "React with heart"}
          >
            <Heart className={cn("h-3 w-3", hasReacted && "fill-current")} />
            {reactionCount > 0 && <span>{reactionCount}</span>}
          </button>
        </div>

        {/* Expanded content */}
        {isExpanded && (
          <div className="px-4 pb-4 pt-0 border-t mt-2">
            {/* Full details */}
            {event.details && (
              <p className="text-sm text-muted-foreground mt-3 whitespace-pre-wrap">{event.details}</p>
            )}

            {/* Full-size photo */}
            {event.photoUrl && (
              <div
                role="button"
                tabIndex={0}
                onClick={() => setShowLightbox(true)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setShowLightbox(true);
                  }
                }}
                className="mt-3 rounded-lg overflow-hidden bg-muted cursor-pointer max-w-md"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={event.photoUrl} alt="Event attachment" className="w-full h-auto max-h-64 object-cover" />
              </div>
            )}

            {/* Comments */}
            {event.comments.length > 0 && (
              <div className="mt-4 space-y-3">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Comments</h4>
                <div className="space-y-3 pl-2 border-l-2 border-muted">
                  {event.comments.map((comment) => (
                    <div key={comment.id} className="flex gap-2">
                      <Avatar className="h-6 w-6 shrink-0">
                        <AvatarFallback className={cn("text-[10px] font-semibold", comment.authorColor)}>
                          {comment.authorInitials}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-2 flex-wrap">
                          <span className="text-sm font-medium">{comment.authorName}</span>
                          <span className="text-xs text-muted-foreground">{formatTime(comment.timestamp)}</span>
                        </div>
                        <p className="text-sm text-muted-foreground mt-0.5 break-words">{comment.text}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Reply box */}
            <div className="mt-4 flex gap-2">
              <Avatar className="h-7 w-7 shrink-0">
                <AvatarFallback className="bg-accent/10 text-accent text-[10px] font-semibold">MR</AvatarFallback>
              </Avatar>
              <div className="flex-1 flex gap-2">
                <Input
                  placeholder="Add a comment..."
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSubmitComment();
                    }
                  }}
                  className="h-8 text-sm"
                />
                <Button size="sm" className="h-8 px-3" onClick={handleSubmitComment} disabled={!commentText.trim()}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Lightbox */}
      <Dialog open={showLightbox} onOpenChange={setShowLightbox}>
        <DialogContent className="max-w-3xl p-0 overflow-hidden bg-black/95">
          <DialogTitle className="sr-only">Image preview</DialogTitle>
          {event.photoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={event.photoUrl} alt="Full size attachment" className="w-full h-auto max-h-[80vh] object-contain" />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
