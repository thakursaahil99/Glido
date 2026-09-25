"use client";

/**
 * Animated sign-in shell — glass-glow inputs, box-reveal text, and an orbiting
 * ring of Food/Grocery/Cab item icons around the Glido wordmark. Visual shell
 * only: pages own their own form state, validation and submit handlers and
 * pass them in as props (see (site)/login, admin/login, partner/login).
 */
import {
  memo,
  ReactNode,
  useState,
  ChangeEvent,
  FormEvent,
  useEffect,
  useRef,
  forwardRef,
} from "react";
import {
  motion,
  useAnimation,
  useInView,
  useMotionTemplate,
  useMotionValue,
} from "motion/react";
import { Eye, EyeOff, LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { GlidoLogo } from "@/components/logo";

// ==================== Input ====================

const AnimatedInput = memo(
  forwardRef(function AnimatedInput(
    { className, type, ...props }: React.InputHTMLAttributes<HTMLInputElement>,
    ref: React.ForwardedRef<HTMLInputElement>
  ) {
    const radius = 100;
    const [visible, setVisible] = useState(false);
    const mouseX = useMotionValue(0);
    const mouseY = useMotionValue(0);

    function handleMouseMove({ currentTarget, clientX, clientY }: React.MouseEvent<HTMLDivElement>) {
      const { left, top } = currentTarget.getBoundingClientRect();
      mouseX.set(clientX - left);
      mouseY.set(clientY - top);
    }

    return (
      <motion.div
        style={{
          background: useMotionTemplate`
            radial-gradient(
              ${visible ? radius + "px" : "0px"} circle at ${mouseX}px ${mouseY}px,
              var(--glido-primary),
              transparent 80%
            )
          `,
        }}
        onMouseMove={handleMouseMove}
        onMouseEnter={() => setVisible(true)}
        onMouseLeave={() => setVisible(false)}
        className="group/input rounded-lg p-[2px] transition duration-300"
      >
        <input
          type={type}
          className={cn(
            "input-glido flex h-10 w-full text-sm transition duration-400 group-hover/input:shadow-none",
            "focus-visible:ring-[2px] focus-visible:ring-[var(--glido-primary)] focus-visible:outline-none",
            "disabled:cursor-not-allowed disabled:opacity-50",
            className
          )}
          ref={ref}
          {...props}
        />
      </motion.div>
    );
  })
);
AnimatedInput.displayName = "AnimatedInput";

// ==================== BoxReveal ====================

type BoxRevealProps = {
  children: ReactNode;
  width?: string;
  boxColor?: string;
  duration?: number;
  overflow?: string;
  position?: string;
  className?: string;
};

const BoxReveal = memo(function BoxReveal({
  children,
  width = "fit-content",
  boxColor,
  duration,
  overflow = "hidden",
  position = "relative",
  className,
}: BoxRevealProps) {
  const mainControls = useAnimation();
  const slideControls = useAnimation();
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });

  useEffect(() => {
    if (isInView) {
      slideControls.start("visible");
      mainControls.start("visible");
    } else {
      slideControls.start("hidden");
      mainControls.start("hidden");
    }
  }, [isInView, mainControls, slideControls]);

  return (
    <div
      ref={ref}
      style={{
        position: position as "relative" | "absolute" | "fixed" | "sticky" | "static",
        width,
        overflow,
      }}
      className={className}
    >
      <motion.div
        variants={{ hidden: { opacity: 0, y: 75 }, visible: { opacity: 1, y: 0 } }}
        initial="hidden"
        animate={mainControls}
        transition={{ duration: duration ?? 0.5, delay: 0.25 }}
      >
        {children}
      </motion.div>
      <motion.div
        variants={{ hidden: { left: 0 }, visible: { left: "100%" } }}
        initial="hidden"
        animate={slideControls}
        transition={{ duration: duration ?? 0.5, ease: "easeIn" }}
        style={{
          position: "absolute",
          top: 4,
          bottom: 4,
          left: 0,
          right: 0,
          zIndex: 20,
          background: boxColor ?? "var(--glido-primary)",
          borderRadius: 4,
        }}
      />
    </div>
  );
});

// ==================== Ripple ====================

type RippleProps = {
  mainCircleSize?: number;
  mainCircleOpacity?: number;
  numCircles?: number;
  className?: string;
};

