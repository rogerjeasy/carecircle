"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Camera, Activity, ChevronDown, Globe, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { UserRole } from "@/components/app-shell/app-shell-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { visibilityOptions } from "./data";
import { canPostPrivate } from "./utils";
import type { Visibility } from "./types";

export function Composer({
  role,
  recipientName,
  authorInitials,
  authorColor,
  onPost,
}: {
  role: UserRole;
  /** The care recipient's real first name (null = no profile yet). */
  recipientName: string | null;
  authorInitials: string;
  authorColor: string;
  onPost: (text: string, visibility: Visibility) => void;
}) {
  const t = useTranslations("timeline");
  const [text, setText] = React.useState("");
  const [visibility, setVisibility] = React.useState<Visibility>("everyone");
  const [isExpanded, setIsExpanded] = React.useState(false);
  const [isPosting, setIsPosting] = React.useState(false);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  const canUsePrivate = canPostPrivate(role);

  // Filter out private option for restricted roles
  const availableVisibilityOptions = visibilityOptions.filter(
    (opt) => opt.value !== "private" || canUsePrivate
  );

  const handlePost = async () => {
    if (!text.trim()) return;

    setIsPosting(true);
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
            <AvatarFallback className={cn("text-sm font-semibold", authorColor)}>{authorInitials}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <textarea
              ref={textareaRef}
              placeholder={recipientName ? t("composer.placeholderNamed", { name: recipientName }) : t("composer.placeholder")}
              value={text}
              onChange={(e) => setText(e.target.value)}
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
                    <span className="sr-only">{t("composer.attachPhoto")}</span>
                  </Button>
                  <Button variant="ghost" size="sm" className="h-8 px-2">
                    <Activity className="h-4 w-4" />
                    <span className="sr-only">{t("composer.addVital")}</span>
                  </Button>

                  {/* Visibility selector */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 gap-1.5">
                        {React.createElement(
                          availableVisibilityOptions.find((o) => o.value === visibility)?.icon || Globe,
                          { className: "h-4 w-4" }
                        )}
                        <span className="hidden sm:inline text-xs">
                          {t(`visibility.${visibility}.label` as "visibility.everyone.label")}
                        </span>
                        <ChevronDown className="h-3 w-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start">
                      {availableVisibilityOptions.map((opt) => (
                        <DropdownMenuItem
                          key={opt.value}
                          onClick={() => setVisibility(opt.value)}
                          className="flex items-start gap-2"
                        >
                          <opt.icon className="h-4 w-4 mt-0.5 shrink-0" />
                          <div className="min-w-0">
                            <div className="font-medium">{t(`visibility.${opt.value}.label` as "visibility.everyone.label")}</div>
                            <div className="text-xs text-muted-foreground">{t(`visibility.${opt.value}.description` as "visibility.everyone.description")}</div>
                          </div>
                          {visibility === opt.value && <Check className="h-4 w-4 ml-auto shrink-0 text-primary" />}
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
                    {t("composer.cancel")}
                  </Button>
                  <Button size="sm" onClick={handlePost} disabled={!text.trim() || isPosting}>
                    {isPosting ? t("composer.posting") : t("composer.post")}
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
