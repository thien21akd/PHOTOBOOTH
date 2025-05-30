let $ = document.querySelector.bind(document);
let $$ = document.querySelectorAll.bind(document);

const observer = new IntersectionObserver((elements) => {
  elements.forEach((element) => {
    const animateName = element.target.dataset.animate;

    if (element.isIntersecting) {
      element.target.classList.add("animate__animated", animateName);
    } else {
      element.target.classList.remove("animate__animated", animateName);
    }
  });
});
