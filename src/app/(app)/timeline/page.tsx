"use client";

import * as React from "react";
import Link from "next/link";
import { format, isToday, isYesterday, isSameDay, parseISO, startOfDay } from "date-fns";
import {
  Pill,
  HeartPulse,
  FileText,
  Calendar as CalendarIcon,
  AlertTriangle,
  Search,
  Filter,
  ImageIcon,
  ChevronDown,
  ChevronUp,
  MessageCircle,
  Heart,
  Send,
  X,
  MoreHorizontal,
  Globe,
  Users,
  Lock,
  Camera,
  Activity,
  Check,
  Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AppShell } from "@/components/app-shell";
import { useAppShell, UserRole } from "@/components/app-shell/app-shell-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";

// ============================================================================
// TYPES & DATA
// ============================================================================

type EventType = "med" | "vital" | "note" | "appointment" | "incident";
type Visibility = "everyone" | "family" | "private";

interface TimelineComment {
  id: string;
  authorName: string;
  authorInitials: string;
  authorColor: string;
  text: string;
  timestamp: Date;
}

interface TimelineEvent {
  id: string;
  type: EventType;
  summary: string;
  details?: string;
  authorName: string;
  authorInitials: string;
  authorColor: string;
  timestamp: Date;
  photoUrl?: string;
  visibility: Visibility;
  isUrgent?: boolean;
  comments: TimelineComment[];
  reactions: { userId: string; type: "heart" }[];
}

// Event type config
const eventTypeConfig: Record<EventType, { icon: typeof Pill; color: string; label: string }> = {
  med: { icon: Pill, color: "bg-primary/10 text-primary", label: "Medication" },
  vital: { icon: HeartPulse, color: "bg-info/10 text-info", label: "Vital" },
  note: { icon: FileText, color: "bg-muted text-muted-foreground", label: "Note" },
  appointment: { icon: CalendarIcon, color: "bg-accent/10 text-accent", label: "Appointment" },
  incident: { icon: AlertTriangle, color: "bg-destructive/10 text-destructive", label: "Incident" },
};

// Filter chips
const filterChips = [
  { id: "all", label: "All" },
  { id: "med", label: "Meds" },
  { id: "vital", label: "Vitals" },
  { id: "note", label: "Notes" },
  { id: "appointment", label: "Appointments" },
  { id: "incident", label: "Incidents" },
] as const;

// Visibility options
const visibilityOptions: { value: Visibility; label: string; icon: typeof Globe; description: string }[] = [
  { value: "everyone", label: "Everyone", icon: Globe, description: "Visible to all circle members" },
  { value: "family", label: "Family only", icon: Users, description: "Only family members can see" },
  { value: "private", label: "Private", icon: Lock, description: "Only you and coordinators" },
];

