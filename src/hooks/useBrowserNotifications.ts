import { useEffect, useState, useCallback } from "react";

export function useBrowserNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    const supported = "Notification" in window;
    setIsSupported(supported);
    if (supported) {
      setPermission(Notification.permission);
    }
  }, []);

  const requestPermission = useCallback(async () => {
    if (!isSupported) return false;
    
    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      return result === "granted";
    } catch (error) {
      console.error("Error requesting notification permission:", error);
      return false;
    }
  }, [isSupported]);

  const showNotification = useCallback(
    (title: string, options?: NotificationOptions) => {
      if (!isSupported || permission !== "granted") {
        console.log("Notifications not available or not permitted");
        return null;
      }

      try {
        const notification = new Notification(title, {
          icon: "/app-logo-192.png",
          badge: "/app-logo-192.png",
          ...options,
        });

        notification.onclick = () => {
          window.focus();
          notification.close();
          if (options?.data?.url) {
            window.location.href = options.data.url;
          }
        };

        return notification;
      } catch (error) {
        console.error("Error showing notification:", error);
        return null;
      }
    },
    [isSupported, permission]
  );

  return {
    isSupported,
    permission,
    requestPermission,
    showNotification,
    isGranted: permission === "granted",
    isDenied: permission === "denied",
  };
}
