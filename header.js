const navbar = $(".navbar");

window.onscroll = handleScroll;

function handleScroll(e) {
  if (window.scrollY !== 0) {
    navbar.classList.add("shadowBottom");
  } else {
    navbar.classList.remove("shadowBottom");
  }
}