const Ripple = memo(function Ripple({
  mainCircleSize = 210,
  mainCircleOpacity = 0.24,
  numCircles = 8,
  className = "",
}: RippleProps) {
  return (
    <div
      className={cn(
        "absolute inset-0 flex items-center justify-center",
        "[mask-image:linear-gradient(to_bottom,black,transparent)]",
        "dark:[mask-image:linear-gradient(to_bottom,white,transparent)]",
        className
      )}
    >
      {Array.from({ length: numCircles }, (_, i) => {
        const size = mainCircleSize + i * 70;
        const opacity = mainCircleOpacity - i * 0.03;
        return (
          <span
            key={i}
            className="absolute rounded-full border"
            style={{
              width: `${size}px`,
              height: `${size}px`,
              opacity,
              animation: "var(--animate-ripple)",
              animationDelay: `${i * 0.06}s`,
              borderStyle: i === numCircles - 1 ? "dashed" : "solid",
              borderWidth: "1px",
              borderColor: "var(--glido-primary)",
              background: "var(--glido-primary-light)",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
            }}
          />
        );
      })}
    </div>
  );
});

// ==================== OrbitingCircles ====================

type OrbitingCirclesProps = {
  className?: string;
  children: ReactNode;
  reverse?: boolean;
  duration?: number;
  delay?: number;
  radius?: number;
  path?: boolean;
};

const OrbitingCircles = memo(function OrbitingCircles({
  className,
  children,
  reverse = false,
  duration = 20,
  delay = 10,
  radius = 50,
  path = true,
}: OrbitingCirclesProps) {
  return (
    <>
      {path && (
        <svg xmlns="http://www.w3.org/2000/svg" className="pointer-events-none absolute inset-0 size-full">
          <circle className="stroke-[var(--glido-border)]" cx="50%" cy="50%" r={radius} fill="none" strokeWidth={1} />
        </svg>
      )}
      <div
        style={{ "--duration": duration, "--radius": radius, "--delay": -delay } as React.CSSProperties}
        className={cn(
          "absolute flex size-full items-center justify-center rounded-full",
          "[animation:var(--animate-orbit)] [animation-delay:calc(var(--delay)*1000ms)]",
          reverse && "[animation-direction:reverse]",
          className
        )}
      >
        {children}
      </div>
    </>
  );
});

// ==================== Module orbit icons ====================
// One little "chip" per super-app vertical, tinted with that module's own brand color.

type OrbitItem = { icon: LucideIcon; module: "food" | "grocery" | "cab"; size?: number };

function OrbitIconChip({ icon: Icon, module, size = 34 }: OrbitItem) {
  const colorVar = `var(--glido-${module})`;
  const bgVar = `var(--glido-${module}-light)`;
  return (
    <span
      className="flex items-center justify-center rounded-full shadow-sm"
      style={{ width: size, height: size, background: bgVar, color: colorVar }}
    >
      <Icon size={size * 0.55} strokeWidth={2.25} />
    </span>
  );
}

type TechOrbitDisplayProps = { items: OrbitItem[]; text?: string };

const TechOrbitDisplay = memo(function TechOrbitDisplay({ items, text }: TechOrbitDisplayProps) {
  const radii = [70, 130, 190];
  return (
    <div className="relative flex h-full w-full flex-col items-center justify-center overflow-hidden">
      <GlidoLogo className="scale-[2.4] opacity-90" />
      {text && <span className="sr-only">{text}</span>}

      {items.map((item, index) => {
        const ring = index % radii.length;
        const radius = radii[ring];
        const perRing = Math.ceil(items.length / radii.length);
        const indexInRing = Math.floor(index / radii.length);
        return (
          <OrbitingCircles
            key={index}
            path={indexInRing === 0}
            radius={radius}
            duration={18 + ring * 6}
            delay={(index * 20) / Math.max(perRing, 1)}
            reverse={ring % 2 === 1}
            className="border-none bg-transparent"
          >
            <OrbitIconChip icon={item.icon} module={item.module} />
          </OrbitingCircles>
        );
      })}
    </div>
  );
});

// ==================== Label ====================

const Label = memo(function Label({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn(
        "text-sm font-medium leading-none text-[var(--glido-ink)] peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
        className
      )}
      {...props}
    />
  );
});

// ==================== BottomGradient ====================

const BottomGradient = () => (
  <>
    <span className="pointer-events-none absolute inset-x-0 -bottom-px block h-px w-full bg-gradient-to-r from-transparent via-[var(--glido-primary)] to-transparent opacity-0 transition duration-500 group-hover/btn:opacity-100" />
    <span className="pointer-events-none absolute inset-x-10 -bottom-px mx-auto block h-px w-1/2 bg-gradient-to-r from-transparent via-[var(--glido-accent)] to-transparent opacity-0 blur-sm transition duration-500 group-hover/btn:opacity-100" />
  </>
);

// ==================== AnimatedForm ====================

type FieldType = "text" | "email" | "password" | "tel";

export type AnimatedFormField = {
  label: string;
  name: string;
  required?: boolean;
  type: FieldType;
  placeholder?: string;
  value: string;
  minLength?: number;
  autoComplete?: string;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
};

