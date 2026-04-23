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

function independentDebouncePerFn<T extends Array<any>>(
  fn: (...args: T) => unknown,
  time: number,
) {
  const timeoutId = React.useRef<number>(0);

  const debouncedFn = (...args: T) => {
    if (timeoutId.current) {
      // console.log("timeout cleared: ", timeoutId.current);
      window.clearTimeout(timeoutId.current);
    }
    timeoutId.current = window.setTimeout(() => {
      // console.log("running function");
      // console.log(fn);
      fn(...args);
    }, time);
    // console.log("timeout set: ", timeoutId.current);
  };
  return debouncedFn;
}

//
export function useDebouncedFunction<T extends Array<any>>(
  fn: (...args: T) => unknown,
  time: number,
) {
  return independentDebouncePerFn(fn, time);
}

/* Course defined function below.
The timeoutId was shared by each returned debouncedFn
as it was using the same closed over variable. The fix above creates a unique
timeoutId per useDebouncedFunction, so switching between debounced fields won't
clearout a function call from the first field 

export function useDebouncedFunction<T extends Array<any>>(
  fn: (...args: T) => unknown,
  time: number
) {
  const timeoutId = React.useRef<number>();

  const debouncedFn = (...args: T) => {
    window.clearTimeout(timeoutId.current);
    timeoutId.current = window.setTimeout(() => fn(...args), time);
  };

  return debouncedFn;
}
*/
