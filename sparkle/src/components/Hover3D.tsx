import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

// Context to share hover state
const Hover3DContext = createContext<{
  isHovered: boolean;
  setHovered?: (state: boolean) => void;
  isTouchDevice: boolean;
}>({ isHovered: false, isTouchDevice: false });

// Custom hook to use the context
export const useHover3D = () => useContext(Hover3DContext);

// Function to detect touch devices
const isTouchDevice = () => {
  if (typeof window === "undefined") {
    return false;
  }

  return "ontouchstart" in window || navigator.maxTouchPoints > 0;
};

interface Hover3DProps {
  children: React.ReactNode;
  xOffset?: number;
  yOffset?: number;
  attack?: number;
  release?: number;
  perspective?: number;
  className?: string;
  depth?: number;
  range?: number;
  fullscreenSensible?: boolean;
  reference?: "screen" | "object";
}

function Hover3D({
  children,
  xOffset = 10,
  yOffset = 10,
  attack = 0.1,
  release = 0.5,
  perspective = 500,
  depth = -10,
  className = "",
  range = 3,
  fullscreenSensible = false,
  reference = "object",
}: Hover3DProps) {
  const elementRef = useRef<HTMLDivElement>(null);
  const [isHovered, setHovered] = useState(fullscreenSensible);
  const [isTouch, setIsTouch] = useState(false);
  const [transform, setTransform] = useState(
    `perspective(${perspective}px) translateZ(${
      fullscreenSensible ? depth : 0
    }px)`
  );
  const [transition, setTransition] = useState("");
  const clamp = (value: number, min: number, max: number) => {
    return Math.min(Math.max(value, min), max);
  };
  const map = (
    value: number,
    istart: number,
    istop: number,
    ostart: number,
    ostop: number
  ) => {
    return ostart + (ostop - ostart) * ((value - istart) / (istop - istart));
  };

  // Detect touch device on mount
  useEffect(() => {
    setIsTouch(isTouchDevice());
  }, []);

  useEffect(() => {
    // Skip 3D effect setup if on a touch device
    if (isTouch) {
      return;
    }

    const element = elementRef.current;

    const handleMouseEnter = () => {
      setTransition(`transform ${attack}s`);
      setHovered(true);
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (element) {
        const rect =
          reference === "object"
            ? element.getBoundingClientRect()
            : document.body.getBoundingClientRect();
        const dx = e.clientX - rect.left;
        const dy = e.clientY - rect.top;

        const xRot = clamp(
          map(dx, 0, rect.width, -xOffset, xOffset),
          -xOffset,
          xOffset
        );
        const yRot = clamp(
          map(dy, 0, rect.height, yOffset, -yOffset),
          -range * yOffset,
          range * yOffset
        );

        setTransform(
          `perspective(${perspective}px) rotateX(${yRot}deg) rotateY(${xRot}deg) translateZ(${depth}px)`
        );
      }
    };
    if (fullscreenSensible) {
      window.addEventListener("mousemove", handleMouseMove);
    } else {
      const handleMouseLeave = () => {
        setTransition(`transform ${release}s`);
        setTransform(
          `perspective(${perspective}px) rotateX(0deg) rotateY(0deg)`
        );
        setHovered(false);
      };

      element?.addEventListener("mouseenter", handleMouseEnter);
      element?.addEventListener("mousemove", handleMouseMove);
      element?.addEventListener("mouseleave", handleMouseLeave);

      return () => {
        element?.removeEventListener("mouseenter", handleMouseEnter);
        element?.removeEventListener("mousemove", handleMouseMove);
        element?.removeEventListener("mouseleave", handleMouseLeave);
      };
    }
  }, [
    attack,
    release,
    perspective,
    xOffset,
    yOffset,
    isTouch,
    fullscreenSensible,
    reference,
    depth,
    range,
  ]);

  return (
    <Hover3DContext.Provider
      value={{ isHovered, setHovered, isTouchDevice: isTouch }}
    >
      <div
        ref={elementRef}
        style={{
          transform: isTouch ? "none" : transform,
          transition: isTouch ? "none" : transition,
          transformStyle: isTouch ? "flat" : "preserve-3d",
        }}
        className={className}
      >
        {children}
      </div>
    </Hover3DContext.Provider>
  );
}

interface divProps {
  depth: number;
  children: React.ReactNode;
  className?: string;
}

const Div3D = ({ depth, children, className = "" }: divProps) => {
  const { isHovered, isTouchDevice } = useHover3D();
  const style = {
    transform: isTouchDevice
      ? "none"
      : `translateZ(${isHovered ? depth : 0}px)`,
    transition: isTouchDevice ? "none" : "transform 0.5s",
  };

  return (
    <div style={style} className={className}>
      {children}
    </div>
  );
};

export { Div3D, Hover3D };