// Demo data
const demoEvents: TimelineEvent[] = [
  {
    id: "1",
    type: "med",
    summary: "Grace gave Lisinopril 10mg",
    details: "Morning dose administered with breakfast. Antonio was in good spirits.",
    authorName: "Grace Martinez",
    authorInitials: "GM",
    authorColor: "bg-primary/10 text-primary",
    timestamp: new Date(Date.now() - 1000 * 60 * 30),
    visibility: "everyone",
    comments: [
      {
        id: "c1",
        authorName: "Maria Rodriguez",
        authorInitials: "MR",
        authorColor: "bg-accent/10 text-accent",
        text: "Thanks Grace! Did he take it with food?",
        timestamp: new Date(Date.now() - 1000 * 60 * 25),
      },
      {
        id: "c2",
        authorName: "Grace Martinez",
        authorInitials: "GM",
        authorColor: "bg-primary/10 text-primary",
        text: "Yes, he had toast and juice first.",
        timestamp: new Date(Date.now() - 1000 * 60 * 20),
      },
    ],
    reactions: [{ userId: "maria", type: "heart" }],
  },
  {
    id: "2",
    type: "vital",
    summary: "Blood pressure: 128/82 mmHg",
    details: "Measured after 5 minutes rest. Slightly elevated from yesterday but within normal range.",
    authorName: "Grace Martinez",
    authorInitials: "GM",
    authorColor: "bg-primary/10 text-primary",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2),
    visibility: "everyone",
    comments: [],
    reactions: [],
  },
  {
    id: "3",
    type: "note",
    summary: "Maria added a note",
    details: "Dad mentioned he slept well last night - first time in a week! The new pillow arrangement seems to be helping. He also enjoyed the video call with the grandkids this morning.",
    authorName: "Maria Rodriguez",
    authorInitials: "MR",
    authorColor: "bg-accent/10 text-accent",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 4),
    photoUrl: "https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=400&h=300&fit=crop",
    visibility: "family",
    comments: [
      {
        id: "c3",
        authorName: "Carlos Rodriguez",
        authorInitials: "CR",
        authorColor: "bg-success/10 text-success",
        text: "That's wonderful news! The kids loved seeing abuelo too.",
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 3),
      },
    ],
    reactions: [{ userId: "carlos", type: "heart" }, { userId: "grace", type: "heart" }],
  },
  {
    id: "4",
    type: "incident",
    summary: "Minor fall reported - no injury",
    details: "Antonio stumbled getting out of bed this morning. Grace was present and helped steady him. No visible injuries. He was wearing his non-slip socks. Will monitor throughout the day.",
    authorName: "Grace Martinez",
    authorInitials: "GM",
    authorColor: "bg-primary/10 text-primary",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 6),
    visibility: "everyone",
    isUrgent: true,
    comments: [
      {
        id: "c4",
        authorName: "Maria Rodriguez",
        authorInitials: "MR",
        authorColor: "bg-accent/10 text-accent",
        text: "Thank you for the quick report Grace. Should we consider getting a bed rail?",
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 5),
      },
    ],
    reactions: [],
  },
  {
    id: "5",
    type: "med",
    summary: "Grace gave Metformin 500mg",
    authorName: "Grace Martinez",
    authorInitials: "GM",
    authorColor: "bg-primary/10 text-primary",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 - 1000 * 60 * 30),
    visibility: "everyone",
    comments: [],
    reactions: [{ userId: "maria", type: "heart" }],
  },
  {
    id: "6",
    type: "appointment",
    summary: "Cardiologist visit completed",
    details: "Dr. Chen reviewed recent lab work. Heart function stable. Continue current medication regimen. Next appointment in 3 months.",
    authorName: "Maria Rodriguez",
    authorInitials: "MR",
    authorColor: "bg-accent/10 text-accent",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 - 1000 * 60 * 60 * 4),
    visibility: "everyone",
    comments: [],
    reactions: [{ userId: "grace", type: "heart" }, { userId: "carlos", type: "heart" }],
  },
  {
    id: "7",
    type: "note",
    summary: "Coordinator note (private)",
    details: "Need to discuss care schedule changes with the family. Grace requested time off next month.",
    authorName: "Maria Rodriguez",
    authorInitials: "MR",
    authorColor: "bg-accent/10 text-accent",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 - 1000 * 60 * 60 * 8),
    visibility: "private",
    comments: [],
    reactions: [],
  },
  {
    id: "8",
    type: "vital",
    summary: "Weight: 72.5 kg",
    details: "Morning weight measurement. Down 0.5kg from last week.",
    authorName: "Grace Martinez",
    authorInitials: "GM",
    authorColor: "bg-primary/10 text-primary",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 48 - 1000 * 60 * 60 * 2),
    visibility: "everyone",
    comments: [],
    reactions: [],
  },
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function formatDayLabel(date: Date): string {
  if (isToday(date)) return "Today";
  if (isYesterday(date)) return "Yesterday";
  return format(date, "EEE, MMM d");
}

function formatTime(date: Date): string {
  return format(date, "h:mm a");
}

function groupEventsByDay(events: TimelineEvent[]): Map<string, TimelineEvent[]> {
  const grouped = new Map<string, TimelineEvent[]>();
  
  events.forEach(event => {
    const dayKey = startOfDay(event.timestamp).toISOString();
    if (!grouped.has(dayKey)) {
      grouped.set(dayKey, []);
    }
    grouped.get(dayKey)!.push(event);
  });
  
  return grouped;
}

