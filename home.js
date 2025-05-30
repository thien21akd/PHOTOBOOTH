let targetAnimationElement = $$(".animate__animated");

targetAnimationElement.forEach((element) => {
  observer.observe(element);
});