export type AnimatedFormProps = {
  header: string;
  subHeader?: string;
  fields: AnimatedFormField[];
  submitButton: string;
  submitting?: boolean;
  errorMessage?: string | null;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  /** Rendered above the fields — e.g. a Google sign-in button + "or" divider. */
  beforeFields?: ReactNode;
  /** Rendered below the submit button — e.g. "forgot password?" / mode switch links. */
  footer?: ReactNode;
};

export const AnimatedForm = memo(function AnimatedForm({
  header,
  subHeader,
  fields,
  submitButton,
  submitting,
  errorMessage,
  onSubmit,
  beforeFields,
  footer,
}: AnimatedFormProps) {
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});
  const toggleVisibility = (name: string) =>
    setVisiblePasswords((prev) => ({ ...prev, [name]: !prev[name] }));

  return (
    <div className="mx-auto flex w-full max-w-sm flex-col gap-4">
      <BoxReveal boxColor="var(--glido-primary)" duration={0.3}>
        <h2 className="text-3xl font-bold text-[var(--glido-ink)]">{header}</h2>
      </BoxReveal>

      {subHeader && (
        <BoxReveal boxColor="var(--glido-primary)" duration={0.3} className="pb-2">
          <p className="max-w-sm text-sm text-[var(--glido-muted)]">{subHeader}</p>
        </BoxReveal>
      )}

      {beforeFields}

      <form onSubmit={onSubmit}>
        <div className="mb-4 grid grid-cols-1 gap-3">
          {fields.map((field) => (
            <div key={field.name} className="flex flex-col gap-2">
              <BoxReveal boxColor="var(--glido-primary)" duration={0.3}>
                <Label htmlFor={field.name}>
                  {field.label} {field.required && <span className="text-[var(--glido-danger)]">*</span>}
                </Label>
              </BoxReveal>

              <BoxReveal width="100%" boxColor="var(--glido-primary)" duration={0.3} className="flex w-full flex-col">
                <div className="relative">
                  <AnimatedInput
                    type={field.type === "password" ? (visiblePasswords[field.name] ? "text" : "password") : field.type}
                    id={field.name}
                    name={field.name}
                    placeholder={field.placeholder}
                    value={field.value}
                    minLength={field.minLength}
                    autoComplete={field.autoComplete}
                    required={field.required}
                    onChange={field.onChange}
                  />
                  {field.type === "password" && (
                    <button
                      type="button"
                      onClick={() => toggleVisibility(field.name)}
                      className="absolute inset-y-0 right-0 flex items-center pr-3 text-[var(--glido-muted)]"
                      aria-label={visiblePasswords[field.name] ? "Hide password" : "Show password"}
                    >
                      {visiblePasswords[field.name] ? <Eye className="h-5 w-5" /> : <EyeOff className="h-5 w-5" />}
                    </button>
                  )}
                </div>
              </BoxReveal>
            </div>
          ))}
        </div>

        {errorMessage && (
          <BoxReveal width="100%" boxColor="var(--glido-primary)" duration={0.3}>
            <p className="mb-4 text-sm text-[var(--glido-danger)]">{errorMessage}</p>
          </BoxReveal>
        )}

        <BoxReveal width="100%" boxColor="var(--glido-primary)" duration={0.3} overflow="visible">
          <button className="btn-primary group/btn relative block w-full" type="submit" disabled={submitting}>
            {submitting ? "Please wait..." : submitButton} &rarr;
            <BottomGradient />
          </button>
        </BoxReveal>

        {footer && (
          <BoxReveal boxColor="var(--glido-primary)" duration={0.3} width="100%">
            {footer}
          </BoxReveal>
        )}
      </form>
    </div>
  );
});

// ==================== Full-screen shell ====================

export type AnimatedSignInShellProps = {
  /** Left-side headline shown above the orbiting icons (desktop only). */
  brandText?: string;
  orbitItems?: OrbitItem[];
  children: ReactNode;
};

/** Two-column full-viewport shell: left = ripple + orbiting module icons (desktop
 * only), right = the form. Use with <AnimatedForm> as `children`. */
export function AnimatedSignInShell({ orbitItems, children }: AnimatedSignInShellProps) {
  return (
    <div className="flex min-h-screen bg-[var(--glido-bg)] max-lg:justify-center">
      <div className="relative hidden w-1/2 flex-col justify-center lg:flex">
        {orbitItems && orbitItems.length > 0 && (
          <>
            <Ripple />
            <TechOrbitDisplay items={orbitItems} />
          </>
        )}
      </div>

      <div className="flex h-screen w-full flex-col items-center justify-center px-[8%] lg:w-1/2 lg:px-0">
        {children}
      </div>
    </div>
  );
}

export { BoxReveal, Ripple, OrbitingCircles, TechOrbitDisplay, Label, BottomGradient, AnimatedInput };
