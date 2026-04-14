import React from "react";

let hasHydrated = false;

export function useIsHydrated() {
  const [isHydrated, setIsHydrated] = React.useState(hasHydrated);
  hasHydrated = true;
  React.useEffect(() => {
    setIsHydrated(true);
  }, []);

  return isHydrated;
}