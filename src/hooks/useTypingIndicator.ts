import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

interface TypingState {
  [key: string]: {
    isTyping: boolean;
    name: string;
    timestamp: number;
  };
}

export function useTypingIndicator(
  channelName: string,
  userId: string,
  userName: string
) {
  const [typingUsers, setTypingUsers] = useState<TypingState>({});
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTypingRef = useRef<number>(0);

  useEffect(() => {
    const channel = supabase.channel(`typing-${channelName}`, {
      config: {
        presence: {
          key: userId,
        },
      },
    });

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        const newTypingState: TypingState = {};
        
        Object.entries(state).forEach(([key, presences]) => {
          if (key !== userId && Array.isArray(presences) && presences.length > 0) {
            const presence = presences[0] as any;
            if (presence.isTyping && Date.now() - presence.timestamp < 5000) {
              newTypingState[key] = {
                isTyping: true,
                name: presence.name || "Someone",
                timestamp: presence.timestamp,
              };
            }
          }
        });
        
        setTypingUsers(newTypingState);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({
            isTyping: false,
            name: userName,
            timestamp: Date.now(),
          });
        }
      });

    channelRef.current = channel;

    // Clean up stale typing indicators
    const cleanupInterval = setInterval(() => {
      setTypingUsers((prev) => {
        const now = Date.now();
        const updated: TypingState = {};
        Object.entries(prev).forEach(([key, value]) => {
          if (now - value.timestamp < 5000) {
            updated[key] = value;
          }
        });
        return updated;
      });
    }, 2000);

    return () => {
      clearInterval(cleanupInterval);
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [channelName, userId, userName]);

  const setTyping = useCallback(
    async (isTyping: boolean) => {
      if (!channelRef.current) return;

      // Throttle typing updates
      const now = Date.now();
      if (isTyping && now - lastTypingRef.current < 1000) {
        return;
      }
      lastTypingRef.current = now;

      try {
        await channelRef.current.track({
          isTyping,
          name: userName,
          timestamp: now,
        });

        // Auto-clear typing after 3 seconds
        if (isTyping) {
          if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
          }
          typingTimeoutRef.current = setTimeout(() => {
            channelRef.current?.track({
              isTyping: false,
              name: userName,
              timestamp: Date.now(),
            });
          }, 3000);
        }
      } catch (error) {
        console.error("Error updating typing status:", error);
      }
    },
    [userName]
  );

  const isOtherTyping = Object.values(typingUsers).some((u) => u.isTyping);
  const typingUserNames = Object.values(typingUsers)
    .filter((u) => u.isTyping)
    .map((u) => u.name);

  return {
    setTyping,
    isOtherTyping,
    typingUserNames,
  };
}
