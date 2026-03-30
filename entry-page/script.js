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

    const tagline = document.querySelector(".hero__tagline");
    const isGradient = title.classList.contains("hero__title--gradient");

    const tl = gsap.timeline({ delay: 0.3 });

    tl.from(eyebrow, {
      opacity: 0, y: 10, duration: 0.5, ease: "power2.out"
    });

    if (isGradient) {
      tl.from(title, {
        opacity: 0, y: 40, scale: 0.95, duration: 0.8, ease: "power3.out"
      }, "-=0.2");
    } else {
      var chars = splitChars(title);
      tl.from(chars, {
        opacity: 0, y: 40, duration: 0.6,
        stagger: 0.025, ease: "power3.out"
      }, "-=0.2");
    }

    tl.from(tagline, {
      opacity: 0, y: 16, duration: 0.5, ease: "power2.out"
    }, "-=0.3")
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

  /* ── Signal section ── */
  function initSignal() {
    const wrap = document.querySelector(".signal__wrap");
    const old = document.querySelector(".signal__old");
    const newH = document.querySelector(".signal__new");
    const sub = document.querySelector(".signal__sub");
    if (!wrap || !old || !newH) return;

    const chars = splitChars(newH);
    newH.style.opacity = "1";
    old.style.setProperty("--strike-w", "0%");

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: ".sec--signal",
        start: "top top",
        end: "+=300%",
        pin: ".signal__wrap",
        scrub: 0.8,
      }
    });

    tl.from(old, { opacity: 0, y: 20, duration: 0.15, ease: "none" })
      .fromTo(old, { "--strike-w": "0%" }, { "--strike-w": "100%", duration: 0.2, ease: "none" })
      .to(old, { opacity: 0, filter: "blur(4px)", duration: 0.1, ease: "none" })
      .from(chars, {
        opacity: 0, y: 30, duration: 0.25,
        stagger: 0.015, ease: "none"
      })
      .from(sub, { opacity: 0, y: 16, duration: 0.15, ease: "none" }, "-=0.05")
      /* Hold — let the user read the full message */
      .to({}, { duration: 0.3 });
  }

  /* ── Countup utility ── */
  function animateCountup(el) {
    if (el.dataset.counted) return;
    el.dataset.counted = "true";
    const target = parseInt(el.dataset.countup, 10);
    if (isNaN(target)) return;
    gsap.fromTo(el, { innerText: 0 }, {
      innerText: target,
      duration: 1.2,
      ease: "power3.out",
      snap: { innerText: 1 },
      onUpdate() {
        el.textContent = Math.round(parseFloat(el.textContent)).toLocaleString("ko-KR");
      }
    });
  }

  /* ── Intelligence section ── */
  function initIntel() {
    const cards = gsap.utils.toArray(".intel__card");
    if (!cards.length) return;

    gsap.from(cards, {
      opacity: 0, y: 50,
      duration: 0.7,
      stagger: 0.15,
      ease: "power3.out",
      scrollTrigger: {
        trigger: ".intel__grid",
        start: "top 80%",
      }
    });

    document.querySelectorAll(".intel__card [data-countup]").forEach(el => {
      ScrollTrigger.create({
        trigger: el,
        start: "top 85%",
        once: true,
        onEnter: () => animateCountup(el),
      });
    });

    cards.forEach(card => {
      card.addEventListener("mousemove", (e) => {
        if (!isDesktop()) return;
        const rect = card.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width - 0.5) * 10;
        const y = ((e.clientY - rect.top) / rect.height - 0.5) * -10;
        gsap.to(card, {
          rotateX: y, rotateY: x,
          duration: 0.3, ease: "power2.out",
          transformPerspective: 800,
        });
      });
      card.addEventListener("mouseleave", () => {
        gsap.to(card, {
          rotateX: 0, rotateY: 0,
          duration: 0.5, ease: "power2.out",
        });
      });
    });
  }

  /* ── Metrics section ── */
  function initMetrics() {
    const wrap = document.querySelector(".metrics__wrap");
    const big = document.querySelector(".metrics__big");
    const items = gsap.utils.toArray(".metrics__item strong");
    const dividers = gsap.utils.toArray(".metrics__divider");
    if (!wrap || !big) return;

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: ".sec--metrics",
        start: "top top",
        end: "+=120%",
        pin: ".metrics__wrap",
        scrub: 0.6,
      }
    });

    tl.fromTo(big, { innerText: 0 }, {
      innerText: 2400,
      duration: 1,
      ease: "none",
      snap: { innerText: 1 },
      onUpdate() {
        big.textContent = Math.round(parseFloat(big.textContent)).toLocaleString("ko-KR");
      }
    })
    .from(".metrics__big-plus", { opacity: 0, x: -10, duration: 0.2, ease: "none" }, "-=0.2")
    .from(".metrics__big-label", { opacity: 0, y: 10, duration: 0.2, ease: "none" })
    .from(items, { opacity: 0, y: 20, duration: 0.3, stagger: 0.1, ease: "none" })
    .to(dividers, { height: 48, duration: 0.3, stagger: 0.1, ease: "none" }, "<");
  }

  /* ── Process section — horizontal scroll ── */
  function initProcess() {
    const track = document.querySelector(".process__track");
    const fill = document.querySelector(".process__progress-fill");
    const header = document.querySelector(".process__header");
    if (!track || window.innerWidth <= 760) return;

    const totalScroll = track.scrollWidth - window.innerWidth;
    /* 2.5x multiplier for slower, more immersive scroll */
    const scrollDistance = () => totalScroll * 2.5;

    /* Fade in + pin the header text first */
    if (header) {
      gsap.from(header, {
        opacity: 0, y: 30, duration: 0.7, ease: "power3.out",
        scrollTrigger: { trigger: ".sec--process", start: "top 75%" }
      });
    }

    gsap.to(track, {
      x: () => -totalScroll,
      ease: "none",
      scrollTrigger: {
        trigger: ".sec--process",
        start: "top top",
        end: () => "+=" + scrollDistance(),
        pin: true,
        scrub: 1,
        invalidateOnRefresh: true,
        onUpdate: (self) => {
          if (fill) fill.style.width = (self.progress * 100) + "%";
        }
      }
    });

    const cards = gsap.utils.toArray(".process__card");
    ScrollTrigger.create({
      trigger: ".sec--process",
      start: "top top",
      end: () => "+=" + scrollDistance(),
      scrub: true,
      onUpdate: (self) => {
        const p = self.progress;
        cards.forEach((card, i) => {
          const cardP = (i + 0.5) / cards.length;
          const dist = Math.abs(p - cardP);
          const opacity = Math.max(0.3, 1 - dist * 2);
          const scale = 0.92 + 0.08 * Math.max(0, 1 - dist * 2.5);
          card.style.opacity = opacity;
          card.style.transform = "scale(" + scale + ")";
        });
      }
    });
  }

  /* ── Proof section ── */
  function initProof() {
    const before = document.querySelector(".proof__before");
    const after = document.querySelector(".proof__after");
    const items = gsap.utils.toArray(".proof__split li");
    const evidence = document.querySelector(".proof__evidence");
    const bigNum = document.querySelector(".proof__big-num");

    if (!before || !after) return;

    gsap.from(before, {
      opacity: 0, x: -40, duration: 0.7, ease: "power3.out",
      scrollTrigger: { trigger: ".proof__split", start: "top 75%" }
    });
    gsap.from(after, {
      opacity: 0, x: 40, duration: 0.7, ease: "power3.out", delay: 0.2,
      scrollTrigger: { trigger: ".proof__split", start: "top 75%" }
    });

    gsap.from(items, {
      opacity: 0, y: 12, duration: 0.4,
      stagger: 0.06, ease: "power2.out",
      scrollTrigger: { trigger: ".proof__split", start: "top 70%" }
    });

    if (bigNum) {
      ScrollTrigger.create({
        trigger: evidence,
        start: "top 80%",
        once: true,
        onEnter: () => animateCountup(bigNum),
      });
    }
  }

  /* ── Final CTA section ── */
  function initCta() {
    const line1 = document.querySelector(".cta__line1");
    const line2 = document.querySelector(".cta__line2");
    const sub = document.querySelector(".cta__sub");
    const glow = document.querySelector(".cta__glow");
    const btn = document.querySelector(".sec--cta .btn--primary");
    if (!line1) return;

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: ".sec--cta",
        start: "top 70%",
      }
    });

    tl.from(line1, { opacity: 0, y: 30, duration: 0.6, ease: "power3.out" })
      .from(line2, { opacity: 0, y: 30, duration: 0.6, ease: "power3.out" }, "-=0.3")
      .from(sub, { opacity: 0, y: 16, duration: 0.5, ease: "power2.out" }, "-=0.3")
      .from(btn, { opacity: 0, scale: 0.95, duration: 0.5, ease: "power2.out" }, "-=0.2")
      .to(glow, { opacity: 1, scale: 1.1, duration: 1.2, ease: "power2.out" }, "-=0.8");

    if (glow) {
      gsap.to(glow, {
        scale: 1.15,
        opacity: 0.8,
        duration: 3,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
      });
    }
  }

  /* ── Spline lazy loading ── */
  function initSplineLazy() {
    const iframes = document.querySelectorAll(".spline-iframe[data-spline-src]");
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const iframe = entry.target;
        const src = iframe.dataset.splineSrc;
        if (!src) return;
        iframe.src = src;
        iframe.addEventListener("load", () => iframe.classList.add("is-loaded"), { once: true });
        observer.unobserve(iframe);
      });
    }, { rootMargin: "200px" });
    iframes.forEach(iframe => observer.observe(iframe));
  }

  /* ── Responsive: kill pins on mobile ── */
  function handleResize() {
    if (window.innerWidth <= 760) {
      ScrollTrigger.getAll().forEach(st => {
        if (st.pin) st.kill();
      });
    }
  }

  let resizeTimer;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => ScrollTrigger.refresh(), 250);
  });

  /* ── Init ── */
  initHero();
  initPointer();
  initSignal();
  initIntel();
  initMetrics();
  initProcess();
  initProof();
  initCta();
  initSplineLazy();
  handleResize();
});