function canSeePrivate(role: UserRole): boolean {
  return role === "coordinator" || role === "family";
}

function canPostPrivate(role: UserRole): boolean {
  return role === "coordinator" || role === "family";
}

// ============================================================================
// COMPONENTS
// ============================================================================

// Filter Bar
function FilterBar({
  activeFilter,
  onFilterChange,
  searchQuery,
  onSearchChange,
  selectedDate,
  onDateSelect,
  showMobileFilters,
  onToggleMobileFilters,
}: {
  activeFilter: string;
  onFilterChange: (filter: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedDate: Date | undefined;
  onDateSelect: (date: Date | undefined) => void;
  showMobileFilters: boolean;
  onToggleMobileFilters: () => void;
}) {
  return (
    <div className="sticky top-0 z-20 -mx-4 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 px-4 py-3 border-b sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
      <div className="flex flex-wrap items-center gap-2">
        {/* Filter chips - desktop */}
        <div className="hidden sm:flex flex-wrap gap-1.5">
          {filterChips.map(chip => (
            <button
              key={chip.id}
              onClick={() => onFilterChange(chip.id)}
              className={cn(
                "px-3 py-1.5 text-sm font-medium rounded-full transition-colors",
                activeFilter === chip.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted hover:bg-muted/80 text-muted-foreground"
              )}
            >
              {chip.label}
            </button>
          ))}
        </div>

        {/* Mobile filter button */}
        <Button
          variant="outline"
          size="sm"
          className="sm:hidden"
          onClick={onToggleMobileFilters}
        >
          <Filter className="h-4 w-4 mr-1.5" />
          {filterChips.find(c => c.id === activeFilter)?.label}
          <ChevronDown className="h-4 w-4 ml-1" />
        </Button>

        {/* Jump to date */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1.5">
              <CalendarIcon className="h-4 w-4" />
              <span className="hidden sm:inline">
                {selectedDate ? format(selectedDate, "MMM d") : "Jump to date"}
              </span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={onDateSelect}
              autoFocus
            />
            {selectedDate && (
              <div className="p-2 border-t">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full"
                  onClick={() => onDateSelect(undefined)}
                >
                  Clear
                </Button>
              </div>
            )}
          </PopoverContent>
        </Popover>

        {/* Search */}
        <div className="relative flex-1 min-w-[140px] max-w-xs ml-auto">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search..."
            value={searchQuery}
            onChange={e => onSearchChange(e.target.value)}
            className="pl-8 h-9"
          />
        </div>
      </div>

      {/* Mobile filter chips dropdown */}
      {showMobileFilters && (
        <div className="flex flex-wrap gap-1.5 mt-2 sm:hidden">
          {filterChips.map(chip => (
            <button
              key={chip.id}
              onClick={() => {
                onFilterChange(chip.id);
                onToggleMobileFilters();
              }}
              className={cn(
                "px-3 py-1.5 text-sm font-medium rounded-full transition-colors",
                activeFilter === chip.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted hover:bg-muted/80 text-muted-foreground"
              )}
            >
              {chip.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// Composer
function Composer({
  role,
  onPost,
}: {
  role: UserRole;
  onPost: (text: string, visibility: Visibility) => void;
}) {
  const [text, setText] = React.useState("");
  const [visibility, setVisibility] = React.useState<Visibility>("everyone");
  const [isExpanded, setIsExpanded] = React.useState(false);
  const [isPosting, setIsPosting] = React.useState(false);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  const canUsePrivate = canPostPrivate(role);
  
  // Filter out private option for restricted roles
  const availableVisibilityOptions = visibilityOptions.filter(
    opt => opt.value !== "private" || canUsePrivate
  );

  const handlePost = async () => {
    if (!text.trim()) return;
    
    setIsPosting(true);
    await new Promise(resolve => setTimeout(resolve, 500));
    onPost(text, visibility);
    setText("");
    setIsExpanded(false);
    setIsPosting(false);
  };

  return (
    <Card className="mb-6">
      {/* sm:p-4 needed: CardContent's base class sets sm:pt-0 (assumes a CardHeader). */}
      <CardContent className="p-4 sm:p-4">
        <div className="flex gap-3">
          <Avatar className="h-10 w-10 shrink-0">
            <AvatarFallback className="bg-accent/10 text-accent text-sm font-semibold">
              MR
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <textarea
              ref={textareaRef}
              placeholder="Share an update about Antonio..."
              value={text}
              onChange={e => setText(e.target.value)}
              onFocus={() => setIsExpanded(true)}
              className={cn(
                "w-full resize-none bg-transparent placeholder:text-muted-foreground focus:outline-none text-sm",
                isExpanded ? "min-h-[80px]" : "min-h-[40px]"
              )}
            />
            
            {isExpanded && (
              <div className="flex flex-wrap items-center justify-between gap-2 mt-3 pt-3 border-t">
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="sm" className="h-8 px-2">
                    <Camera className="h-4 w-4" />
                    <span className="sr-only">Attach photo</span>
                  </Button>
                  <Button variant="ghost" size="sm" className="h-8 px-2">
                    <Activity className="h-4 w-4" />
                    <span className="sr-only">Add vital</span>
                  </Button>
                  
                  {/* Visibility selector */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 gap-1.5">
                        {React.createElement(
                          availableVisibilityOptions.find(o => o.value === visibility)?.icon || Globe,
                          { className: "h-4 w-4" }
                        )}
                        <span className="hidden sm:inline text-xs">
                          {availableVisibilityOptions.find(o => o.value === visibility)?.label}
                        </span>
                        <ChevronDown className="h-3 w-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start">
                      {availableVisibilityOptions.map(opt => (
                        <DropdownMenuItem
                          key={opt.value}
                          onClick={() => setVisibility(opt.value)}
                          className="flex items-start gap-2"
                        >
                          <opt.icon className="h-4 w-4 mt-0.5 shrink-0" />
                          <div className="min-w-0">
                            <div className="font-medium">{opt.label}</div>
                            <div className="text-xs text-muted-foreground">{opt.description}</div>
                          </div>
                          {visibility === opt.value && (
                            <Check className="h-4 w-4 ml-auto shrink-0 text-primary" />
                          )}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setText("");
                      setIsExpanded(false);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={handlePost}
                    disabled={!text.trim() || isPosting}
                  >
                    {isPosting ? "Posting..." : "Post"}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Event Card
function EventCard({
  event,
  role,
  onReact,
  onComment,
}: {
  event: TimelineEvent;
  role: UserRole;
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
  const hasReacted = event.reactions.some(r => r.userId === "maria");
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
                    <span className={cn(
                      "inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium",
                      config.color
                    )}>
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
                      <Badge variant="destructive" className="text-xs">Urgent</Badge>
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
                    onClick={e => {
                      e.stopPropagation();
                      setShowLightbox(true);
                    }}
                    onKeyDown={e => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        e.stopPropagation();
                        setShowLightbox(true);
                      }
                    }}
                    className="shrink-0 w-14 h-14 rounded-lg overflow-hidden bg-muted cursor-pointer hover:opacity-90 transition-opacity"
                  >
                    <img
                      src={event.photoUrl}
                      alt="Event attachment"
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
              </div>

              {/* Details (clamped) */}
              {event.details && !isExpanded && (
                <p
                  ref={textRef}
                  className="text-sm text-muted-foreground mt-2 line-clamp-2"
                >
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
            onClick={e => {
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
              <p className="text-sm text-muted-foreground mt-3 whitespace-pre-wrap">
                {event.details}
              </p>
            )}

            {/* Full-size photo */}
            {event.photoUrl && (
              <div
                role="button"
                tabIndex={0}
                onClick={() => setShowLightbox(true)}
                onKeyDown={e => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setShowLightbox(true);
                  }
                }}
                className="mt-3 rounded-lg overflow-hidden bg-muted cursor-pointer max-w-md"
              >
                <img
                  src={event.photoUrl}
                  alt="Event attachment"
                  className="w-full h-auto max-h-64 object-cover"
                />
              </div>
            )}

            {/* Comments */}
            {event.comments.length > 0 && (
              <div className="mt-4 space-y-3">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Comments
                </h4>
                <div className="space-y-3 pl-2 border-l-2 border-muted">
                  {event.comments.map(comment => (
                    <div key={comment.id} className="flex gap-2">
                      <Avatar className="h-6 w-6 shrink-0">
                        <AvatarFallback className={cn("text-[10px] font-semibold", comment.authorColor)}>
                          {comment.authorInitials}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-2 flex-wrap">
                          <span className="text-sm font-medium">{comment.authorName}</span>
                          <span className="text-xs text-muted-foreground">
                            {formatTime(comment.timestamp)}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground mt-0.5 break-words">
                          {comment.text}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Reply box */}
            <div className="mt-4 flex gap-2">
              <Avatar className="h-7 w-7 shrink-0">
                <AvatarFallback className="bg-accent/10 text-accent text-[10px] font-semibold">
                  MR
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 flex gap-2">
                <Input
                  placeholder="Add a comment..."
                  value={commentText}
                  onChange={e => setCommentText(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSubmitComment();
                    }
                  }}
                  className="h-8 text-sm"
                />
                <Button
                  size="sm"
                  className="h-8 px-3"
                  onClick={handleSubmitComment}
                  disabled={!commentText.trim()}
                >
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
            <img
              src={event.photoUrl}
              alt="Full size attachment"
              className="w-full h-auto max-h-[80vh] object-contain"
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

// Skeleton loader
function EventSkeleton() {
  return (
    <div className="rounded-xl border bg-card p-4 animate-pulse">
      <div className="flex gap-3">
        <div className="h-9 w-9 rounded-full bg-muted" />
        <div className="flex-1 space-y-2">
          <div className="flex gap-2">
            <div className="h-5 w-16 rounded bg-muted" />
            <div className="h-5 w-20 rounded bg-muted" />
          </div>
          <div className="h-4 w-3/4 rounded bg-muted" />
          <div className="h-3 w-1/2 rounded bg-muted" />
        </div>
      </div>
    </div>
  );
}

// Empty state
function EmptyState({ hasFilters }: { hasFilters: boolean }) {
  return (
    <div className="text-center py-12">
      <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-muted mb-4">
        <FileText className="h-6 w-6 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold">No updates yet</h3>
      <p className="text-muted-foreground mt-1 max-w-sm mx-auto">
        {hasFilters
          ? "No events match your current filters. Try adjusting your search or filter criteria."
          : "Be the first to share an update about Antonio's care."}
      </p>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

function TimelineContent() {
  const { role } = useAppShell();
  
  const [events, setEvents] = React.useState<TimelineEvent[]>(demoEvents);
  const [activeFilter, setActiveFilter] = React.useState("all");
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedDate, setSelectedDate] = React.useState<Date | undefined>();
  const [showMobileFilters, setShowMobileFilters] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [highlightedEventId, setHighlightedEventId] = React.useState<string | null>(null);

  // Filter events based on role visibility
  const canViewPrivate = canSeePrivate(role);
  
  const filteredEvents = React.useMemo(() => {
    return events.filter(event => {
      // Role-based visibility filtering
      if (event.visibility === "private" && !canViewPrivate) {
        return false;
      }
      
      // Type filter
      if (activeFilter !== "all" && event.type !== activeFilter) {
        return false;
      }
      
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSummary = event.summary.toLowerCase().includes(query);
        const matchesDetails = event.details?.toLowerCase().includes(query);
        const matchesAuthor = event.authorName.toLowerCase().includes(query);
        if (!matchesSummary && !matchesDetails && !matchesAuthor) {
          return false;
        }
      }
      
      // Date filter
      if (selectedDate && !isSameDay(event.timestamp, selectedDate)) {
        return false;
      }
      
      return true;
    });
  }, [events, activeFilter, searchQuery, selectedDate, canViewPrivate]);

  const groupedEvents = groupEventsByDay(filteredEvents);
  const sortedDays = Array.from(groupedEvents.keys()).sort((a, b) => 
    new Date(b).getTime() - new Date(a).getTime()
  );

  const handlePost = (text: string, visibility: Visibility) => {
    const newEvent: TimelineEvent = {
      id: `new-${Date.now()}`,
      type: "note",
      summary: "Maria added a note",
      details: text,
      authorName: "Maria Rodriguez",
      authorInitials: "MR",
      authorColor: "bg-accent/10 text-accent",
      timestamp: new Date(),
      visibility,
      comments: [],
      reactions: [],
    };
    
    setEvents(prev => [newEvent, ...prev]);
    setHighlightedEventId(newEvent.id);
    
    // Clear highlight after animation
    setTimeout(() => setHighlightedEventId(null), 2000);
  };

  const handleReact = (eventId: string) => {
    setEvents(prev => prev.map(event => {
      if (event.id !== eventId) return event;
      
      const hasReacted = event.reactions.some(r => r.userId === "maria");
      if (hasReacted) {
        return {
          ...event,
          reactions: event.reactions.filter(r => r.userId !== "maria"),
        };
      } else {
        return {
          ...event,
          reactions: [...event.reactions, { userId: "maria", type: "heart" }],
        };
      }
    }));
  };

  const handleComment = (eventId: string, text: string) => {
    const newComment: TimelineComment = {
      id: `comment-${Date.now()}`,
      authorName: "Maria Rodriguez",
      authorInitials: "MR",
      authorColor: "bg-accent/10 text-accent",
      text,
      timestamp: new Date(),
    };
    
    setEvents(prev => prev.map(event => {
      if (event.id !== eventId) return event;
      return {
        ...event,
        comments: [...event.comments, newComment],
      };
    }));
  };

  const handleLoadMore = async () => {
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    // In a real app, fetch more events here
    setIsLoading(false);
  };

  const hasActiveFilters = activeFilter !== "all" || !!searchQuery || !!selectedDate;

  return (
    <div className="max-w-2xl mx-auto">
      {/* Filter Bar */}
      <FilterBar
        activeFilter={activeFilter}
        onFilterChange={setActiveFilter}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedDate={selectedDate}
        onDateSelect={setSelectedDate}
        showMobileFilters={showMobileFilters}
        onToggleMobileFilters={() => setShowMobileFilters(!showMobileFilters)}
      />

      <div className="py-6">
        {/* Composer */}
        <Composer role={role} onPost={handlePost} />

        {/* Event Feed */}
        {filteredEvents.length === 0 ? (
          <EmptyState hasFilters={hasActiveFilters} />
        ) : (
          <div className="space-y-6">
            {sortedDays.map(dayKey => {
              const dayDate = new Date(dayKey);
              const dayEvents = groupedEvents.get(dayKey)!;
              
              return (
                <div key={dayKey}>
                  {/* Day divider */}
                  <div className="sticky top-14 z-10 -mx-4 px-4 py-2 bg-background/95 backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
                    <h3 className="text-sm font-semibold text-muted-foreground">
                      {formatDayLabel(dayDate)}
                    </h3>
                  </div>
                  
                  {/* Day's events */}
                  <div className="space-y-3 mt-3">
                    {dayEvents.map((event, idx) => (
                      <div
                        key={event.id}
                        className={cn(
                          "motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2",
                          highlightedEventId === event.id && "ring-2 ring-primary ring-offset-2 ring-offset-background rounded-xl"
                        )}
                        style={{ animationDelay: `${idx * 50}ms` }}
                      >
                        <EventCard
                          event={event}
                          role={role}
                          onReact={handleReact}
                          onComment={handleComment}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}

            {/* Load more */}
            <div className="text-center pt-4">
              <Button
                variant="outline"
                onClick={handleLoadMore}
                disabled={isLoading}
              >
                {isLoading ? "Loading..." : "Load earlier updates"}
              </Button>
            </div>
          </div>
        )}

        {/* Loading skeletons */}
        {isLoading && (
          <div className="space-y-3 mt-6">
            <EventSkeleton />
            <EventSkeleton />
            <EventSkeleton />
          </div>
        )}
      </div>
    </div>
  );
}

export default function TimelinePage() {
  return (
    <AppShell>
      <TimelineContent />
    </AppShell>
  );
}
