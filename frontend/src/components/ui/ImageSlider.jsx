import { useEffect, useState } from 'react';

/**
 * Auto-playing image slider (fade, ~4.8 s per slide, loops). Pauses only while a dot has keyboard focus; dots allow optional manual selection.
 * slides: [{ src, alt, eyebrow, title, text }]
 */
export default function ImageSlider({ slides, interval = 4800 }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused || slides.length < 2) return undefined;
    const t = setTimeout(() => setIndex((i) => (i + 1) % slides.length), interval);
    return () => clearTimeout(t);
  }, [index, paused, slides.length, interval]);

  return (
    <section className="slider" aria-roledescription="carousel" aria-label="About MedSync" onFocus={() => setPaused(true)} onBlur={() => setPaused(false)}>
      {slides.map((s, i) => (
        <figure key={s.src} className={`slider__slide ${i === index ? 'is-active' : ''}`} aria-hidden={i !== index} aria-roledescription="slide" aria-label={`${i + 1} of ${slides.length}`}>
          <img src={s.src} alt={s.alt} loading={i === 0 ? 'eager' : 'lazy'} />
          <figcaption className="slider__caption">
            {s.eyebrow && <span className="slider__eyebrow">{s.eyebrow}</span>}
            <h2>{s.title}</h2>
            <p>{s.text}</p>
          </figcaption>
        </figure>
      ))}
      <div className="slider__dots" role="tablist" aria-label="Choose slide">
        {slides.map((s, i) => (
          <button key={s.src} role="tab" aria-selected={i === index} aria-label={`Show slide ${i + 1}: ${s.title}`} className={`slider__dot ${i === index ? 'is-active' : ''}`} onClick={() => setIndex(i)} />
        ))}
      </div>
    </section>
  );
}
