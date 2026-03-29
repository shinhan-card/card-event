"use strict";

document.addEventListener("DOMContentLoaded", () => {
  /* ── Guard: GSAP ── */
  if (typeof gsap === "undefined" || typeof ScrollTrigger === "undefined") {
    document.body.classList.add("no-gsap");
    return;
  }
  gsap.registerPlugin(ScrollTrigger);

  /* ── Reduced motion ── */
  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)");
  const isDesktop = () => window.innerWidth > 760;

  if (prefersReduced.matches) {
    document.body.classList.add("js-ready", "reduced-motion");
    return;
  }
  document.body.classList.add("js-ready");

  /* ── Utility: split text into <span class="char"> wrappers ── */
  function splitChars(el) {
    const text = el.textContent;
    el.innerHTML = "";
    el.setAttribute("aria-label", text);
    const frag = document.createDocumentFragment();
    for (const ch of text) {
      if (ch === "\n") continue;
      const span = document.createElement("span");
      span.className = "char";
      span.textContent = ch === " " ? "\u00A0" : ch;
      span.setAttribute("aria-hidden", "true");
      frag.appendChild(span);
    }
    el.appendChild(frag);
    return el.querySelectorAll(".char");
  }

  /* ── Hero entrance timeline ── */
  function initHero() {
    const title = document.querySelector(".hero__title");
    const sub = document.querySelector(".hero__sub");
    const actions = document.querySelector(".hero__actions");
    const cue = document.querySelector(".hero__scroll-cue");
    const eyebrow = document.querySelector(".sec--hero .eyebrow");
    if (!title) return;

    const chars = splitChars(title);

    const tl = gsap.timeline({ delay: 0.3 });

    tl.from(eyebrow, {
      opacity: 0, y: 10, duration: 0.5, ease: "power2.out"
    })
    .from(chars, {
      opacity: 0, y: 40, duration: 0.6,
      stagger: 0.025, ease: "power3.out"
    }, "-=0.2")
    .from(sub, {
      opacity: 0, y: 20, duration: 0.6, ease: "power2.out"
    }, "-=0.3")
    .from(actions, {
      opacity: 0, y: 16, scale: 0.97, duration: 0.5, ease: "power2.out"
    }, "-=0.3")
    .from(cue, {
      opacity: 0, duration: 0.6
    }, "-=0.2");

    if (cue) {
      gsap.to(cue, {
        opacity: 0,
        scrollTrigger: {
          trigger: ".sec--hero",
          start: "top top",
          end: "+=200",
          scrub: true
        }
      });
    }
  }

  /* ── Pointer parallax (hero) ── */
  function initPointer() {
    const hero = document.querySelector(".sec--hero");
    const bg = document.querySelector(".spline-bg");
    if (!hero || !bg) return;

    hero.addEventListener("mousemove", (e) => {
      if (!isDesktop()) return;
      const rect = hero.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
      const y = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
      document.documentElement.style.setProperty("--ptr-x", x);
      document.documentElement.style.setProperty("--ptr-y", y);
    });

    hero.addEventListener("mouseleave", () => {
      gsap.to(document.documentElement, {
        "--ptr-x": 0, "--ptr-y": 0, duration: 0.6, ease: "power2.out"
      });
    });
  }

  /* ── Init ── */
  initHero();
  initPointer();
});
