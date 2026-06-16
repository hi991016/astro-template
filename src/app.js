import { gsap } from 'gsap';
let tl = null;

document.addEventListener('astro:before-preparation', () => {
  if (tl) tl.kill();

  tl = gsap.timeline();

  tl.to('main', {
    opacity: 0,
    duration: 0.4,
    ease: "power2.inOut"
  });
});

document.addEventListener('astro:after-swap', () => {
  gsap.set('main', { opacity: 0 });

  tl = gsap.timeline();

  tl.to('main', {
    opacity: 1,
    duration: 0.6,
    ease: "power2.out"
  });
});