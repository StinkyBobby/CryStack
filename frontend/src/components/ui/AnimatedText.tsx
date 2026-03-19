interface AnimatedTextProps {
  text: string;
  className?: string;
  delayMs?: number;
}

export function AnimatedText({ text, className = "", delayMs = 0 }: AnimatedTextProps) {
  const words = text.split(" ");

  return (
    <span className={`inline-block ${className}`} aria-label={text}>
      {words.map((word, wordIndex) => (
        <span key={`${word}-${wordIndex}`} className="inline-block whitespace-nowrap">
          {word.split("").map((char, charIndex) => (
            <span
              key={`${char}-${charIndex}`}
              className="char-rise inline-block"
              style={{
                animationDelay: `${delayMs + wordIndex * 90 + charIndex * 22}ms`,
              }}
            >
              {char}
            </span>
          ))}
          {wordIndex < words.length - 1 ? <span className="inline-block">&nbsp;</span> : null}
        </span>
      ))}
    </span>
  );
}
